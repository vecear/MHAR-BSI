import { useState } from 'react';
import { Clock, Calculator } from 'lucide-react';
import { type FormData, HOSPITALS } from '../pages/FormPage';
import SOFACalculator from './SOFACalculator';

interface Props {
    formData: FormData;
    updateFormData: (updates: Partial<FormData>) => void;
    userHospital: string;
}

const PATHOGENS = ['CRKP', 'CRAB', 'CRECOLI', 'CRPA'];

const PRIMARY_SOURCES = ['Lung', 'Blood', 'Wound', 'GI', 'Urine', 'CLABSI'];

const INFECTION_TYPES = ['Hospital acquired', 'HCAP', '社區(HCAP排除)'];

const CHRONIC_DISEASES = [
    'MI', 'HCVD', 'OLD CVA', 'Dementia', 'Liver Cirrhosis',
    'Diabetes Mellitus', 'Renal disease', 'Autoimmune',
    'Leukemia', 'Lymphoma', 'Solid Tumor', 'AIDS',
    'COPD', 'Connective tissue disease', 'PUD', 'None'
];

export default function FormStep1({ formData, updateFormData }: Props) {
    const [showSOFACalculator, setShowSOFACalculator] = useState(false);

    const handleCheckboxChange = (field: 'primary_source' | 'chronic_diseases', value: string) => {
        const current = formData[field] || [];
        if (current.includes(value)) {
            updateFormData({ [field]: current.filter(v => v !== value) });
        } else {
            updateFormData({ [field]: [...current, value] });
        }
    };

    return (
        <div>
            {/* Record Time */}
            <div className="form-section">
                <h3 className="form-section-title">紀錄資訊</h3>
                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label required">紀錄時間</label>
                        <div className="record-time-container">
                            {/* Group 1: Date and Time Combined */}
                            <div className="record-sub-group-date">
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={formData.record_time?.slice(0, 16) || ''}
                                    onChange={e => updateFormData({ record_time: e.target.value })}
                                    style={{ flex: 1, minWidth: '200px' }}
                                />
                            </div>

                            {/* Group 2: Button and ID */}
                            <div className="record-sub-group-actions">
                                <button
                                    className="btn btn-secondary btn-now-time"
                                    onClick={() => {
                                        const now = new Date();
                                        const offset = now.getTimezoneOffset();
                                        const local = new Date(now.getTime() - offset * 60 * 1000);
                                        updateFormData({ record_time: local.toISOString().slice(0, 16) });
                                    }}
                                    type="button"
                                    style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', height: '38px', display: 'flex', alignItems: 'center', gap: '4px', flex: '0 0 auto' }}
                                >
                                    <Clock size={16} />
                                    現在時間
                                </button>

                                <span style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.05em',
                                    whiteSpace: 'nowrap'
                                }}>
                                    編號：<strong style={{ color: 'var(--text-primary)' }}>
                                        {formData.record_time ? formData.record_time.replace(/[-T:]/g, '') : '-'}
                                    </strong>
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Patient Identification */}
            <div className="form-section">
                <h3 className="form-section-title">病歷識別</h3>
                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label required">病歷號</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="form-input"
                            value={formData.medical_record_number}
                            onChange={e => updateFormData({ medical_record_number: e.target.value })}
                            placeholder="Medical Record Number"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Admission Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.admission_date}
                            onChange={e => {
                                const newDate = e.target.value;
                                if (!formData.positive_culture_date) {
                                    updateFormData({ admission_date: newDate, positive_culture_date: newDate });
                                } else {
                                    updateFormData({ admission_date: newDate });
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Patient Info */}
            <div className="form-section">
                <h3 className="form-section-title">病人資料</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div className="form-group" style={{ flex: '2 1 200px' }}>
                        <label className="form-label required">Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={e => updateFormData({ name: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 120px' }}>
                        <label className="form-label">Recorded By</label>
                        <div style={{ marginTop: '0.25rem' }}>
                            <span className="badge badge-info" style={{
                                fontSize: '0.9rem',
                                padding: '0.4rem 1rem',
                                display: 'inline-flex',
                                flexDirection: 'column',
                                width: '100%',
                                textAlign: 'center',
                                boxSizing: 'border-box',
                                lineHeight: '1.2'
                            }}>
                                {(() => {
                                    const val = formData.recorded_by || '';
                                    const match = val.match(/^(.+?)\s*\((.+)\)$/);
                                    if (match) {
                                        return (
                                            <>
                                                <span style={{ fontWeight: '600' }}>{match[1]}</span>
                                                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{match[2]}</span>
                                            </>
                                        );
                                    }
                                    return val;
                                })()}
                            </span>
                        </div>
                    </div>
                    <div className="form-group" style={{ flex: '1.5 1 220px' }}>
                        <label className="form-label">Sex</label>
                        <div className="radio-group" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', height: '38px', alignItems: 'center' }}>
                            {['Male', 'Female'].map(opt => (
                                <label key={opt} className="radio-label" style={{ margin: 0 }}>
                                    <input
                                        type="radio"
                                        name="sex"
                                        checked={formData.sex === opt}
                                        onChange={() => updateFormData({ sex: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="form-group" style={{ flex: '0.8 1 80px' }}>
                        <label className="form-label">Age</label>
                        <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="form-input"
                            value={formData.age}
                            onChange={e => updateFormData({ age: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 100px' }}>
                        <label className="form-label">BW (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            className="form-input"
                            value={formData.bw}
                            onChange={e => updateFormData({ bw: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Clinical Info */}
            <div className="form-section">
                <h3 className="form-section-title">臨床資料</h3>

                <div className="form-group">
                    <label className="form-label required">Hospital</label>
                    <div className="radio-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {HOSPITALS.map(h => (
                            <label
                                key={h}
                                className={`radio-label ${formData.hospital === h ? 'selected' : ''}`}
                                style={{
                                    border: formData.hospital === h ? '2px solid var(--color-primary)' : '1px solid #ddd',
                                    backgroundColor: formData.hospital === h ? '#f0f9ff' : 'white',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    color: '#1e293b' // Force dark text for visibility on white background
                                }}
                            >
                                <input
                                    type="radio"
                                    name="hospital"
                                    value={h}
                                    checked={formData.hospital === h}
                                    onChange={() => updateFormData({ hospital: h })}
                                    style={{ display: 'none' }}
                                />
                                {h}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label required">Pathogen</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {PATHOGENS.map(opt => {
                            const styles = {
                                'CRKP': { color: '#dc2626', bg: '#fecaca', border: '#fca5a5' },    // Red-200
                                'CRAB': { color: '#9333ea', bg: '#e9d5ff', border: '#d8b4fe' },    // Purple-200
                                'CRECOLI': { color: '#2563eb', bg: '#bfdbfe', border: '#93c5fd' }, // Blue-200
                                'CRPA': { color: '#ea580c', bg: '#fed7aa', border: '#fdba74' }     // Orange-200
                            }[opt] || { color: '#333', bg: '#fff', border: '#ddd' };

                            const isSelected = formData.pathogen === opt;

                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => updateFormData({ pathogen: opt })}
                                    style={{
                                        padding: '0.5rem 1.5rem',
                                        borderRadius: '9999px',
                                        border: `1px solid ${isSelected ? styles.color : styles.border}`,
                                        backgroundColor: isSelected ? styles.bg : 'white',
                                        color: isSelected ? styles.color : '#64748b',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Positive Culture Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.positive_culture_date}
                            onChange={e => updateFormData({ positive_culture_date: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Primary Source (Specimen)</label>
                    <div className="checkbox-group">
                        {PRIMARY_SOURCES.map(opt => (
                            <label key={opt} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.primary_source?.includes(opt) || false}
                                    onChange={() => handleCheckboxChange('primary_source', opt)}
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Type of Infection</label>
                    <div className="radio-group">
                        {INFECTION_TYPES.map(opt => (
                            <label key={opt} className="radio-label">
                                <input
                                    type="radio"
                                    name="infection_type"
                                    checked={formData.type_of_infection === opt}
                                    onChange={() => updateFormData({ type_of_infection: opt })}
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Chronic Diseases</label>
                    <div className="checkbox-group">
                        {CHRONIC_DISEASES.map(opt => (
                            <label key={opt} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.chronic_diseases?.includes(opt) || false}
                                    onChange={() => handleCheckboxChange('chronic_diseases', opt)}
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bacteremia Info */}
            <div className="form-section">
                <h3 className="form-section-title">Bacteremia 相關資料</h3>

                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Thrombocytopenia (&lt;100000) at bacteremia</label>
                        <div className="radio-group">
                            {['Yes', 'No'].map(opt => (
                                <label key={opt} className="radio-label">
                                    <input
                                        type="radio"
                                        name="thrombocytopenia"
                                        checked={formData.thrombocytopenia === opt}
                                        onChange={() => updateFormData({ thrombocytopenia: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">ICU at Bacteremia Onset</label>
                        <div className="radio-group">
                            {['Yes', 'No'].map(opt => (
                                <label key={opt} className="radio-label">
                                    <input
                                        type="radio"
                                        name="icu_at_onset"
                                        checked={formData.icu_at_onset === opt}
                                        onChange={() => updateFormData({ icu_at_onset: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Duration in Hospital before Bacteremia (Days)</label>
                        <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="form-input"
                            value={formData.duration_before_bacteremia}
                            onChange={e => updateFormData({ duration_before_bacteremia: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Renal function at admission within 7 days (Cr)</label>
                        <input
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            className="form-input"
                            value={formData.renal_function_admission}
                            onChange={e => updateFormData({ renal_function_admission: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-grid-3">
                    <div className="form-group">
                        <label className="form-label">SOFA Score at Bacteremia</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.sofa_score}
                                onChange={e => updateFormData({ sofa_score: e.target.value })}
                                style={{ flex: 1 }}
                                placeholder="0-24"
                                step="1"
                                min="0"
                                max="24"
                                inputMode="numeric"
                                pattern="[0-9]*"
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowSOFACalculator(true)}
                                style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Calculator size={16} />
                                計算
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">SEPTIC Shock at Bacteremia</label>
                        <div className="radio-group">
                            {['Yes', 'No'].map(opt => (
                                <label key={opt} className="radio-label">
                                    <input
                                        type="radio"
                                        name="septic_shock"
                                        checked={formData.septic_shock === opt}
                                        onChange={() => updateFormData({ septic_shock: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Renal function at bacteremia (Cr)</label>
                        <input
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            className="form-input"
                            value={formData.renal_function_bacteremia}
                            onChange={e => updateFormData({ renal_function_bacteremia: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* SOFA Calculator Modal */}
            <SOFACalculator
                isOpen={showSOFACalculator}
                onClose={() => setShowSOFACalculator(false)}
                onConfirm={(score) => updateFormData({ sofa_score: String(score) })}
                currentScore={formData.sofa_score}
            />
        </div>
    );
}

