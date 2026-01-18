import { useState } from 'react';
import { Clock, Calculator } from 'lucide-react';
import { type FormData, HOSPITALS } from '../pages/FormPage';
import SOFACalculator from './SOFACalculator';

interface Props {
    formData: FormData;
    updateFormData: (updates: Partial<FormData>) => void;
    userHospital: string;
    showIncomplete?: boolean;
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

export default function FormStep1({ formData, updateFormData, showIncomplete }: Props) {
    const [showSOFACalculator, setShowSOFACalculator] = useState(false);

    // Helper to check if a field is empty
    const isEmpty = (value: string | string[] | undefined) => {
        if (Array.isArray(value)) return value.length === 0;
        return !value || !value.trim();
    };

    // Incomplete indicator component
    const IncompleteTag = ({ field }: { field: string | string[] | undefined }) => {
        if (!showIncomplete || !isEmpty(field)) return null;
        return <span className="incomplete-indicator">未完成</span>;
    };

    const handleCheckboxChange = (field: 'primary_source' | 'chronic_diseases', value: string) => {
        const current = formData[field] || [];
        if (current.includes(value)) {
            updateFormData({ [field]: current.filter(v => v !== value) });
        } else {
            updateFormData({ [field]: [...current, value] });
        }
    };

    // Calculate vasopressor dose: (concentration mg/ml × rate ml/hr × 1000) / (weight kg × 60)
    const calculateVasopressorDose = (concentration: string, rate: string, weight: string): string => {
        const conc = parseFloat(concentration);
        const rateVal = parseFloat(rate);
        const weightVal = parseFloat(weight);

        if (isNaN(conc) || isNaN(rateVal) || isNaN(weightVal) || weightVal === 0) {
            return '';
        }

        const dose = (conc * rateVal * 1000) / (weightVal * 60);
        return dose.toFixed(2);
    };

    // Handler for vasopressor checkbox toggle
    const handleVasopressorToggle = (vasopressorId: string) => {
        const currentVasopressors = { ...formData.vasopressors };

        if (currentVasopressors[vasopressorId]) {
            // Remove vasopressor
            delete currentVasopressors[vasopressorId];
        } else {
            // Add vasopressor with empty values
            currentVasopressors[vasopressorId] = {
                concentration: '',
                rate: '',
                dose: ''
            };
        }

        updateFormData({ vasopressors: currentVasopressors });
    };

    // Handler for vasopressor field changes (concentration/rate/dose)
    const handleVasopressorFieldChange = (
        vasopressorId: string,
        field: 'concentration' | 'rate' | 'dose',
        value: string
    ) => {
        const currentVasopressors = { ...formData.vasopressors };
        const vasopressor = currentVasopressors[vasopressorId];

        if (!vasopressor) return;

        vasopressor[field] = value;

        // Auto-calculate dose when concentration or rate changes
        if (field === 'concentration' || field === 'rate') {
            if (vasopressor.concentration && vasopressor.rate && formData.bw) {
                const calculatedDose = calculateVasopressorDose(
                    vasopressor.concentration,
                    vasopressor.rate,
                    formData.bw
                );
                if (calculatedDose) {
                    vasopressor.dose = calculatedDose;
                }
            }
        }

        updateFormData({ vasopressors: currentVasopressors });
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
                        <label className="form-label">Sex <IncompleteTag field={formData.sex} /></label>
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
                        <label className="form-label">Age <IncompleteTag field={formData.age} /></label>
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
                        <label className="form-label">BW (kg) <IncompleteTag field={formData.bw} /></label>
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
                        <label className="form-label">Positive Culture Date <IncompleteTag field={formData.positive_culture_date} /></label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.positive_culture_date}
                            onChange={e => updateFormData({ positive_culture_date: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Primary Source (Specimen) <IncompleteTag field={formData.primary_source} /></label>
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
                    <label className="form-label">Type of Infection <IncompleteTag field={formData.type_of_infection} /></label>
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
                    <label className="form-label">Chronic Diseases <IncompleteTag field={formData.chronic_diseases} /></label>
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
                        <label className="form-label">Duration in Hospital before Bacteremia (Days) <IncompleteTag field={formData.duration_before_bacteremia} /></label>
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
                        <label className="form-label">ICU at Bacteremia Onset <IncompleteTag field={formData.icu_at_onset} /></label>
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
                        <label className="form-label">SEPTIC Shock at Bacteremia<IncompleteTag field={formData.septic_shock} /></label>
                        <div className="radio-group" style={{ marginBottom: formData.septic_shock === 'Yes' ? '0.5rem' : '0' }}>
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

                        {formData.septic_shock === 'Yes' && (
                            <div className="vasopressor-box" style={{
                                marginTop: '0.5rem',
                                padding: '1rem',
                                background: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #bae6fd'
                            }}>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label className="form-label" style={{ fontSize: '0.85rem' }}>是否使用升壓劑？</label>
                                    <div className="radio-group" style={{ margin: 0 }}>
                                        {['Yes', 'No'].map(opt => (
                                            <label key={opt} className="radio-label" style={{ fontSize: '0.85rem' }}>
                                                <input
                                                    type="radio"
                                                    name="vasopressor_used"
                                                    checked={formData.vasopressor_used === opt}
                                                    onChange={() => updateFormData({ vasopressor_used: opt })}
                                                />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {formData.vasopressor_used === 'Yes' && (
                                    <>
                                        <div style={{ fontSize: '0.85rem', color: '#0369a1', marginBottom: '1rem', fontWeight: '500' }}>
                                            體重: <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formData.bw || '?'}</span> Kg
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label className="form-label" style={{ fontSize: '0.85rem' }}>升壓劑種類（可複選）</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
                                                {[
                                                    { id: 'Dopamine', label: 'Dopamine' },
                                                    { id: 'Dobutamine', label: 'Dobutamine' },
                                                    { id: 'Norepinephrine', label: 'Norepinephrine' },
                                                    { id: 'Epinephrine', label: 'Epinephrine' }
                                                ].map(opt => {
                                                    const isChecked = !!formData.vasopressors[opt.id];
                                                    const vasopressor = formData.vasopressors[opt.id];

                                                    return (
                                                        <div key={opt.id} style={{ width: '100%' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', margin: 0, fontSize: '0.85rem', cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleVasopressorToggle(opt.id)}
                                                                    style={{ marginRight: '0.5rem' }}
                                                                />
                                                                {opt.label}
                                                            </label>

                                                            {isChecked && vasopressor && (
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                                                    gap: '0.75rem',
                                                                    marginTop: '0.5rem',
                                                                    padding: '0.75rem',
                                                                    background: '#fff',
                                                                    borderRadius: '6px',
                                                                    border: '1px dashed #bae6fd',
                                                                    marginLeft: '1.5rem'
                                                                }}>
                                                                    <div className="form-group" style={{ margin: 0 }}>
                                                                        <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b' }}>濃度 (mg/ml)</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="form-input"
                                                                            style={{ fontSize: '0.85rem', padding: '0.35rem' }}
                                                                            value={vasopressor.concentration}
                                                                            onChange={e => handleVasopressorFieldChange(opt.id, 'concentration', e.target.value)}
                                                                            placeholder="數值"
                                                                        />
                                                                        {opt.id === 'Dopamine' && (
                                                                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem', lineHeight: '1.3' }}>
                                                                                Eazydopa: <span style={{ color: '#dc2626', fontWeight: '600' }}>1.6 mg/ml</span> (400mg/250mL)<br />
                                                                                Gipamine: <span style={{ color: '#dc2626', fontWeight: '600' }}>3 mg/ml</span> (600mg/200mL)
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="form-group" style={{ margin: 0 }}>
                                                                        <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b' }}>速率 (ml/hr)</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="form-input"
                                                                            style={{ fontSize: '0.85rem', padding: '0.35rem' }}
                                                                            value={vasopressor.rate}
                                                                            onChange={e => handleVasopressorFieldChange(opt.id, 'rate', e.target.value)}
                                                                            placeholder="數值"
                                                                        />
                                                                    </div>
                                                                    <div className="form-group" style={{ margin: 0 }}>
                                                                        <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b' }}>計算劑量 (mcg/kg/min)</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="form-input"
                                                                            style={{
                                                                                fontSize: '0.85rem',
                                                                                padding: '0.35rem',
                                                                                backgroundColor: (vasopressor.concentration || vasopressor.rate) ? '#f8fafc' : '#fff',
                                                                                cursor: (vasopressor.concentration || vasopressor.rate) ? 'not-allowed' : 'text'
                                                                            }}
                                                                            value={vasopressor.dose}
                                                                            onChange={e => handleVasopressorFieldChange(opt.id, 'dose', e.target.value)}
                                                                            readOnly={!!(vasopressor.concentration || vasopressor.rate)}
                                                                        />
                                                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem', lineHeight: '1.2' }}>
                                                                            {(vasopressor.concentration || vasopressor.rate)
                                                                                ? '計算劑量 = (濃度 × 速率 × 1000) / (體重 × 60)'
                                                                                : '可手動輸入或填入濃度/速率自動計算'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Thrombocytopenia (&lt;100,000) at bacteremia <IncompleteTag field={formData.thrombocytopenia} /></label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ width: '100px' }}
                                    value={formData.platelets || ''}
                                    placeholder="數值"
                                    onChange={e => {
                                        const val = e.target.value;
                                        const updates: any = { platelets: val };
                                        if (val !== '') {
                                            updates.thrombocytopenia = Number(val) < 100 ? 'Yes' : 'No';
                                        }
                                        updateFormData(updates);
                                    }}
                                />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>×10³ / µL</span>
                            </div>
                            <div className="radio-group" style={{ margin: 0, height: '38px', display: 'flex', alignItems: 'center' }}>
                                {['Yes', 'No'].map(opt => (
                                    <label key={opt} className="radio-label" style={{ margin: 0 }}>
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
                    </div>
                </div>

                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">
                            Renal function <span style={{ color: '#2563eb' }}>at admission within 7 days</span> (Cr) <IncompleteTag field={formData.renal_function_admission} />
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            className="form-input"
                            value={formData.renal_function_admission}
                            onChange={e => updateFormData({ renal_function_admission: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            Renal function <span style={{ color: '#dc2626' }}>at bacteremia</span> (Cr) <IncompleteTag field={formData.renal_function_bacteremia} />
                        </label>
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

                <div className="form-grid-1" style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">SOFA Score at Bacteremia <IncompleteTag field={formData.sofa_score} /></label>
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
                </div>
            </div>

            {/* SOFA Calculator Modal */}
            <SOFACalculator
                isOpen={showSOFACalculator}
                onClose={() => setShowSOFACalculator(false)}
                onConfirm={(score) => updateFormData({ sofa_score: String(score) })}
                currentScore={formData.sofa_score}
                platelets={formData.platelets}
                renalCr={formData.renal_function_bacteremia}
                vasopressors={formData.vasopressors}
            />
        </div>
    );
}
