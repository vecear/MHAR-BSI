import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

    const updateDrugUsage = (
        classKey: string,
        drug: string,
        field: string,
        value: string | boolean
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
                        [drug]: { ...drugUsage, [field]: value }
                    }
                }
            }
        });
    };

    const isClassSelected = (classKey: string) =>
        (formData.antibiotic_classes || []).includes(classKey);

    const isDrugSelected = (classKey: string, drug: string) =>
        (formData.antibiotic_details?.[classKey]?.drugs || []).includes(drug);

    const getDrugUsage = (classKey: string, drug: string) =>
        formData.antibiotic_details?.[classKey]?.usage?.[drug] ||
        { start_date: '', end_date: '', second_use: false };

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
                                    cursor: 'pointer'
                                }}
                                onClick={() => toggleClass(abClass.key)}
                            >
                                <input
                                    type="checkbox"
                                    checked={isClassSelected(abClass.key)}
                                    onChange={() => { }}
                                    style={{ marginRight: '0.75rem' }}
                                />
                                <span style={{ flex: 1, fontWeight: 500 }}>{abClass.name}</span>
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

                                                <div className="form-grid-2">
                                                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                        <label className="form-label">Start Date</label>
                                                        <input
                                                            type="date"
                                                            className="form-input"
                                                            value={usage.start_date || ''}
                                                            onChange={e => updateDrugUsage(abClass.key, drug, 'start_date', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                        <label className="form-label">End Date</label>
                                                        <input
                                                            type="date"
                                                            className="form-input"
                                                            value={usage.end_date || ''}
                                                            onChange={e => updateDrugUsage(abClass.key, drug, 'end_date', e.target.value)}
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
                                                    <div className="form-grid-2">
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Second Start Date</label>
                                                            <input
                                                                type="date"
                                                                className="form-input"
                                                                value={usage.second_start_date || ''}
                                                                onChange={e => updateDrugUsage(abClass.key, drug, 'second_start_date', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Second End Date</label>
                                                            <input
                                                                type="date"
                                                                className="form-input"
                                                                value={usage.second_end_date || ''}
                                                                onChange={e => updateDrugUsage(abClass.key, drug, 'second_end_date', e.target.value)}
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
