import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Save, Check, AlertCircle } from 'lucide-react';
import { API_URL, useAuth } from '../App';
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
    '內湖總院', '松山分院', '澎湖分院', '桃園總院',
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
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submissionId, setSubmissionId] = useState<number | null>(id ? parseInt(id) : null);

    // Load existing data if editing
    useEffect(() => {
        if (id) {
            loadSubmission(id);
        }
    }, [id]);

    const loadSubmission = async (submissionId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/forms/${submissionId}`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('載入資料失敗');
            const data = await res.json();
            setFormData({
                ...initialFormData,
                ...data.form_data,
                medical_record_number: data.medical_record_number,
                admission_date: data.admission_date,
                data_status: data.data_status
            });
            setSubmissionId(data.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    // Set recorded_by and hospital for new forms
    useEffect(() => {
        if (!id && user) {
            const updates: Partial<FormData> = {};

            // Auto-fill recorded_by
            if (!formData.recorded_by && user.username) {
                updates.recorded_by = user.display_name
                    ? `${user.username} (${user.display_name})`
                    : user.username;
            }

            // Auto-fill hospital
            if (!formData.hospital && user.hospital) {
                // Check if user's hospital is in our list, if so use it
                if (HOSPITALS.includes(user.hospital)) {
                    updates.hospital = user.hospital;
                }
            }

            if (Object.keys(updates).length > 0) {
                updateFormData(updates);
            }
        }
    }, [user, id]);

    // Fetch existing data by medical record number and admission date
    const handleFetchData = async () => {
        if (!formData.medical_record_number || !formData.admission_date) {
            setError('請先輸入病歷號和住院日期');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(
                `${API_URL}/forms/check/${encodeURIComponent(formData.medical_record_number)}/${formData.admission_date}`,
                { credentials: 'include' }
            );
            if (!res.ok) throw new Error('查詢失敗');
            const data = await res.json();

            if (data.exists) {
                setFormData({
                    ...initialFormData,
                    ...data.submission.form_data,
                    medical_record_number: data.submission.medical_record_number,
                    admission_date: data.submission.admission_date,
                    data_status: data.submission.data_status
                });
                setSubmissionId(data.submission.id);
                setSuccess('已載入現有資料');
            } else {
                setError('找不到符合的資料');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '查詢失敗');
        } finally {
            setLoading(false);
        }
    };

    const updateFormData = (updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleSave = async (isSubmit: boolean = false) => {
        if (!formData.medical_record_number || !formData.admission_date) {
            setError('請填寫病歷號和住院日期');
            return;
        }

        // Determine final status
        let finalStatus = formData.data_status;

        if (!isSubmit) {
            // "Save Draft": Always mark as incomplete
            finalStatus = 'incomplete';
        } else {
            // "Submit" or "Modify": Ask the user if it's complete
            const isComplete = window.confirm('該筆資料是否已完成？\n\n按下「確定」標記為「已完成」\n按下「取消」標記為「未完成」');
            finalStatus = isComplete ? 'complete' : 'incomplete';

            // Basic validation if marking as complete
            if (finalStatus === 'complete') {
                const requiredFields: (keyof FormData)[] = ['name', 'sex', 'hospital', 'pathogen', 'type_of_infection'];
                const missingFields = requiredFields.filter(field => !formData[field]);
                if (missingFields.length > 0) {
                    if (!window.confirm('您已選擇標記為「已完成」，但部分基本欄位尚未填寫。確定要繼續嗎？')) {
                        return;
                    }
                }
            }
        }

        // Update local state and prepare for save
        const updatedFormData = { ...formData, data_status: finalStatus };
        setFormData(updatedFormData);

        setSaving(true);
        setError('');
        setSuccess('');

        const payload = {
            medical_record_number: formData.medical_record_number,
            admission_date: formData.admission_date,
            form_data: updatedFormData,
            data_status: finalStatus
        };

        try {
            let res;
            if (submissionId) {
                // Update existing
                res = await fetch(`${API_URL}/forms/${submissionId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new
                res = await fetch(`${API_URL}/forms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '儲存失敗');
            }

            const result = await res.json();
            if (result.id) {
                setSubmissionId(result.id);
            }

            setSuccess('資料已儲存');

            if (isSubmit) {
                setTimeout(() => navigate('/'), 1500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    const goToStep = (step: number) => {
        if (step >= 1 && step <= 4) {
            setCurrentStep(step);
            setError('');
            setSuccess('');
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

            {/* Alerts */}
            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {error}
                </div>
            )}
            {success && (
                <div className="alert alert-success">
                    <Check size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {success}
                </div>
            )}

            {/* Form Card */}
            <div className="card">
                {currentStep === 1 && (
                    <FormStep1
                        formData={formData}
                        updateFormData={updateFormData}
                        onFetch={handleFetchData}
                        loading={loading}
                        userHospital={user?.hospital || ''}
                    />
                )}
                {currentStep === 2 && (
                    <FormStep2 formData={formData} updateFormData={updateFormData} />
                )}
                {currentStep === 3 && (
                    <FormStep3 formData={formData} updateFormData={updateFormData} />
                )}
                {currentStep === 4 && (
                    <FormStep4 formData={formData} updateFormData={updateFormData} />
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
