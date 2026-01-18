import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// Helper to format Date to YYYY-MM-DD (Local)
const formatDate = (date: Date | null) => {
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Helper to parse YYYY-MM-DD to Date (Local)
const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};
import type { FormData } from '../pages/FormPage';

interface Props {
    formData: FormData;
    updateFormData: (updates: Partial<FormData>) => void;
}

const ANTIBIOTIC_CLASSES = [
    {
        key: 'aminoglycoside',
        name: 'Aminoglycoside',
        drugs: ['Amikacin', 'Gentamicin', 'Tobramycin']
    },
    {
        key: 'carbapenem',
        name: 'Carbapenem',
        drugs: ['Meropenem', 'Imipenem', 'Ertapenem', 'Doripenem']
    },
    {
        key: 'cephalosporin',
        name: 'Cephalosporin',
        drugs: ['Ceftriaxone', 'Cefepime', 'Ceftazidime', 'Cefazolin']
    },
    {
        key: 'fluoroquinolone',
        name: 'Fluoroquinolone',
        drugs: ['Levofloxacin', 'Ciprofloxacin', 'Moxifloxacin']
    },
    {
        key: 'polymyxin',
        name: 'Polymyxin',
        drugs: ['Colistin', 'Polymyxin B']
    },
    {
        key: 'tigecycline',
        name: 'Tigecycline',
        drugs: ['Tigecycline']
    },
    {
        key: 'beta_lactam',
        name: 'Beta-lactam / Beta-lactamase inhibitor',
        drugs: ['Piperacillin-Tazobactam', 'Ampicillin-Sulbactam', 'Ceftazidime-Avibactam', 'Ceftolozane-Tazobactam']
    },
    {
        key: 'sulfonamide',
        name: 'Sulfonamide',
        drugs: ['Trimethoprim-Sulfamethoxazole']
    },
    {
        key: 'other',
        name: 'Other',
        drugs: ['Fosfomycin', 'Aztreonam']
    }
];

export default function FormStep3({ formData, updateFormData }: Props) {
    const [expandedClasses, setExpandedClasses] = useState<string[]>([]);

    const toggleClass = (classKey: string) => {
        const classes = formData.antibiotic_classes || [];
        const details = formData.antibiotic_details || {};

        if (classes.includes(classKey)) {
            // Remove class and its details
            const newClasses = classes.filter(c => c !== classKey);
            const newDetails = { ...details };
            delete newDetails[classKey];
            updateFormData({
                antibiotic_classes: newClasses,
                antibiotic_details: newDetails
            });
            setExpandedClasses(expandedClasses.filter(c => c !== classKey));
        } else {
            // Add class
            updateFormData({
                antibiotic_classes: [...classes, classKey],
                antibiotic_details: {
                    ...details,
                    [classKey]: { drugs: [], usage: {} }
                }
            });
            setExpandedClasses([...expandedClasses, classKey]);
        }
    };

    const toggleDrug = (classKey: string, drug: string) => {
        const details = formData.antibiotic_details || {};
        const classDetails = details[classKey] || { drugs: [], usage: {} };

        if (classDetails.drugs.includes(drug)) {
            // Remove drug
            const newDrugs = classDetails.drugs.filter(d => d !== drug);
            const newUsage = { ...classDetails.usage };
            delete newUsage[drug];
            updateFormData({
                antibiotic_details: {
                    ...details,
                    [classKey]: { ...classDetails, drugs: newDrugs, usage: newUsage }
                }
            });
        } else {
            // Add drug with empty usage
            updateFormData({
                antibiotic_details: {
                    ...details,
                    [classKey]: {
                        ...classDetails,
                        drugs: [...classDetails.drugs, drug],
                        usage: {
                            ...classDetails.usage,
                            [drug]: { start_date: '', end_date: '', second_use: false }
                        }
                    }
                }
            });
        }
    };

    const updateDrugUsageBatch = (
        classKey: string,
        drug: string,
        updates: Record<string, string | boolean>
    ) => {
        const details = formData.antibiotic_details || {};
        const classDetails = details[classKey] || { drugs: [], usage: {} };
        const drugUsage = classDetails.usage[drug] || { start_date: '', end_date: '', second_use: false };

        updateFormData({
            antibiotic_details: {
                ...details,
                [classKey]: {
                    ...classDetails,
                    usage: {
                        ...classDetails.usage,
                        [drug]: { ...drugUsage, ...updates }
                    }
                }
            }
        });
    };

    const updateDrugUsage = (
        classKey: string,
        drug: string,
        field: string,
        value: string | boolean
    ) => {
        updateDrugUsageBatch(classKey, drug, { [field]: value });
    };

    const isClassSelected = (classKey: string) =>
        (formData.antibiotic_classes || []).includes(classKey);

    const isDrugSelected = (classKey: string, drug: string) =>
        (formData.antibiotic_details?.[classKey]?.drugs || []).includes(drug);

    const getDrugUsage = (classKey: string, drug: string) =>
        formData.antibiotic_details?.[classKey]?.usage?.[drug] ||
        { start_date: '', end_date: '', second_use: false };

    // Check if a class is selected but has no drugs selected
    const hasNoDrugsSelected = (classKey: string) => {
        if (!isClassSelected(classKey)) return false;
        const drugs = formData.antibiotic_details?.[classKey]?.drugs || [];
        return drugs.length === 0;
    };

    return (
        <div>
            <div className="form-section">
                <h3 className="form-section-title">Antibiotic Use (抗生素使用)</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    選擇使用的抗生素類別，再選擇具體藥物並填寫使用期間
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {ANTIBIOTIC_CLASSES.map(abClass => (
                        <div
                            key={abClass.key}
                            style={{
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Class Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0.75rem 1rem',
                                    background: isClassSelected(abClass.key) ? 'var(--color-primary-light)' : 'var(--bg-primary)',
                                    cursor: 'pointer',
                                    borderLeft: hasNoDrugsSelected(abClass.key) ? '4px solid var(--color-danger)' : 'none'
                                }}
                                onClick={() => toggleClass(abClass.key)}
                            >
                                <input
                                    type="checkbox"
                                    checked={isClassSelected(abClass.key)}
                                    onChange={() => { }}
                                    style={{ marginRight: '0.75rem' }}
                                />
                                <span style={{ flex: 1, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {abClass.name}
                                    {hasNoDrugsSelected(abClass.key) && (
                                        <span style={{
                                            color: 'var(--color-danger)',
                                            fontSize: '0.875rem',
                                            fontWeight: 600
                                        }}>
                                            ⚠️ 未選擇藥物
                                        </span>
                                    )}
                                </span>
                                {isClassSelected(abClass.key) && (
                                    expandedClasses.includes(abClass.key)
                                        ? <ChevronUp size={18} />
                                        : <ChevronDown size={18} />
                                )}
                            </div>

                            {/* Drugs Section */}
                            {isClassSelected(abClass.key) && (
                                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                                        選擇使用的藥物:
                                    </p>

                                    {/* Warning if no drugs selected */}
                                    {hasNoDrugsSelected(abClass.key) && (
                                        <div style={{
                                            padding: '0.75rem',
                                            marginBottom: '1rem',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid var(--color-danger)',
                                            borderRadius: 'var(--border-radius)',
                                            color: 'var(--color-danger)',
                                            fontSize: '0.875rem',
                                            fontWeight: 500
                                        }}>
                                            ⚠️ 請至少選擇一種藥物
                                        </div>
                                    )}

                                    <div className="checkbox-group" style={{ marginBottom: '1rem' }}>
                                        {abClass.drugs.map(drug => (
                                            <label key={drug} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={isDrugSelected(abClass.key, drug)}
                                                    onChange={() => toggleDrug(abClass.key, drug)}
                                                />
                                                {drug}
                                            </label>
                                        ))}
                                    </div>

                                    {/* Drug Usage Details */}
                                    {abClass.drugs.filter(drug => isDrugSelected(abClass.key, drug)).map(drug => {
                                        const usage = getDrugUsage(abClass.key, drug);
                                        return (
                                            <div
                                                key={drug}
                                                style={{
                                                    background: 'var(--bg-primary)',
                                                    padding: '1rem',
                                                    borderRadius: 'var(--border-radius)',
                                                    marginBottom: '0.75rem'
                                                }}
                                            >
                                                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>{drug}</h4>

                                                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                    <label className="form-label required">使用期間 (Start ~ End)</label>
                                                    <div>
                                                        <DatePicker
                                                            selectsRange={true}
                                                            startDate={parseDate(usage.start_date || '')}
                                                            endDate={parseDate(usage.end_date || '')}
                                                            onChange={(update) => {
                                                                const [start, end] = update || [null, null];
                                                                updateDrugUsageBatch(abClass.key, drug, {
                                                                    start_date: formatDate(start),
                                                                    end_date: formatDate(end)
                                                                });
                                                            }}
                                                            shouldCloseOnSelect={false}
                                                            className="form-input"
                                                            placeholderText="請選擇使用期間"
                                                            dateFormat="yyyy/MM/dd"
                                                            isClearable={true}
                                                            wrapperClassName="w-full"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                    <label className="form-label">Second Use?</label>
                                                    <div className="radio-group">
                                                        <label className="radio-label">
                                                            <input
                                                                type="radio"
                                                                checked={usage.second_use === true}
                                                                onChange={() => updateDrugUsage(abClass.key, drug, 'second_use', true)}
                                                            />
                                                            Yes
                                                        </label>
                                                        <label className="radio-label">
                                                            <input
                                                                type="radio"
                                                                checked={usage.second_use === false}
                                                                onChange={() => updateDrugUsage(abClass.key, drug, 'second_use', false)}
                                                            />
                                                            No
                                                        </label>
                                                    </div>
                                                </div>

                                                {usage.second_use && (
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label required">第二次使用期間 (Start ~ End)</label>
                                                        <div>
                                                            <DatePicker
                                                                selectsRange={true}
                                                                startDate={parseDate(usage.second_start_date || '')}
                                                                endDate={parseDate(usage.second_end_date || '')}
                                                                onChange={(update) => {
                                                                    const [start, end] = update || [null, null];
                                                                    updateDrugUsageBatch(abClass.key, drug, {
                                                                        second_start_date: formatDate(start),
                                                                        second_end_date: formatDate(end)
                                                                    });
                                                                }}
                                                                shouldCloseOnSelect={false}
                                                                className="form-input"
                                                                placeholderText="請選擇第二次使用期間"
                                                                dateFormat="yyyy/MM/dd"
                                                                isClearable={true}
                                                                wrapperClassName="w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
