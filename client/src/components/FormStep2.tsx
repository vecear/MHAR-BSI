import type { FormData } from '../pages/FormPage';

interface Props {
    formData: FormData;
    updateFormData: (updates: Partial<FormData>) => void;
}

const ANTIBIOTICS = [
    { key: 'ampicillin', name: 'AMPICILLIN', values: ['≤2', '4', '8', '≥16'] },
    { key: 'cefazolin', name: 'CEFAZOLIN', values: ['≤0.5', '1', '2', '4', '≥8'] },
    { key: 'gentamicin', name: 'GENTAMICIN', values: ['≤1', '2', '4', '≥8'] },
    { key: 'amikacin', name: 'AMIKACIN', values: ['≤4', '8', '16', '≥32'] },
    { key: 'trimeth_sulfame', name: 'TRIMETH/SULFAME', values: ['≤0.5/9.5', '1/19', '2/38', '≥4/76'] },
    { key: 'piperacillin_taz', name: 'PIPERACILLIN-TAZ', values: ['≤4/4', '8/4', '16/4', '32/4', '64/4', '≥128/4'] },
    { key: 'cefuroxime', name: 'CEFUROXIME', values: ['≤1', '2', '4', '8', '16', '≥32'] },
    { key: 'ceftriaxone', name: 'CEFTRIAXONE', values: ['≤0.25', '0.5', '1', '2', '≥4'] },
    { key: 'meropenem', name: 'MEROPENEM', values: ['≤0.25', '0.5', '1', '2', '4', '≥8'] },
    { key: 'doripenem', name: 'DORIPENEM', values: ['≤0.5', '1', '2', '≥4'] },
    { key: 'imipenem', name: 'IMIPENEM', values: ['≤1', '2', '4', '≥8'] },
    { key: 'ertapenem', name: 'ERTAPENEM', values: ['≤0.5', '1', '2', '≥4'] },
    { key: 'cefepime', name: 'CEFEPIME', values: ['≤2', '4', '8', '≥16'] },
    { key: 'tigecycline', name: 'TIGECYCLINE', values: ['≤0.5', '1', '2', '4', '≥8'] },
    { key: 'levofloxacin', name: 'LEVOFLOXACIN', values: ['≤0.5', '1', '2', '4', '≥8'] },
    { key: 'colistin', name: 'COLISTIN', values: ['≤0.5', '1', '2', '≥4'] },
    { key: 'flomoxef', name: 'FLOMOXEF', values: ['≤4', '8', '16', '≥32'] },
    { key: 'cefoperazo_sulba', name: 'CEFOPERAZO/SULBA', values: ['≤8/4', '16/8', '32/16', '≥64/32'] },
    { key: 'caz_avibactam', name: 'CAZ/Avibactam', values: ['≤2/4', '4/4', '8/4', '≥16/4'] },
    { key: 'ceftolozane', name: 'CEFTOLOZANE', values: ['≤2/4', '4/4', '8/4', '≥16/4'] }
];

export default function FormStep2({ formData, updateFormData }: Props) {
    const handleMicChange = (key: string, value: string) => {
        updateFormData({
            mic_data: {
                ...formData.mic_data,
                [key]: value
            }
        });
    };

    return (
        <div>
            <div className="form-section">
                <h3 className="form-section-title">MIC Data (最低抑菌濃度)</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    請選擇各抗生素的 MIC 值
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {ANTIBIOTICS.map(antibiotic => (
                        <div key={antibiotic.key} className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontWeight: 600 }}>
                                {antibiotic.name}
                            </label>
                            <div className="radio-group" style={{ flexWrap: 'wrap' }}>
                                {antibiotic.values.map(value => (
                                    <label key={value} className="radio-label">
                                        <input
                                            type="radio"
                                            name={`mic_${antibiotic.key}`}
                                            checked={formData.mic_data?.[antibiotic.key] === value}
                                            onChange={() => handleMicChange(antibiotic.key, value)}
                                        />
                                        {value}
                                    </label>
                                ))}
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name={`mic_${antibiotic.key}`}
                                        checked={formData.mic_data?.[antibiotic.key] === 'N/A'}
                                        onChange={() => handleMicChange(antibiotic.key, 'N/A')}
                                    />
                                    N/A
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
