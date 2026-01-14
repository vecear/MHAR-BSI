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
    // Export submissions to CSV with proper structured format
    async exportToCSV(ids?: string[]): Promise<string> {
        let submissions: Submission[];

        if (ids && ids.length > 0) {
            const fetchPromises = ids.map(id => submissionService.getById(id));
            const results = await Promise.all(fetchPromises);
            submissions = results.filter((s): s is Submission => s !== null);
        } else {
            submissions = await submissionService.getAll(undefined, true);
        }

        if (submissions.length === 0) return '';

        // Define constants for structured export
        const PRIMARY_SOURCES = ['Lung', 'Blood', 'Wound', 'GI', 'Urine', 'CLABSI'];
        const CHRONIC_DISEASES = [
            'MI', 'HCVD', 'OLD CVA', 'Dementia', 'Liver Cirrhosis',
            'Diabetes Mellitus', 'Renal disease', 'Autoimmune',
            'Leukemia', 'Lymphoma', 'Solid Tumor', 'AIDS',
            'COPD', 'Connective tissue disease', 'PUD', 'None'
        ];
        const ANTIBIOTICS_MIC = [
            'ampicillin', 'cefazolin', 'gentamicin', 'amikacin', 'trimeth_sulfame',
            'piperacillin_taz', 'cefuroxime', 'ceftriaxone', 'meropenem', 'doripenem',
            'imipenem', 'ertapenem', 'cefepime', 'tigecycline', 'levofloxacin',
            'colistin', 'flomoxef', 'cefoperazo_sulba', 'caz_avibactam', 'ceftolozane'
        ];
        const ANTIBIOTIC_DRUGS = [
            'Amikacin', 'Gentamicin', 'Tobramycin',
            'Meropenem', 'Imipenem', 'Ertapenem', 'Doripenem',
            'Ceftriaxone', 'Cefepime', 'Ceftazidime', 'Cefazolin',
            'Levofloxacin', 'Ciprofloxacin', 'Moxifloxacin',
            'Colistin', 'Polymyxin B',
            'Tigecycline',
            'Piperacillin-Tazobactam', 'Ampicillin-Sulbactam', 'Ceftazidime-Avibactam', 'Ceftolozane-Tazobactam',
            'Trimethoprim-Sulfamethoxazole',
            'Fosfomycin', 'Aztreonam'
        ];
        const YES_NO_FIELDS = [
            'thrombocytopenia', 'icu_at_onset', 'septic_shock',
            'infection_control', 'poly_microbial', 'clinical_response_14days'
        ];

        // Build headers
        const headers: string[] = [
            // Basic info
            'id', 'username', 'hospital', 'medical_record_number', 'admission_date',
            'data_status', 'update_count', 'record_time', 'name', 'recorded_by',
            'sex', 'age', 'bw', 'pathogen', 'positive_culture_date',
            // Checkbox: Primary Source
            'primary_source',
            ...PRIMARY_SOURCES.map(s => `primary_source_${s}`),
            // Radio single choice
            'type_of_infection',
            // Checkbox: Chronic Diseases
            'chronic_diseases',
            ...CHRONIC_DISEASES.map(d => `chronic_diseases_${d.replace(/[^a-zA-Z0-9]/g, '_')}`),
            // Yes/No fields as 0/1
            ...YES_NO_FIELDS,
            // Text fields
            'duration_before_bacteremia', 'renal_function_admission',
            'sofa_score', 'renal_function_bacteremia',
            // MIC data - one column per antibiotic
            ...ANTIBIOTICS_MIC.map(a => `mic_${a}`),
            // Antibiotic usage - one column per drug with date range
            ...ANTIBIOTIC_DRUGS.map(d => `antibiotic_${d.replace(/[^a-zA-Z0-9]/g, '_')}`),
            // Outcome
            'crude_mortality', 'hospital_stay_days', 'negative_bc', 'remarks'
        ];

        // Helper to convert Yes/No to 1/0
        const yesNoTo01 = (val: unknown): string => {
            if (val === 'Yes' || val === 'yes' || val === true) return '1';
            if (val === 'No' || val === 'no' || val === false) return '0';
            return '';
        };

        // Build rows
        const rows = submissions.map(s => {
            const fd = s.form_data || {};
            const row: string[] = [];

            // Basic info
            row.push(s.id);
            row.push(s.username || '');
            row.push(s.hospital || '');
            row.push(s.medical_record_number);
            row.push(s.admission_date);
            row.push(s.data_status);
            row.push(String(s.update_count || 1));
            row.push(String(fd.record_time || ''));
            row.push(String(fd.name || ''));
            row.push(String(fd.recorded_by || ''));
            row.push(String(fd.sex || ''));
            row.push(String(fd.age || ''));
            row.push(String(fd.bw || ''));
            row.push(String(fd.pathogen || ''));
            row.push(String(fd.positive_culture_date || ''));

            // Primary Source - combined value, then individual 0/1
            const primarySources = (fd.primary_source as string[]) || [];
            row.push(primarySources.join(';'));
            PRIMARY_SOURCES.forEach(source => {
                row.push(primarySources.includes(source) ? '1' : '0');
            });

            // Type of infection
            row.push(String(fd.type_of_infection || ''));

            // Chronic Diseases - combined value, then individual 0/1
            const chronicDiseases = (fd.chronic_diseases as string[]) || [];
            row.push(chronicDiseases.join(';'));
            CHRONIC_DISEASES.forEach(disease => {
                row.push(chronicDiseases.includes(disease) ? '1' : '0');
            });

            // Yes/No fields
            YES_NO_FIELDS.forEach(field => {
                row.push(yesNoTo01(fd[field]));
            });

            // Text fields
            row.push(String(fd.duration_before_bacteremia || ''));
            row.push(String(fd.renal_function_admission || ''));
            row.push(String(fd.sofa_score || ''));
            row.push(String(fd.renal_function_bacteremia || ''));

            // MIC data
            const micData = (fd.mic_data as Record<string, string>) || {};
            ANTIBIOTICS_MIC.forEach(ab => {
                row.push(micData[ab] || '');
            });

            // Antibiotic usage - format as date range
            const abDetails = (fd.antibiotic_details as Record<string, { drugs: string[]; usage: Record<string, { start_date: string; end_date: string; second_use: boolean; second_start_date?: string; second_end_date?: string }> }>) || {};
            ANTIBIOTIC_DRUGS.forEach(drug => {
                let usageStr = '';
                // Find this drug in any antibiotic class
                Object.values(abDetails).forEach(classDetail => {
                    if (classDetail.drugs?.includes(drug) && classDetail.usage?.[drug]) {
                        const usage = classDetail.usage[drug];
                        if (usage.start_date || usage.end_date) {
                            usageStr = `${usage.start_date || ''}~${usage.end_date || ''}`;
                            if (usage.second_use && (usage.second_start_date || usage.second_end_date)) {
                                usageStr += `; ${usage.second_start_date || ''}~${usage.second_end_date || ''}`;
                            }
                        }
                    }
                });
                row.push(usageStr);
            });

            // Outcome
            row.push(String(fd.crude_mortality || ''));
            row.push(String(fd.hospital_stay_days || ''));
            row.push(String(fd.negative_bc || ''));
            row.push(String(fd.remarks || ''));

            return row;
        });

        // Convert to CSV
        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes(';')) {
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
