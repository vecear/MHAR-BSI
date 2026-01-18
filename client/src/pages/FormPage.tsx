import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submissionService } from '../services/firestore';
import { useToast } from '../components/Toast';
import FormStep1 from '../components/FormStep1';
import FormStep2 from '../components/FormStep2';
import FormStep3 from '../components/FormStep3';
import FormStep4 from '../components/FormStep4';

const STEPS = [
    { id: 1, name: '基本資料' },
    { id: 2, name: 'MIC Data' },
    { id: 3, name: 'Antibiotic Use' },
    { id: 4, name: 'Outcome' }
];

export interface FormData {
    // Basic Info (Step 1)
    record_time: string;
    medical_record_number: string;
    admission_date: string;
    name: string;
    recorded_by: string;
    sex: string;
    age: string;
    bw: string;
    hospital: string;
    pathogen: string;
    positive_culture_date: string;
    primary_source: string[];
    type_of_infection: string;
    chronic_diseases: string[];
    thrombocytopenia: string;
    icu_at_onset: string;
    duration_before_bacteremia: string;
    renal_function_admission: string;
    sofa_score: string;
    septic_shock: string;
    renal_function_bacteremia: string;

    // MIC Data (Step 2)
    mic_data: Record<string, string>;

    // Antibiotic Use (Step 3)
    antibiotic_classes: string[];
    antibiotic_details: Record<string, {
        drugs: string[];
        usage: Record<string, {
            start_date: string;
            end_date: string;
            second_use: boolean;
            second_start_date?: string;
            second_end_date?: string;
        }>;
    }>;

    // Outcome (Step 4)
    infection_control: string;
    crude_mortality: string;
    poly_microbial: string;
    hospital_stay_days: string;
    clinical_response_14days: string;
    negative_bc: string;
    remarks: string;
    data_status: string;
}

const initialFormData: FormData = {
    record_time: (() => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const local = new Date(now.getTime() - offset * 60 * 1000);
        return local.toISOString().slice(0, 16);
    })(),
    medical_record_number: '',
    admission_date: '',
    name: '',
    recorded_by: '',
    sex: '',
    age: '',
    bw: '',
    hospital: '',
    pathogen: '',
    positive_culture_date: '',
    primary_source: [],
    type_of_infection: '',
    chronic_diseases: [],
    thrombocytopenia: '',
    icu_at_onset: '',
    duration_before_bacteremia: '',
    renal_function_admission: '',
    sofa_score: '',
    septic_shock: '',
    renal_function_bacteremia: '',
    mic_data: {},
    antibiotic_classes: [],
    antibiotic_details: {},
    infection_control: '',
    crude_mortality: '',
    poly_microbial: '',
    hospital_stay_days: '',
    clinical_response_14days: '',
    negative_bc: '',
    remarks: '',
    data_status: 'incomplete'
};

export const HOSPITALS = [
    '三軍總院', '松山分院', '澎湖分院', '桃園總院',
    '台中總院', '高雄總院', '左營總院', '花蓮總院'
];

export default function FormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [submissionId, setSubmissionId] = useState<string | null>(id || null);
    const [showIncomplete, setShowIncomplete] = useState(false);
    const { showError, showSuccess } = useToast();

    // Load existing data if editing
    useEffect(() => {
        if (id) {
            loadSubmission(id);
        }
    }, [id]);

    const loadSubmission = async (submissionId: string) => {
        setLoading(true);
        try {
            const submission = await submissionService.getById(submissionId);
            if (!submission) throw new Error('載入資料失敗');

            setFormData({
                ...initialFormData,
                ...(submission.form_data as unknown as FormData),
                medical_record_number: submission.medical_record_number,
                admission_date: submission.admission_date,
                data_status: submission.data_status
            });
            setSubmissionId(submission.id);
            // Show incomplete indicators if loading an incomplete submission
            if (submission.data_status === 'incomplete') {
                setShowIncomplete(true);
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    // Set recorded_by and hospital for new forms
    useEffect(() => {
        if (!id && user) {
            const updates: Partial<FormData> = {};

            if (!formData.recorded_by && user.username) {
                updates.recorded_by = user.display_name
                    ? `${user.username} (${user.display_name})`
                    : user.username;
            }

            if (!formData.hospital && user.hospital) {
                if (HOSPITALS.includes(user.hospital)) {
                    updates.hospital = user.hospital;
                }
            }

            if (Object.keys(updates).length > 0) {
                updateFormData(updates);
            }
        }
    }, [user, id]);


    const updateFormData = (updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleSave = async (isSubmit: boolean = false) => {
        // Only require medical_record_number and admission_date to save
        if (!formData.medical_record_number || !formData.admission_date) {
            showError('請填寫病歷號和住院日期');
            return;
        }
        if (!user) {
            showError('請先登入');
            return;
        }

        // Check if ALL fields are filled to determine completion status
        const checkAllFieldsFilled = (): boolean => {
            // Step 1 fields
            const step1Fields = [
                'name', 'sex', 'age', 'bw', 'hospital', 'pathogen',
                'positive_culture_date', 'type_of_infection',
                'thrombocytopenia', 'icu_at_onset', 'duration_before_bacteremia',
                'renal_function_admission', 'sofa_score', 'septic_shock', 'renal_function_bacteremia'
            ] as const;

            for (const field of step1Fields) {
                const value = formData[field];
                if (!value || (typeof value === 'string' && !value.trim())) return false;
            }

            // Check arrays
            if (!formData.primary_source || formData.primary_source.length === 0) return false;
            if (!formData.chronic_diseases || formData.chronic_diseases.length === 0) return false;

            // Step 4 Outcome fields
            const step4Fields = [
                'infection_control', 'crude_mortality', 'poly_microbial',
                'hospital_stay_days', 'clinical_response_14days', 'negative_bc'
            ] as const;

            for (const field of step4Fields) {
                const value = formData[field];
                if (!value || (typeof value === 'string' && !value.trim())) return false;
            }

            return true;
        };

        const allFilled = checkAllFieldsFilled();
        let finalStatus: 'complete' | 'incomplete';

        if (!isSubmit) {
            // Saving draft - always incomplete
            finalStatus = 'incomplete';
        } else {
            // Submitting - auto-determine status based on all fields
            if (allFilled) {
                finalStatus = 'complete';
                setShowIncomplete(false);
                showSuccess('資料已完整填寫，標記為「已完成」');
            } else {
                finalStatus = 'incomplete';
                setShowIncomplete(true);
                showSuccess('資料已儲存，部分欄位尚未填寫，標記為「未完成」');
            }
        }

        const updatedFormData = { ...formData, data_status: finalStatus };
        setFormData(updatedFormData);

        setSaving(true);

        try {
            if (submissionId) {
                // Update existing
                await submissionService.update(submissionId, updatedFormData, finalStatus);
            } else {
                // Create new
                const newId = await submissionService.create(
                    user.id,
                    formData.medical_record_number,
                    formData.admission_date,
                    updatedFormData,
                    finalStatus
                );
                setSubmissionId(newId);
            }

            if (!isSubmit) {
                showSuccess('草稿已儲存');
            }

            if (isSubmit) {
                setTimeout(() => navigate('/'), 1500);
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : '儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    // Only validate fields with * (required) in Step 1
    const validateStep1 = (): boolean => {
        const requiredFields: { key: keyof FormData, label: string }[] = [
            { key: 'medical_record_number', label: '病歷號' },
            { key: 'admission_date', label: 'Admission Date' },
            { key: 'name', label: 'Name' },
            { key: 'hospital', label: 'Hospital' },
            { key: 'pathogen', label: 'Pathogen' }
        ];

        for (const field of requiredFields) {
            if (!formData[field.key]) {
                showError(`請填寫 ${field.label}`);
                return false;
            }
        }

        return true;
    };

    const validateStep3 = (): boolean => {
        if (!formData.antibiotic_classes || formData.antibiotic_classes.length === 0) return true;

        // Map of class keys to display names
        const classNames: Record<string, string> = {
            'aminoglycoside': 'Aminoglycoside',
            'carbapenem': 'Carbapenem',
            'cephalosporin': 'Cephalosporin',
            'fluoroquinolone': 'Fluoroquinolone',
            'polymyxin': 'Polymyxin',
            'tigecycline': 'Tigecycline',
            'beta_lactam': 'Beta-lactam / Beta-lactamase inhibitor',
            'sulfonamide': 'Sulfonamide',
            'other': 'Other'
        };

        for (const classKey of formData.antibiotic_classes) {
            const classDetails = formData.antibiotic_details?.[classKey];
            const className = classNames[classKey] || classKey;

            // Check if no drugs are selected for this class
            if (!classDetails || !classDetails.drugs || classDetails.drugs.length === 0) {
                showError(`請至少選擇一種「${className}」類別下的藥物`);
                return false;
            }

            for (const drug of classDetails.drugs) {
                const usage = classDetails.usage?.[drug];
                if (!usage || !usage.start_date || !usage.end_date) {
                    showError(`請填寫 ${drug} 的完整使用期間`);
                    return false;
                }
                if (usage.second_use) {
                    if (!usage.second_start_date || !usage.second_end_date) {
                        showError(`請填寫 ${drug} 的第二次完整使用期間`);
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const goToStep = (step: number) => {
        // Validation when moving forward
        if (step > currentStep) {
            if (currentStep === 1 && !validateStep1()) return;
            if (currentStep === 3 && !validateStep3()) return;
        }

        if (step >= 1 && step <= 4) {
            setCurrentStep(step);
        }
    };

    if (loading && id) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Step Indicator */}
            <div className="form-steps">
                {STEPS.map(step => (
                    <button
                        key={step.id}
                        className={`form-step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                        onClick={() => goToStep(step.id)}
                    >
                        <span className="form-step-number">
                            {currentStep > step.id ? <Check size={12} /> : step.id}
                        </span>
                        {step.name}
                    </button>
                ))}
            </div>

            {/* Form Card */}
            <div className="card">
                {currentStep === 1 && (
                    <FormStep1
                        formData={formData}
                        updateFormData={updateFormData}
                        userHospital={user?.hospital || ''}
                        showIncomplete={showIncomplete}
                    />
                )}
                {currentStep === 2 && (
                    <FormStep2 formData={formData} updateFormData={updateFormData} />
                )}
                {currentStep === 3 && (
                    <FormStep3 formData={formData} updateFormData={updateFormData} />
                )}
                {currentStep === 4 && (
                    <FormStep4 formData={formData} updateFormData={updateFormData} showIncomplete={showIncomplete} />
                )}

                {/* Navigation */}
                <div className="form-actions">
                    <div>
                        {currentStep > 1 && (
                            <button className="btn btn-secondary" onClick={() => goToStep(currentStep - 1)}>
                                <ChevronLeft size={18} />
                                上一步
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleSave(false)}
                            disabled={saving}
                        >
                            {saving ? <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div> : <Save size={18} />}
                            儲存草稿
                        </button>

                        <button
                            className="btn btn-success"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                        >
                            {id ? (currentStep === 4 ? '完成修改' : '完成修改') : (currentStep === 4 ? '完成並提交' : '直接提交')}
                        </button>

                        {currentStep < 4 && (
                            <button className="btn btn-primary" onClick={() => goToStep(currentStep + 1)}>
                                下一步
                                <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
