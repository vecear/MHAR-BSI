import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { DEFAULT_PROJECT_ID } from '../constants/projects';

// Types
export interface User {
    id: string;
    username: string;
    hospital: string;
    role: 'user' | 'admin';
    allowed_projects?: string[]; // New field for project permissions
    email?: string;
    display_name?: string;
    phone?: string;
    address?: string;
    gender?: string;
    line_id?: string;
    security_question?: string;
    security_answer?: string;
    created_at?: Date;
}

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    currentProject: string; // Track currently selected project
    loading: boolean;
    login: (email: string, password: string, projectId?: string) => Promise<void>;
    register: (email: string, password: string, userData: Partial<User>) => Promise<void>;
    logout: () => Promise<void>;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [currentProject, setCurrentProject] = useState<string>(() => {
        return localStorage.getItem('currentProject') || DEFAULT_PROJECT_ID;
    });
    const [loading, setLoading] = useState(true);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                // Fetch user profile from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser({
                            id: fbUser.uid,
                            username: userData.username,
                            hospital: userData.hospital,
                            role: userData.role,
                            allowed_projects: userData.allowed_projects || [DEFAULT_PROJECT_ID], // Default to base project if undefined
                            email: userData.email,
                            display_name: userData.display_name,
                            phone: userData.phone,
                            address: userData.address,
                            gender: userData.gender,
                            line_id: userData.line_id,
                            security_question: userData.security_question,
                            security_answer: userData.security_answer,
                            created_at: userData.created_at?.toDate()
                        });
                    } else {
                        // User exists in Auth but not in Firestore - create basic profile
                        console.log('Creating user profile in Firestore...');
                        const newUserProfile = {
                            username: fbUser.email?.split('@')[0] || 'user',
                            hospital: '',
                            role: 'user',
                            allowed_projects: [], // Default to no access for cleanup/verification
                            email: fbUser.email || '',
                            created_at: serverTimestamp()
                        };
                        await setDoc(doc(db, 'users', fbUser.uid), newUserProfile);
                        setUser({
                            id: fbUser.uid,
                            username: newUserProfile.username,
                            hospital: newUserProfile.hospital,
                            role: 'user',
                            allowed_projects: [],
                            email: newUserProfile.email,
                            created_at: new Date()
                        });
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (emailOrUsername: string, password: string, projectId: string = DEFAULT_PROJECT_ID) => {
        const identifier = emailOrUsername.trim();
        let loginEmail = identifier;

        // If it DOES NOT look like an email, assume it is a username
        if (!identifier.includes('@')) {
            try {
                // Bridge Strategy: Validate with Server (SQLite) first
                console.log('Attempting server bridge login for:', identifier);
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: identifier, password })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '驗證失敗');
                }

                const userData = await response.json();

                if (!userData.email) {
                    throw new Error('此帳號未綁定 Email，請聯繫管理員');
                }

                loginEmail = userData.email;
                console.log('Bridge login successful. Email resolved:', loginEmail);

            } catch (err) {
                console.error("Server bridge login failed:", err);
                // If api call failed (e.g. wrong password), re-throw to stop
                throw err;
            }
        }

        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);

        // Fetch user profile to check permissions
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const allowedProjects = userData.allowed_projects || [DEFAULT_PROJECT_ID];

            // Check if user has access to the selected project
            // Admin bypass check? Maybe not, keep it strict for now unless requested otherwise.
            // But let's assume Admin also needs explicit permission or we implicitly allow ALL for admin?
            // "針對不同使用者設定登入個別的次專案的權限" implies validation is needed.
            // For now, let's treat admin as normal user for permission checks unless specified.
            // Update: User requested "不同使用者設定", implies granular control, so check the list.

            if (!allowedProjects.includes(projectId)) {
                await firebaseSignOut(auth); // Logout immediately if unauthorized
                throw new Error(`您沒有權限存取專案: ${projectId}`);
            }

            // Set current project
            setCurrentProject(projectId);
            localStorage.setItem('currentProject', projectId);

            setUser({
                id: userCredential.user.uid,
                username: userData.username,
                hospital: userData.hospital,
                role: userData.role,
                allowed_projects: allowedProjects,
                email: userData.email,
                display_name: userData.display_name,
                phone: userData.phone,
                address: userData.address,
                gender: userData.gender,
                line_id: userData.line_id,
                security_question: userData.security_question,
                security_answer: userData.security_answer,
                created_at: userData.created_at?.toDate()
            });
        }
    };

    const register = async (email: string, password: string, userData: Partial<User>) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Create user profile in Firestore - filter out undefined values
        const userProfile: Record<string, unknown> = {
            username: userData.username || email.split('@')[0],
            hospital: userData.hospital || '',
            role: 'user',
            allowed_projects: [], // Default permission for new users (wait for admin/owner approval)
            email: email,
            created_at: serverTimestamp()
        };

        // Only add optional fields if they have values
        if (userData.display_name) userProfile.display_name = userData.display_name;
        if (userData.phone) userProfile.phone = userData.phone;
        if (userData.address) userProfile.address = userData.address;
        if (userData.gender) userProfile.gender = userData.gender;
        if (userData.line_id) userProfile.line_id = userData.line_id;
        if (userData.security_question) userProfile.security_question = userData.security_question;
        if (userData.security_answer) userProfile.security_answer = userData.security_answer;

        await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);

        setUser({
            id: userCredential.user.uid,
            username: userData.username || email.split('@')[0],
            hospital: userData.hospital || '',
            role: 'user',
            allowed_projects: [],
            email: email,
            display_name: userData.display_name,
            phone: userData.phone,
            address: userData.address,
            gender: userData.gender,
            line_id: userData.line_id,
            security_question: userData.security_question,
            security_answer: userData.security_answer,
            created_at: new Date()
        });

        // Set default project for newly registered user
        // Do not set default project for newly registered user - they need approval
        setCurrentProject('');
        localStorage.removeItem('currentProject');
    };

    const logout = async () => {
        await firebaseSignOut(auth);
        setUser(null);
        localStorage.removeItem('currentProject');
    };

    const updateUserProfile = async (data: Partial<User>) => {
        if (!firebaseUser) throw new Error('Not authenticated');

        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userRef, data, { merge: true });

        // Update local state
        setUser(prev => prev ? { ...prev, ...data } : null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            currentProject,
            loading,
            login,
            register,
            logout,
            updateUserProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
