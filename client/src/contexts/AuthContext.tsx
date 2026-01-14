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

// Types
export interface User {
    id: string;
    username: string;
    hospital: string;
    role: 'user' | 'admin';
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
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
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
                        // User exists in Auth but not in Firestore (shouldn't happen normally)
                        console.error('User document not found in Firestore');
                        setUser(null);
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

    const login = async (email: string, password: string) => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
                id: userCredential.user.uid,
                username: userData.username,
                hospital: userData.hospital,
                role: userData.role,
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

        // Create user profile in Firestore
        const userProfile = {
            username: userData.username || email.split('@')[0],
            hospital: userData.hospital || '',
            role: 'user' as const,
            email: email,
            display_name: userData.display_name || undefined,
            phone: userData.phone || undefined,
            address: userData.address || undefined,
            gender: userData.gender || undefined,
            line_id: userData.line_id || undefined,
            security_question: userData.security_question || undefined,
            security_answer: userData.security_answer || undefined,
            created_at: serverTimestamp()
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);

        setUser({
            id: userCredential.user.uid,
            username: userProfile.username,
            hospital: userProfile.hospital,
            role: userProfile.role,
            email: userProfile.email,
            display_name: userProfile.display_name,
            phone: userProfile.phone,
            address: userProfile.address,
            gender: userProfile.gender,
            line_id: userProfile.line_id,
            security_question: userProfile.security_question,
            security_answer: userProfile.security_answer,
            created_at: new Date()
        });
    };

    const logout = async () => {
        await firebaseSignOut(auth);
        setUser(null);
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
