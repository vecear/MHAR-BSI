import { useState, useMemo } from 'react';
import { X, Calculator, AlertCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (score: number) => void;
    currentScore?: string;
}

// SOFA Score options for each organ system
const RESPIRATION_OPTIONS = [
    { value: 0, label: 'PaO2/FiO2 ≥ 400 mmHg', shortLabel: '≥400' },
    { value: 1, label: 'PaO2/FiO2 < 400 mmHg', shortLabel: '<400' },
    { value: 2, label: 'PaO2/FiO2 < 300 mmHg', shortLabel: '<300' },
    { value: 3, label: 'PaO2/FiO2 < 200 mmHg + 呼吸器', shortLabel: '<200 + Vent' },
    { value: 4, label: 'PaO2/FiO2 < 100 mmHg + 呼吸器', shortLabel: '<100 + Vent' },
];

const COAGULATION_OPTIONS = [
    { value: 0, label: 'Platelets ≥ 150 ×10³/µL', shortLabel: '≥150' },
    { value: 1, label: 'Platelets < 150 ×10³/µL', shortLabel: '<150' },
    { value: 2, label: 'Platelets < 100 ×10³/µL', shortLabel: '<100' },
    { value: 3, label: 'Platelets < 50 ×10³/µL', shortLabel: '<50' },
    { value: 4, label: 'Platelets < 20 ×10³/µL', shortLabel: '<20' },
];

const LIVER_OPTIONS = [
    { value: 0, label: 'Bilirubin < 1.2 mg/dL', shortLabel: '<1.2' },
    { value: 1, label: 'Bilirubin 1.2–1.9 mg/dL', shortLabel: '1.2-1.9' },
    { value: 2, label: 'Bilirubin 2.0–5.9 mg/dL', shortLabel: '2.0-5.9' },
    { value: 3, label: 'Bilirubin 6.0–11.9 mg/dL', shortLabel: '6.0-11.9' },
    { value: 4, label: 'Bilirubin ≥ 12.0 mg/dL', shortLabel: '≥12' },
];

const CARDIOVASCULAR_OPTIONS = [
    { value: 0, label: 'MAP ≥ 70 mmHg', shortLabel: 'MAP ≥70' },
    { value: 1, label: 'MAP < 70 mmHg', shortLabel: 'MAP <70' },
    { value: 2, label: 'Dopamine ≤5 或 Dobutamine (任何劑量)', shortLabel: 'Dopa ≤5' },
    { value: 3, label: 'Dopamine >5 或 Epinephrine/Norepinephrine ≤0.1 µg/kg/min', shortLabel: 'Dopa >5 / Epi ≤0.1' },
    { value: 4, label: 'Dopamine >15 或 Epinephrine/Norepinephrine >0.1 µg/kg/min', shortLabel: 'Dopa >15 / Epi >0.1' },
];

const CNS_OPTIONS = [
    { value: 0, label: 'GCS 15', shortLabel: 'GCS 15' },
    { value: 1, label: 'GCS 13–14', shortLabel: 'GCS 13-14' },
    { value: 2, label: 'GCS 10–12', shortLabel: 'GCS 10-12' },
    { value: 3, label: 'GCS 6–9', shortLabel: 'GCS 6-9' },
    { value: 4, label: 'GCS < 6', shortLabel: 'GCS <6' },
];

const RENAL_OPTIONS = [
    { value: 0, label: 'Creatinine < 1.2 mg/dL', shortLabel: 'Cr <1.2' },
    { value: 1, label: 'Creatinine 1.2–1.9 mg/dL', shortLabel: 'Cr 1.2-1.9' },
    { value: 2, label: 'Creatinine 2.0–3.4 mg/dL', shortLabel: 'Cr 2.0-3.4' },
    { value: 3, label: 'Creatinine 3.5–4.9 mg/dL 或 UO <500 mL/day', shortLabel: 'Cr 3.5-4.9' },
    { value: 4, label: 'Creatinine ≥ 5.0 mg/dL 或 UO <200 mL/day', shortLabel: 'Cr ≥5.0' },
];

// Mortality estimates based on initial SOFA score (from Vincent et al.)
const getMortalityEstimate = (score: number): string => {
    if (score <= 1) return '<5%';
    if (score <= 3) return '~6-10%';
    if (score <= 5) return '~15-20%';
    if (score <= 7) return '~21-30%';
    if (score <= 9) return '~33-50%';
    if (score <= 11) return '~50-60%';
    if (score <= 14) return '~80-90%';
    return '>90%';
};

interface OrganSectionProps {
    title: string;
    icon: string;
    options: typeof RESPIRATION_OPTIONS;
    value: number | null;
    onChange: (value: number) => void;
}

function OrganSection({ title, icon, options, value, onChange }: OrganSectionProps) {
    return (
        <div className="sofa-organ-section">
            <div className="sofa-organ-header">
                <span className="sofa-organ-icon">{icon}</span>
                <span className="sofa-organ-title">{title}</span>
                <span className="sofa-organ-score">
                    {value !== null ? `${value}分` : '-'}
                </span>
            </div>
            <div className="sofa-options">
                {options.map(opt => (
                    <label
                        key={opt.value}
                        className={`sofa-option ${value === opt.value ? 'selected' : ''}`}
                    >
                        <input
                            type="radio"
                            name={title}
                            checked={value === opt.value}
                            onChange={() => onChange(opt.value)}
                        />
                        <span className="sofa-option-value">{opt.value}</span>
                        <span className="sofa-option-label">{opt.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

export default function SOFACalculator({ isOpen, onClose, onConfirm, currentScore }: Props) {
    const [respiration, setRespiration] = useState<number | null>(null);
    const [coagulation, setCoagulation] = useState<number | null>(null);
    const [liver, setLiver] = useState<number | null>(null);
    const [cardiovascular, setCardiovascular] = useState<number | null>(null);
    const [cns, setCns] = useState<number | null>(null);
    const [renal, setRenal] = useState<number | null>(null);

    const totalScore = useMemo(() => {
        const scores = [respiration, coagulation, liver, cardiovascular, cns, renal];
        if (scores.some(s => s === null)) return null;
        return scores.reduce((sum, s) => sum! + s!, 0);
    }, [respiration, coagulation, liver, cardiovascular, cns, renal]);

    const handleConfirm = () => {
        if (totalScore !== null) {
            onConfirm(totalScore);
            onClose();
        }
    };

    const handleReset = () => {
        setRespiration(null);
        setCoagulation(null);
        setLiver(null);
        setCardiovascular(null);
        setCns(null);
        setRenal(null);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content sofa-calculator-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <Calculator size={24} />
                        SOFA Score 計算器
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="sofa-calculator-body">
                    {currentScore && (
                        <div className="sofa-current-score">
                            目前填入的 SOFA Score：<strong>{currentScore}</strong>
                        </div>
                    )}

                    <div className="sofa-info-banner">
                        <AlertCircle size={16} />
                        請選擇各器官系統在菌血症發生時的最差狀態
                    </div>

                    <div className="sofa-organs-grid">
                        <OrganSection
                            title="呼吸系統 (Respiration)"
                            icon="🫁"
                            options={RESPIRATION_OPTIONS}
                            value={respiration}
                            onChange={setRespiration}
                        />

                        <OrganSection
                            title="凝血系統 (Coagulation)"
                            icon="🩸"
                            options={COAGULATION_OPTIONS}
                            value={coagulation}
                            onChange={setCoagulation}
                        />

                        <OrganSection
                            title="肝臟 (Liver)"
                            icon="🫀"
                            options={LIVER_OPTIONS}
                            value={liver}
                            onChange={setLiver}
                        />

                        <OrganSection
                            title="心血管 (Cardiovascular)"
                            icon="❤️"
                            options={CARDIOVASCULAR_OPTIONS}
                            value={cardiovascular}
                            onChange={setCardiovascular}
                        />

                        <OrganSection
                            title="中樞神經 (CNS)"
                            icon="🧠"
                            options={CNS_OPTIONS}
                            value={cns}
                            onChange={setCns}
                        />

                        <OrganSection
                            title="腎臟 (Renal)"
                            icon="🫘"
                            options={RENAL_OPTIONS}
                            value={renal}
                            onChange={setRenal}
                        />
                    </div>

                    <div className="sofa-result-section">
                        <div className="sofa-total-score">
                            <span className="sofa-total-label">Total SOFA Score</span>
                            <span className="sofa-total-value">
                                {totalScore !== null ? totalScore : '—'}
                            </span>
                            <span className="sofa-total-max">/ 24</span>
                        </div>

                        {totalScore !== null && (
                            <div className="sofa-mortality">
                                <span>預估 ICU 死亡率：</span>
                                <strong>{getMortalityEstimate(totalScore)}</strong>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        重置
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>
                        取消
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={totalScore === null}
                    >
                        確認並填入 ({totalScore !== null ? totalScore : '-'} 分)
                    </button>
                </div>
            </div>
        </div>
    );
}
