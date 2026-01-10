import { Search } from 'lucide-react';
import type { FormData } from '../pages/FormPage';

interface Props {
    formData: FormData;
    updateFormData: (updates: Partial<FormData>) => void;
    onFetch: () => void;
    loading: boolean;
}

const HOSPITALS = [
    '內湖總院', '松山分院', '澎湖分院', '桃園總院',
    '台中總院', '高雄總院', '左營總院', '花蓮總院'
];

const PATHOGENS = ['CRKP', 'CRAB', 'CRECOLI', 'CRPA'];

const PRIMARY_SOURCES = ['Lung', 'Blood', 'Wound', 'GI', 'Urine', 'CLABSI'];

const INFECTION_TYPES = ['Hospital acquired', 'HCAP', '社區(HCAP排除)'];

const CHRONIC_DISEASES = [
    'MI', 'HCVD', 'OLD CVA', 'Dementia', 'Liver Cirrhosis',
    'Diabetes Mellitus', 'Renal disease', 'Autoimmune',
    'Leukemia', 'Lymphoma', 'Solid Tumor', 'AIDS',
    'COPD', 'Connective tissue disease', 'PUD', 'None'
];

export default function FormStep1({ formData, updateFormData, onFetch, loading }: Props) {
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
            {/* Header with Fetch */}
            <div className="form-section">
                <h3 className="form-section-title">病歷識別</h3>
                <div className="form-grid-3">
                    <div className="form-group">
                        <label className="form-label required">病歷號</label>
                        <input
                            type="text"
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
                            onChange={e => updateFormData({ admission_date: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={onFetch}
                            disabled={loading}
                            style={{ width: '100%' }}
                        >
                            {loading ? <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div> : <Search size={18} />}
                            更新資料
                        </button>
                    </div>
                </div>
            </div>

            {/* Patient Info */}
            <div className="form-section">
                <h3 className="form-section-title">病人資料</h3>
                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label required">Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={e => updateFormData({ name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Recorded By</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.recorded_by}
                            onChange={e => updateFormData({ recorded_by: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-grid-3">
                    <div className="form-group">
                        <label className="form-label">Sex</label>
                        <div className="radio-group">
                            {['Male', 'Female'].map(opt => (
                                <label key={opt} className="radio-label">
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
                    <div className="form-group">
                        <label className="form-label">Age</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.age}
                            onChange={e => updateFormData({ age: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">BW (kg)</label>
                        <input
                            type="text"
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
                    <label className="form-label">Hospital</label>
                    <div className="radio-group">
                        {HOSPITALS.map(opt => (
                            <label key={opt} className="radio-label">
                                <input
                                    type="radio"
                                    name="hospital"
                                    checked={formData.hospital === opt}
                                    onChange={() => updateFormData({ hospital: opt })}
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Pathogen</label>
                    <div className="radio-group">
                        {PATHOGENS.map(opt => (
                            <label key={opt} className="radio-label">
                                <input
                                    type="radio"
                                    name="pathogen"
                                    checked={formData.pathogen === opt}
                                    onChange={() => updateFormData({ pathogen: opt })}
                                />
                                {opt}
                            </label>
                        ))}
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
                            className="form-input"
                            value={formData.duration_before_bacteremia}
                            onChange={e => updateFormData({ duration_before_bacteremia: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Renal function at admission within 7 days (Cr)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.renal_function_admission}
                            onChange={e => updateFormData({ renal_function_admission: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-grid-3">
                    <div className="form-group">
                        <label className="form-label">SOFA Score at Bacteremia</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.sofa_score}
                            onChange={e => updateFormData({ sofa_score: e.target.value })}
                        />
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
                        <label className="form-label">Renal function at bacteremia</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.renal_function_bacteremia}
                            onChange={e => updateFormData({ renal_function_bacteremia: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
