import type { FormData } from '../pages/FormPage';

interface Props {
    formData: FormData;
    updateFormData: (updates: Partial<FormData>) => void;
    showIncomplete?: boolean;
}

export default function FormStep4({ formData, updateFormData, showIncomplete }: Props) {
    // Helper to check if a field is empty
    const isEmpty = (value: string | undefined) => !value || !value.trim();

    // Incomplete indicator component
    const IncompleteTag = ({ field }: { field: string | undefined }) => {
        if (!showIncomplete || !isEmpty(field)) return null;
        return <span className="incomplete-indicator">未完成</span>;
    };

    return (
        <div>
            <div className="form-section">
                <h3 className="form-section-title">Infection Control & Outcome</h3>

                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Infection Control Measure <IncompleteTag field={formData.infection_control} /></label>
                        <div className="radio-group">
                            {['Yes', 'No'].map(opt => (
                                <label key={opt} className="radio-label">
                                    <input
                                        type="radio"
                                        name="infection_control"
                                        checked={formData.infection_control === opt}
                                        onChange={() => updateFormData({ infection_control: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Crude Mortality <IncompleteTag field={formData.crude_mortality} /></label>
                        <div className="radio-group">
                            {['Mortality', 'Alive'].map(opt => (
                                <label key={opt} className="radio-label">
                                    <input
                                        type="radio"
                                        name="crude_mortality"
                                        checked={formData.crude_mortality === opt}
                                        onChange={() => updateFormData({ crude_mortality: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Poly Microbial <IncompleteTag field={formData.poly_microbial} /></label>
                        <div className="radio-group">
                            {['Yes', 'No'].map(opt => (
                                <label key={opt} className="radio-label">
                                    <input
                                        type="radio"
                                        name="poly_microbial"
                                        checked={formData.poly_microbial === opt}
                                        onChange={() => updateFormData({ poly_microbial: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Hospital stay after Bacteremia (Days) <IncompleteTag field={formData.hospital_stay_days} /></label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.hospital_stay_days}
                            onChange={e => updateFormData({ hospital_stay_days: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Clinical Response at 14 days treatment <IncompleteTag field={formData.clinical_response_14days} /></label>
                        <div className="radio-group">
                            {['Yes', 'No'].map(opt => (
                                <label key={opt} className="radio-label">
                                    <input
                                        type="radio"
                                        name="clinical_response"
                                        checked={formData.clinical_response_14days === opt}
                                        onChange={() => updateFormData({ clinical_response_14days: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Negative b/c During and after Treatment until Discharge <IncompleteTag field={formData.negative_bc} /></label>
                        <div className="radio-group">
                            {['Yes', 'No', 'Unknown'].map(opt => (
                                <label key={opt} className="radio-label">
                                    <input
                                        type="radio"
                                        name="negative_bc"
                                        checked={formData.negative_bc === opt}
                                        onChange={() => updateFormData({ negative_bc: opt })}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Remarks (補充說明)</label>
                    <textarea
                        className="form-textarea"
                        value={formData.remarks}
                        onChange={e => updateFormData({ remarks: e.target.value })}
                        placeholder="請輸入任何補充說明..."
                        rows={4}
                    />
                </div>
            </div>

            <div className="form-section">
                <h3 className="form-section-title">資料狀態</h3>

                <div className="form-group">
                    <label className="form-label required">Data Status (資料填寫狀態)</label>
                    <div className="radio-group">
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="data_status"
                                checked={formData.data_status === 'complete'}
                                onChange={() => updateFormData({ data_status: 'complete' })}
                            />
                            <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                                資料已填完
                            </span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="data_status"
                                checked={formData.data_status === 'incomplete'}
                                onChange={() => updateFormData({ data_status: 'incomplete' })}
                            />
                            <span style={{ color: 'var(--color-warning)', fontWeight: 500 }}>
                                未填完
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
