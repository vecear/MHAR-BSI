import { useState, useMemo } from 'react';
import { X, Calculator, AlertCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (score: number) => void;
    currentScore?: string;
}

// Calculate respiration score from PaO2, FiO2, and ventilator status
const calculateRespirationScore = (paO2: string, fiO2: string, hasVentilator: boolean): number | null => {
    const paO2Val = parseFloat(paO2);
    const fiO2Val = parseFloat(fiO2);

    if (isNaN(paO2Val) || isNaN(fiO2Val) || fiO2Val <= 0) return null;

    const ratio = paO2Val / (fiO2Val / 100);

    if (hasVentilator) {
        if (ratio < 100) return 4;
        if (ratio < 200) return 3;
        if (ratio < 300) return 2;
        if (ratio < 400) return 1;
        return 0;
    } else {
        if (ratio < 300) return 2;
        if (ratio < 400) return 1;
        return 0;
    }
};

// Oxygen delivery device types
type OxygenDevice = 'direct' | 'room_air' | 'nasal_cannula' | 'venturi_mask' | 'simple_mask' | 'non_rebreathing_mask';

const OXYGEN_DEVICES: { value: OxygenDevice; label: string; needsFlow: boolean; flowRange?: [number, number] }[] = [
    { value: 'direct', label: '直接輸入 FiO2', needsFlow: false },
    { value: 'room_air', label: 'Room Air (室內空氣)', needsFlow: false },
    { value: 'nasal_cannula', label: 'Nasal Cannula (鼻導管)', needsFlow: true, flowRange: [1, 6] },
    { value: 'venturi_mask', label: 'Venturi Mask (文乳氏面罩)', needsFlow: true, flowRange: [4, 15] },
    { value: 'simple_mask', label: 'Simple Mask (簡單面罩)', needsFlow: true, flowRange: [5, 10] },
    { value: 'non_rebreathing_mask', label: 'Non-Rebreathing Mask (非再吸入面罩)', needsFlow: true, flowRange: [10, 15] },
];

// Venturi mask FiO2 options
const VENTURI_FIO2_OPTIONS = [24, 28, 31, 35, 40, 50];

// Calculate FiO2 based on device and flow rate
const calculateFiO2FromDevice = (device: OxygenDevice, flowRate: number, venturiFiO2?: number): number | null => {
    switch (device) {
        case 'room_air':
            return 21;
        case 'nasal_cannula':
            // ~21% + 4% per L/min (max ~44% at 6 L/min)
            return Math.min(21 + (flowRate * 4), 44);
        case 'venturi_mask':
            // Fixed FiO2 based on color-coded adapter
            return venturiFiO2 || null;
        case 'simple_mask':
            // ~35-50% depending on flow (5-10 L/min)
            // Approx: 35% at 5L, +3% per L/min
            return Math.min(35 + ((flowRate - 5) * 3), 50);
        case 'non_rebreathing_mask':
            // ~60-100% depending on flow (10-15 L/min)
            // Approx: 60% at 10L, +8% per L/min
            return Math.min(60 + ((flowRate - 10) * 8), 100);
        default:
            return null;
    }
};

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
    options: { value: number; label: string; shortLabel: string }[];
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
    // Respiration inputs
    const [paO2, setPaO2] = useState<string>('');
    const [fiO2, setFiO2] = useState<string>('');
    const [hasVentilator, setHasVentilator] = useState<boolean>(false);

    // Oxygen device selection
    const [oxygenDevice, setOxygenDevice] = useState<OxygenDevice>('direct');
    const [flowRate, setFlowRate] = useState<string>('');
    const [venturiFiO2, setVenturiFiO2] = useState<number>(24);

    // Other organ scores
    const [coagulation, setCoagulation] = useState<number | null>(null);
    const [liver, setLiver] = useState<number | null>(null);
    const [cardiovascular, setCardiovascular] = useState<number | null>(null);
    const [cns, setCns] = useState<number | null>(null);
    const [renal, setRenal] = useState<number | null>(null);

    // Get current device config
    const currentDeviceConfig = OXYGEN_DEVICES.find(d => d.value === oxygenDevice);

    // Auto-calculate FiO2 when device/flow changes
    const calculatedFiO2 = useMemo(() => {
        if (oxygenDevice === 'direct') return null;
        if (oxygenDevice === 'room_air') return 21;

        const flow = parseFloat(flowRate);
        if (isNaN(flow)) return null;

        return calculateFiO2FromDevice(oxygenDevice, flow, venturiFiO2);
    }, [oxygenDevice, flowRate, venturiFiO2]);

    // Update FiO2 field when calculated
    const effectiveFiO2 = oxygenDevice === 'direct' ? fiO2 : (calculatedFiO2?.toString() || '');

    // Calculate respiration score from inputs
    const respiration = useMemo(() => calculateRespirationScore(paO2, effectiveFiO2, hasVentilator), [paO2, effectiveFiO2, hasVentilator]);

    // Calculate ratio for display
    const paO2FiO2Ratio = useMemo(() => {
        const p = parseFloat(paO2);
        const f = parseFloat(effectiveFiO2);
        if (isNaN(p) || isNaN(f) || f <= 0) return null;
        return p / (f / 100);
    }, [paO2, effectiveFiO2]);

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
        setPaO2('');
        setFiO2('');
        setHasVentilator(false);
        setOxygenDevice('direct');
        setFlowRate('');
        setVenturiFiO2(24);
        setCoagulation(null);
        setLiver(null);
        setCardiovascular(null);
        setCns(null);
        setRenal(null);
    };

    const handleDeviceChange = (device: OxygenDevice) => {
        setOxygenDevice(device);
        setFlowRate('');
        // Set default flow rate for device
        const config = OXYGEN_DEVICES.find(d => d.value === device);
        if (config?.flowRange) {
            setFlowRate(config.flowRange[0].toString());
        }
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
                        {/* Respiration - custom input section */}
                        <div className="sofa-organ-section">
                            <div className="sofa-organ-header">
                                <span className="sofa-organ-icon">🫁</span>
                                <span className="sofa-organ-title">呼吸系統 (Respiration)</span>
                                <span className="sofa-organ-score">
                                    {respiration !== null ? `${respiration}分` : '-'}
                                </span>
                            </div>
                            <div className="sofa-respiration-inputs">
                                <div className="sofa-input-row">
                                    <label className="sofa-input-group">
                                        <span>PaO2 (mmHg)</span>
                                        <input
                                            type="number"
                                            value={paO2}
                                            onChange={(e) => setPaO2(e.target.value)}
                                            placeholder="例: 80"
                                            min="0"
                                            step="0.1"
                                        />
                                    </label>
                                </div>

                                {/* Oxygen Device Selector */}
                                <div className="sofa-device-section">
                                    <span className="sofa-device-label">氧氣來源</span>
                                    <select
                                        className="sofa-device-select"
                                        value={oxygenDevice}
                                        onChange={(e) => handleDeviceChange(e.target.value as OxygenDevice)}
                                    >
                                        {OXYGEN_DEVICES.map(device => (
                                            <option key={device.value} value={device.value}>
                                                {device.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Direct FiO2 Input */}
                                {oxygenDevice === 'direct' && (
                                    <label className="sofa-input-group">
                                        <span>FiO2 (%)</span>
                                        <input
                                            type="number"
                                            value={fiO2}
                                            onChange={(e) => setFiO2(e.target.value)}
                                            placeholder="例: 21"
                                            min="0"
                                            max="100"
                                            step="1"
                                        />
                                    </label>
                                )}

                                {/* Flow Rate Input */}
                                {currentDeviceConfig?.needsFlow && oxygenDevice !== 'venturi_mask' && (
                                    <div className="sofa-input-row">
                                        <label className="sofa-input-group">
                                            <span>氧氣流量 (L/min)</span>
                                            <input
                                                type="number"
                                                value={flowRate}
                                                onChange={(e) => setFlowRate(e.target.value)}
                                                min={currentDeviceConfig.flowRange?.[0]}
                                                max={currentDeviceConfig.flowRange?.[1]}
                                                step="0.5"
                                                placeholder={`${currentDeviceConfig.flowRange?.[0]}-${currentDeviceConfig.flowRange?.[1]}`}
                                            />
                                        </label>
                                        {calculatedFiO2 !== null && (
                                            <div className="sofa-calculated-fio2">
                                                計算 FiO2: <strong>{calculatedFiO2.toFixed(0)}%</strong>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Venturi Mask FiO2 Selector */}
                                {oxygenDevice === 'venturi_mask' && (
                                    <div className="sofa-venturi-section">
                                        <span className="sofa-device-label">Venturi FiO2 設定</span>
                                        <div className="sofa-venturi-options">
                                            {VENTURI_FIO2_OPTIONS.map(fio2 => (
                                                <label
                                                    key={fio2}
                                                    className={`sofa-venturi-option ${venturiFiO2 === fio2 ? 'selected' : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="venturiFiO2"
                                                        checked={venturiFiO2 === fio2}
                                                        onChange={() => setVenturiFiO2(fio2)}
                                                    />
                                                    {fio2}%
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Room Air Display */}
                                {oxygenDevice === 'room_air' && (
                                    <div className="sofa-calculated-fio2">
                                        FiO2: <strong>21%</strong> (室內空氣)
                                    </div>
                                )}
                                <label className="sofa-ventilator-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={hasVentilator}
                                        onChange={(e) => setHasVentilator(e.target.checked)}
                                    />
                                    <span>使用呼吸器 (Mechanical Ventilation)</span>
                                </label>
                                {paO2FiO2Ratio !== null && (
                                    <div className="sofa-ratio-display">
                                        PaO2/FiO2 = <strong>{paO2FiO2Ratio.toFixed(0)}</strong> mmHg
                                        {hasVentilator && ' + 呼吸器'}
                                    </div>
                                )}
                                <div className="sofa-score-hint">
                                    <div className="sofa-score-hint-title">評分標準：</div>
                                    <div className="sofa-score-hint-row">
                                        <span>0分: ≥400</span>
                                        <span>1分: &lt;400</span>
                                        <span>2分: &lt;300</span>
                                    </div>
                                    <div className="sofa-score-hint-row">
                                        <span>3分: &lt;200 + 呼吸器</span>
                                        <span>4分: &lt;100 + 呼吸器</span>
                                    </div>
                                </div>
                            </div>
                        </div>

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
        </div >
    );
}
