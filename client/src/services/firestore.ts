import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../firebase';

// ==================== Types ====================

export interface Submission {
    id: string;
    user_id: string;
    username?: string;
    hospital?: string;
    medical_record_number: string;
    admission_date: string;
    form_data: Record<string, unknown>;
    data_status: 'complete' | 'incomplete';
    update_count: number;
    has_pending_delete?: number;
    created_at?: Date;
    updated_at?: Date;
}

export interface DeleteRequest {
    id: string;
    submission_id: string;
    requester_id: string;
    requester_username?: string;
    requester_hospital?: string;
    medical_record_number: string;
    admission_date: string;
    record_time?: string;
    request_reason?: string;
    status: 'pending' | 'approved' | 'rejected';
    reject_reason?: string;
    resolved_by?: string;
    resolved_at?: Date;
    created_at?: Date;
}

export interface UserProfile {
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

// Alias for backward compatibility
export type FirestoreUser = UserProfile;

// ==================== Helper Functions ====================

const convertTimestamp = (timestamp: Timestamp | undefined): Date | undefined => {
    return timestamp?.toDate();
};

// ==================== Submission Service ====================

export const submissionService = {
    // Get all submissions (admin) or user's submissions
    async getAll(userId?: string, isAdmin = false): Promise<Submission[]> {
        const submissionsRef = collection(db, 'submissions');
        let q;

        if (isAdmin) {
            q = query(submissionsRef, orderBy('updated_at', 'desc'));
        } else if (userId) {
            q = query(
                submissionsRef,
                where('user_id', '==', userId),
                orderBy('updated_at', 'desc')
            );
        } else {
            return [];
        }

        const snapshot = await getDocs(q);
        const submissions: Submission[] = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            // Get user info
            let username = '';
            let hospital = '';
            if (data.user_id) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', data.user_id));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        username = userData.username || '';
                        hospital = userData.hospital || '';
                    }
                } catch (e) {
                    console.error('Error fetching user for submission:', e);
                }
            }

            // Check for pending delete requests
            const deleteReqQuery = query(
                collection(db, 'delete_requests'),
                where('submission_id', '==', docSnap.id),
                where('status', '==', 'pending')
            );
            const deleteReqSnapshot = await getDocs(deleteReqQuery);
            const hasPendingDelete = deleteReqSnapshot.size > 0 ? 1 : 0;

            submissions.push({
                id: docSnap.id,
                user_id: data.user_id,
                username,
                hospital,
                medical_record_number: data.medical_record_number,
                admission_date: data.admission_date,
                form_data: data.form_data || {},
                data_status: data.data_status || 'incomplete',
                update_count: data.update_count || 1,
                has_pending_delete: hasPendingDelete,
                created_at: convertTimestamp(data.created_at),
                updated_at: convertTimestamp(data.updated_at)
            });
        }

        return submissions;
    },

    // Get single submission by ID
    async getById(id: string): Promise<Submission | null> {
        const docRef = doc(db, 'submissions', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return null;

        const data = docSnap.data();
        return {
            id: docSnap.id,
            user_id: data.user_id,
            medical_record_number: data.medical_record_number,
            admission_date: data.admission_date,
            form_data: data.form_data || {},
            data_status: data.data_status || 'incomplete',
            update_count: data.update_count || 1,
            created_at: convertTimestamp(data.created_at),
            updated_at: convertTimestamp(data.updated_at)
        };
    },

    // Check if record exists
    async checkExists(
        userId: string,
        medicalRecordNumber: string,
        admissionDate: string,
        isAdmin = false
    ): Promise<{ exists: boolean; submission?: Submission }> {
        const submissionsRef = collection(db, 'submissions');
        let q;

        if (isAdmin) {
            q = query(
                submissionsRef,
                where('medical_record_number', '==', medicalRecordNumber),
                where('admission_date', '==', admissionDate)
            );
        } else {
            q = query(
                submissionsRef,
                where('user_id', '==', userId),
                where('medical_record_number', '==', medicalRecordNumber),
                where('admission_date', '==', admissionDate)
            );
        }

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { exists: false };
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data();

        return {
            exists: true,
            submission: {
                id: docSnap.id,
                user_id: data.user_id,
                medical_record_number: data.medical_record_number,
                admission_date: data.admission_date,
                form_data: data.form_data || {},
                data_status: data.data_status || 'incomplete',
                update_count: data.update_count || 1,
                created_at: convertTimestamp(data.created_at),
                updated_at: convertTimestamp(data.updated_at)
            }
        };
    },

    // Create new submission
    async create(
        userId: string,
        medicalRecordNumber: string,
        admissionDate: string,
        formData: Record<string, unknown>,
        dataStatus: 'complete' | 'incomplete' = 'incomplete'
    ): Promise<string> {
        const docRef = await addDoc(collection(db, 'submissions'), {
            user_id: userId,
            medical_record_number: medicalRecordNumber,
            admission_date: admissionDate,
            form_data: formData,
            data_status: dataStatus,
            update_count: 1,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });

        return docRef.id;
    },

    // Update submission
    async update(
        id: string,
        formData: Record<string, unknown>,
        dataStatus: 'complete' | 'incomplete' = 'incomplete'
    ): Promise<void> {
        const docRef = doc(db, 'submissions', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Submission not found');
        }

        const currentData = docSnap.data();

        await updateDoc(docRef, {
            form_data: formData,
            data_status: dataStatus,
            update_count: (currentData.update_count || 0) + 1,
            updated_at: serverTimestamp()
        });
    },

    // Delete submission (admin only)
    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, 'submissions', id));
    }
};

// ==================== Delete Request Service ====================

export const deleteRequestService = {
    // Get all delete requests (admin) or user's requests
    async getAll(userId?: string, isAdmin = false): Promise<DeleteRequest[]> {
        const requestsRef = collection(db, 'delete_requests');
        let q;

        if (isAdmin) {
            q = query(requestsRef, orderBy('created_at', 'desc'));
        } else if (userId) {
            q = query(
                requestsRef,
                where('requester_id', '==', userId),
                orderBy('created_at', 'desc')
            );
        } else {
            return [];
        }

        const snapshot = await getDocs(q);
        const requests: DeleteRequest[] = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            // Get requester info for admin view
            let requesterUsername = '';
            let requesterHospital = '';
            if (isAdmin && data.requester_id) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', data.requester_id));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        requesterUsername = userData.username || '';
                        requesterHospital = userData.hospital || '';
                    }
                } catch (e) {
                    console.error('Error fetching requester:', e);
                }
            }

            requests.push({
                id: docSnap.id,
                submission_id: data.submission_id,
                requester_id: data.requester_id,
                requester_username: requesterUsername,
                requester_hospital: requesterHospital,
                medical_record_number: data.medical_record_number,
                admission_date: data.admission_date,
                record_time: data.record_time,
                request_reason: data.request_reason,
                status: data.status || 'pending',
                reject_reason: data.reject_reason,
                resolved_by: data.resolved_by,
                resolved_at: convertTimestamp(data.resolved_at),
                created_at: convertTimestamp(data.created_at)
            });
        }

        return requests;
    },

    // Create delete request
    async create(
        submissionId: string,
        requesterId: string,
        medicalRecordNumber: string,
        admissionDate: string,
        recordTime?: string,
        requestReason?: string
    ): Promise<string> {
        // Check for existing pending request
        const existingQuery = query(
            collection(db, 'delete_requests'),
            where('submission_id', '==', submissionId),
            where('status', '==', 'pending')
        );
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
            throw new Error('此筆資料已有待審核的刪除申請');
        }

        const docRef = await addDoc(collection(db, 'delete_requests'), {
            submission_id: submissionId,
            requester_id: requesterId,
            medical_record_number: medicalRecordNumber,
            admission_date: admissionDate,
            record_time: recordTime || null,
            request_reason: requestReason || '',
            status: 'pending',
            created_at: serverTimestamp()
        });

        return docRef.id;
    },

    // Approve delete request (admin only)
    async approve(requestId: string, adminId: string): Promise<void> {
        const requestRef = doc(db, 'delete_requests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) {
            throw new Error('Delete request not found');
        }

        const requestData = requestSnap.data();

        if (requestData.status !== 'pending') {
            throw new Error('此申請已處理');
        }

        // Delete the submission
        await deleteDoc(doc(db, 'submissions', requestData.submission_id));

        // Update request status
        await updateDoc(requestRef, {
            status: 'approved',
            resolved_by: adminId,
            resolved_at: serverTimestamp()
        });
    },

    // Reject delete request (admin only)
    async reject(requestId: string, adminId: string, reason?: string): Promise<void> {
        const requestRef = doc(db, 'delete_requests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) {
            throw new Error('Delete request not found');
        }

        const requestData = requestSnap.data();

        if (requestData.status !== 'pending') {
            throw new Error('此申請已處理');
        }

        await updateDoc(requestRef, {
            status: 'rejected',
            resolved_by: adminId,
            reject_reason: reason || '',
            resolved_at: serverTimestamp()
        });
    },

    // Delete request record (admin only, for approved/rejected)
    async delete(requestId: string): Promise<void> {
        const requestRef = doc(db, 'delete_requests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) {
            throw new Error('Delete request not found');
        }

        const requestData = requestSnap.data();

        if (requestData.status === 'pending') {
            throw new Error('待審核的申請不能刪除');
        }

        await deleteDoc(requestRef);
    },

    // Count pending requests
    async countPending(): Promise<number> {
        const q = query(
            collection(db, 'delete_requests'),
            where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        return snapshot.size;
    }
};

// ==================== User Service ====================

export const userService = {
    // Get all users (admin only, excludes admins)
    async getAll(): Promise<UserProfile[]> {
        const q = query(
            collection(db, 'users'),
            where('role', '!=', 'admin')
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                username: data.username,
                hospital: data.hospital,
                role: data.role,
                email: data.email,
                display_name: data.display_name,
                phone: data.phone,
                address: data.address,
                gender: data.gender,
                line_id: data.line_id,
                security_question: data.security_question,
                security_answer: data.security_answer,
                created_at: convertTimestamp(data.created_at)
            };
        });
    },

    // Get user by ID
    async getById(id: string): Promise<UserProfile | null> {
        const docSnap = await getDoc(doc(db, 'users', id));

        if (!docSnap.exists()) return null;

        const data = docSnap.data();
        return {
            id: docSnap.id,
            username: data.username,
            hospital: data.hospital,
            role: data.role,
            email: data.email,
            display_name: data.display_name,
            phone: data.phone,
            address: data.address,
            gender: data.gender,
            line_id: data.line_id,
            security_question: data.security_question,
            security_answer: data.security_answer,
            created_at: convertTimestamp(data.created_at)
        };
    },

    // Get user by username
    async getByUsername(username: string): Promise<UserProfile | null> {
        const q = query(
            collection(db, 'users'),
            where('username', '==', username)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const docSnap = snapshot.docs[0];
        const data = docSnap.data();

        return {
            id: docSnap.id,
            username: data.username,
            hospital: data.hospital,
            role: data.role,
            email: data.email,
            display_name: data.display_name,
            phone: data.phone,
            address: data.address,
            gender: data.gender,
            line_id: data.line_id,
            security_question: data.security_question,
            security_answer: data.security_answer,
            created_at: convertTimestamp(data.created_at)
        };
    },

    // Update user profile
    async update(id: string, data: Partial<UserProfile>): Promise<void> {
        const userRef = doc(db, 'users', id);
        const updateData: DocumentData = {};

        // Only include defined fields
        if (data.username !== undefined) updateData.username = data.username;
        if (data.hospital !== undefined) updateData.hospital = data.hospital;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.display_name !== undefined) updateData.display_name = data.display_name;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.gender !== undefined) updateData.gender = data.gender;
        if (data.line_id !== undefined) updateData.line_id = data.line_id;
        if (data.security_question !== undefined) updateData.security_question = data.security_question;
        if (data.security_answer !== undefined) updateData.security_answer = data.security_answer;

        await updateDoc(userRef, updateData);
    },

    // Delete user
    async delete(id: string): Promise<void> {
        // Note: This only deletes the Firestore document
        // The Firebase Auth user needs to be deleted separately via Admin SDK or user action
        await deleteDoc(doc(db, 'users', id));
    },

    // Create user (for admin)
    async create(userData: Partial<UserProfile>): Promise<string> {
        const docRef = await addDoc(collection(db, 'users'), {
            username: userData.username || '',
            hospital: userData.hospital || '',
            role: userData.role || 'user',
            email: userData.email || '',
            display_name: userData.display_name || null,
            phone: userData.phone || null,
            address: userData.address || null,
            gender: userData.gender || null,
            line_id: userData.line_id || null,
            created_at: serverTimestamp()
        });
        return docRef.id;
    }
};

// ==================== Export Service ====================

export const exportService = {
    // Export submissions to CSV
    // If ids provided, export only those; otherwise export all
    async exportToCSV(ids?: string[]): Promise<string> {
        let submissions: Submission[];

        if (ids && ids.length > 0) {
            // Fetch specific submissions
            const fetchPromises = ids.map(id => submissionService.getById(id));
            const results = await Promise.all(fetchPromises);
            submissions = results.filter((s): s is Submission => s !== null);
        } else {
            // Fetch all submissions (admin mode)
            submissions = await submissionService.getAll(undefined, true);
        }

        if (submissions.length === 0) return '';

        // Get all form_data keys
        const allKeys = new Set<string>();
        submissions.forEach(s => {
            Object.keys(s.form_data || {}).forEach(key => allKeys.add(key));
        });

        const formDataKeys = Array.from(allKeys).sort();

        // Headers
        const headers = [
            'id', 'username', 'hospital', 'medical_record_number',
            'admission_date', 'data_status', 'update_count',
            ...formDataKeys
        ];

        // Rows
        const rows = submissions.map(s => {
            const baseRow = [
                s.id,
                s.username || '',
                s.hospital || '',
                s.medical_record_number,
                s.admission_date,
                s.data_status,
                String(s.update_count)
            ];

            const formDataValues = formDataKeys.map(key => {
                const value = s.form_data?.[key];
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value);
            });

            return [...baseRow, ...formDataValues];
        });

        // Convert to CSV
        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvLines = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ];

        return csvLines.join('\n');
    }
};
