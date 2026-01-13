const express = require('express');
const { Parser } = require('json2csv');
const { submissionQueries } = require('../db/database');

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '未登入' });
    }
    next();
};

// Define all form fields for CSV export
const formFields = [
    // Basic Info
    { key: 'medical_record_number', label: '病歷號' },
    { key: 'admission_date', label: 'Admission Date' },
    { key: 'name', label: 'Name' },
    { key: 'recorded_by', label: 'Recorded By' },
    { key: 'sex', label: 'Sex' },
    { key: 'age', label: 'Age' },
    { key: 'bw', label: 'BW' },
    { key: 'hospital', label: 'Hospital' },
    { key: 'pathogen', label: 'Pathogen' },
    { key: 'positive_culture_date', label: 'Positive Culture Date' },

    // Primary Source (Split into 1/0 columns)
    { key: 'primary_source', label: 'Primary Source' }, // Header column
    { key: 'ps_Lung', label: 'Lung (Yes=1, No=0)' },
    { key: 'ps_Blood', label: 'Blood (Yes=1, No=0)' },
    { key: 'ps_Wound', label: 'Wound (Yes=1, No=0)' },
    { key: 'ps_GI', label: 'GI (Yes=1, No=0)' },
    { key: 'ps_Urine', label: 'Urine (Yes=1, No=0)' },
    { key: 'ps_CLABSI', label: 'CLABSI (Yes=1, No=0)' },

    { key: 'type_of_infection', label: 'Type of Infection' },

    // Chronic Diseases (Split into 1/0 columns)
    { key: 'chronic_diseases', label: 'Chronic Diseases' }, // Header column
    { key: 'cd_MI', label: 'MI (Yes=1, No=0)' },
    { key: 'cd_HCVD', label: 'HCVD (Yes=1, No=0)' },
    { key: 'cd_OLD_CVA', label: 'OLD CVA (Yes=1, No=0)' },
    { key: 'cd_Dementia', label: 'Dementia (Yes=1, No=0)' },
    { key: 'cd_Liver_Cirrhosis', label: 'Liver Cirrhosis (Yes=1, No=0)' },
    { key: 'cd_Diabetes_Mellitus', label: 'Diabetes Mellitus (Yes=1, No=0)' },
    { key: 'cd_Renal_disease', label: 'Renal disease (Yes=1, No=0)' },
    { key: 'cd_Autoimmune', label: 'Autoimmune (Yes=1, No=0)' },
    { key: 'cd_Leukemia', label: 'Leukemia (Yes=1, No=0)' },
    { key: 'cd_Lymphoma', label: 'Lymphoma (Yes=1, No=0)' },
    { key: 'cd_Solid_Tumor', label: 'Solid Tumor (Yes=1, No=0)' },
    { key: 'cd_AIDS', label: 'AIDS (Yes=1, No=0)' },
    { key: 'cd_COPD', label: 'COPD (Yes=1, No=0)' },
    { key: 'cd_Connective_tissue_disease', label: 'Connective tissue disease (Yes=1, No=0)' },
    { key: 'cd_PUD', label: 'PUD (Yes=1, No=0)' },
    { key: 'cd_None', label: 'None (Yes=1, No=0)' },

    { key: 'thrombocytopenia', label: 'Thrombocytopenia (Yes=1, No=0)' },
    { key: 'icu_at_onset', label: 'ICU at Bacteremia Onset (Yes=1, No=0)' },
    { key: 'duration_before_bacteremia', label: 'Duration before Bacteremia (days)' },
    { key: 'renal_function_admission', label: 'Renal function at admission (Cr)' },
    { key: 'sofa_score', label: 'SOFA Score' },
    { key: 'septic_shock', label: 'Septic Shock (Yes=1, No=0)' },
    { key: 'renal_function_bacteremia', label: 'Renal function at bacteremia' },

    // MIC Data - will be expanded dynamically
    { key: 'mic_ampicillin', label: 'MIC_AMPICILLIN' },
    { key: 'mic_cefazolin', label: 'MIC_CEFAZOLIN' },
    { key: 'mic_gentamicin', label: 'MIC_GENTAMICIN' },
    { key: 'mic_amikacin', label: 'MIC_AMIKACIN' },
    { key: 'mic_trimeth_sulfame', label: 'MIC_TRIMETH/SULFAME' },
    { key: 'mic_piperacillin_taz', label: 'MIC_PIPERACILLIN-TAZ' },
    { key: 'mic_cefuroxime', label: 'MIC_CEFUROXIME' },
    { key: 'mic_ceftriaxone', label: 'MIC_CEFTRIAXONE' },
    { key: 'mic_meropenem', label: 'MIC_MEROPENEM' },
    { key: 'mic_doripenem', label: 'MIC_DORIPENEM' },
    { key: 'mic_imipenem', label: 'MIC_IMIPENEM' },
    { key: 'mic_ertapenem', label: 'MIC_ERTAPENEM' },
    { key: 'mic_cefepime', label: 'MIC_CEFEPIME' },
    { key: 'mic_tigecycline', label: 'MIC_TIGECYCLINE' },
    { key: 'mic_levofloxacin', label: 'MIC_LEVOFLOXACIN' },
    { key: 'mic_colistin', label: 'MIC_COLISTIN' },
    { key: 'mic_flomoxef', label: 'MIC_FLOMOXEF' },
    { key: 'mic_cefoperazo_sulba', label: 'MIC_CEFOPERAZO/SULBA' },
    { key: 'mic_caz_avibactam', label: 'MIC_CAZ/Avibactam' },
    { key: 'mic_ceftolozane', label: 'MIC_CEFTOLOZANE' },

    // Antibiotic Use (simplified - full data in JSON)
    // Antibiotic Use
    { key: 'antibiotic_classes', label: 'Antibiotic Classes' },
    { key: 'antibiotic_details', label: 'Antibiotic Details' },

    // Outcome
    { key: 'infection_control', label: 'Infection Control Measure (Yes=1, No=0)' },
    { key: 'crude_mortality', label: 'Crude Mortality' },
    { key: 'poly_microbial', label: 'Poly Microbial (Yes=1, No=0)' },
    { key: 'hospital_stay_days', label: 'Hospital Stay after Bacteremia (days)' },
    { key: 'clinical_response_14days', label: 'Clinical Response at 14 days (Yes=1, No=0)' },
    { key: 'negative_bc', label: 'Negative b/c During Treatment (Yes=1, No=0)' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'data_status', label: 'Data Status' },

    // Metadata
    { key: 'username', label: 'Submitted By' },
    { key: 'user_hospital', label: 'User Hospital' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' }
];

const PRIMARY_SOURCES = ['Lung', 'Blood', 'Wound', 'GI', 'Urine', 'CLABSI'];
const CHRONIC_DISEASES = [
    'MI', 'HCVD', 'OLD CVA', 'Dementia', 'Liver Cirrhosis',
    'Diabetes Mellitus', 'Renal disease', 'Autoimmune',
    'Leukemia', 'Lymphoma', 'Solid Tumor', 'AIDS',
    'COPD', 'Connective tissue disease', 'PUD', 'None'
];

// Boolean fields to transform Yes->1, No->0
const BOOLEAN_FIELDS = [
    'thrombocytopenia', 'icu_at_onset', 'septic_shock',
    'infection_control', 'poly_microbial', 'clinical_response_14days',
    'negative_bc'
];

// Antibiotic Classes for Export Headers
const ANTIBIOTIC_DRUGS = [
    // Aminoglycoside
    'Amikacin', 'Gentamicin', 'Tobramycin',
    // Carbapenem
    'Meropenem', 'Imipenem', 'Ertapenem', 'Doripenem',
    // Cephalosporin
    'Ceftriaxone', 'Cefepime', 'Ceftazidime', 'Cefazolin',
    // Fluoroquinolone
    'Levofloxacin', 'Ciprofloxacin', 'Moxifloxacin',
    // Polymyxin
    'Colistin', 'Polymyxin B',
    // Tigecycline
    'Tigecycline',
    // Beta-lactam
    'Piperacillin-Tazobactam', 'Ampicillin-Sulbactam', 'Ceftazidime-Avibactam', 'Ceftolozane-Tazobactam',
    // Sulfonamide
    'Trimethoprim-Sulfamethoxazole',
    // Other
    'Fosfomycin', 'Aztreonam'
];

// Flatten form data for CSV
function flattenFormData(submission) {
    const formData = typeof submission.form_data === 'string'
        ? JSON.parse(submission.form_data)
        : submission.form_data;

    const flat = {
        medical_record_number: submission.medical_record_number,
        admission_date: submission.admission_date,
        username: submission.username,
        user_hospital: submission.hospital,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        data_status: submission.data_status,

        // Empty "Header" columns
        primary_source: '',
        chronic_diseases: ''
    };

    // Initialize option columns to 0
    PRIMARY_SOURCES.forEach(opt => flat[`ps_${opt}`] = 0);
    CHRONIC_DISEASES.forEach(opt => {
        // Handle special chars in key if needed (e.g. space -> _)
        const key = `cd_${opt.replace(/\s+/g, '_')}`;
        flat[key] = 0;
    });

    // Initialize Antibiotic Columns to 0
    ANTIBIOTIC_DRUGS.forEach(drug => {
        const key = `ab_${drug.replace(/[\s\/-]/g, '_')}`;
        flat[key] = 0;
    });

    // Flatten all form fields
    if (formData) {
        Object.keys(formData).forEach(key => {
            const value = formData[key];

            // Primary Source One-Hot
            if (key === 'primary_source' && Array.isArray(value)) {
                value.forEach(opt => {
                    // Ensure exact match
                    if (PRIMARY_SOURCES.includes(opt)) {
                        flat[`ps_${opt}`] = 1;
                    }
                });
            }
            // Chronic Diseases One-Hot
            else if (key === 'chronic_diseases' && Array.isArray(value)) {
                value.forEach(opt => {
                    if (CHRONIC_DISEASES.includes(opt)) {
                        const safeKey = `cd_${opt.replace(/\s+/g, '_')}`;
                        flat[safeKey] = 1;
                    }
                });
            }
            // Boolean Fields Transformation
            else if (BOOLEAN_FIELDS.includes(key)) {
                if (value === 'Yes') flat[key] = 1;
                else if (value === 'No') flat[key] = 0;
                else flat[key] = value;
            }
            // Special handling for mic_data - expand each drug into separate column
            else if (key === 'mic_data' && typeof value === 'object' && value !== null) {
                Object.keys(value).forEach(drug => {
                    // Create column name like MIC_AMPICILLIN
                    const colName = `mic_${drug.toLowerCase().replace(/[\/\s-]/g, '_')}`;
                    let val = value[drug];
                    // Prevent Excel from converting fractions (e.g. 8/16) to dates by prepending \t
                    if (typeof val === 'string' && /^\d+[\/-]\d+/.test(val)) {
                        val = `\t${val}`;
                    }
                    flat[colName] = val;
                });
            }
            else if (key === 'antibiotic_details' && typeof value === 'object' && value !== null) {
                // Format antibiotic details into readable string
                const details = [];
                Object.values(value).forEach(cls => {
                    if (cls.usage) {
                        Object.entries(cls.usage).forEach(([drug, usage]) => {
                            // 1. Add to summary string (legacy/readable)
                            let useStr = `${drug} (${usage.start_date || '?'} ~ ${usage.end_date || '?'})`;
                            if (usage.second_use) {
                                useStr += `; ${usage.second_start_date || '?'} ~ ${usage.second_end_date || '?'}`;
                            }
                            details.push(useStr);

                            // 2. Populate specific column
                            if (ANTIBIOTIC_DRUGS.includes(drug)) {
                                const colKey = `ab_${drug.replace(/[\s\/-]/g, '_')}`;
                                let dateRange = `${usage.start_date || ''} ~ ${usage.end_date || ''}`;
                                if (usage.second_use) {
                                    dateRange += `; ${usage.second_start_date || ''} ~ ${usage.second_end_date || ''}`;
                                }
                                flat[colKey] = dateRange;
                            }
                        });
                    }
                });
                flat[key] = details.join(' | ');
            } else if (key === 'antibiotic_classes' && Array.isArray(value)) {
                // Deduplicate classes
                flat[key] = [...new Set(value)].join(', ');
            } else if (Array.isArray(value)) {
                flat[key] = value.join(', ');
            } else if (typeof value === 'object' && value !== null) {
                flat[key] = JSON.stringify(value);
            } else {
                flat[key] = value;
            }
        });
    }

    return flat;
}

// Export CSV
router.get('/csv', requireAuth, (req, res) => {
    try {
        let submissions;
        if (req.session.role === 'admin') {
            submissions = submissionQueries.getAll.all();
        } else {
            submissions = submissionQueries.getAllByUser.all(req.session.userId);
        }

        if (submissions.length === 0) {
            return res.status(404).json({ error: '沒有資料可匯出' });
        }

        // Flatten all submissions
        const flatData = submissions.map(flattenFormData);

        // Apply filters if provided
        const { admission_start, admission_end, culture_start, culture_end, hospital, pathogens, mrn, ids } = req.query;
        let filteredData = flatData;

        console.log('Export Query Params:', req.query);

        if (ids) {
            // Priority filter: if IDs are provided, only export those
            const idList = ids.split(',').map(id => String(id));
            filteredData = flatData.filter(item => {
                // Assuming submission ID is available in the flat data. 
                // Wait, flattenFormData doesn't include 'id'. I need to verify if 'id' is passed to flattenFormData.
                // submissionQueries.getAll returns objects with 'id'.
                // flattenFormData receives 'submission'. 
                // I need to add 'id' to the flat object or access it from somewhere.
                // Let's modify flattenFormData to include 'id' first.
                return false;
            });
            // Re-evaluating: flattenFormData needs to include 'id' or I filtering before flattening?
            // filtering before flattening is more efficient.
        }

        // Better approach: filter `submissions` BEFORE flattening if possible, or filter `flatData` if `id` is added.
        // Let's filter `submissions` array first if `ids` is present, it's cleaner.

        let dataToExport = submissions;

        if (ids) {
            const idList = ids.split(',');
            dataToExport = submissions.filter(s => idList.includes(String(s.id)));
        } else if (admission_start || admission_end || culture_start || culture_end || hospital || pathogens || mrn) {
            // ... existing filter logic applied to flatData later ...
            // But existing logic filters `flatData`.
            // So, let's just use `dataToExport` to generate `flatData`.
        }

        // Flatten whatever data we have
        const flatDataInitial = dataToExport.map(flattenFormData);
        filteredData = flatDataInitial;

        // Apply OTHER filters only if IDs are NOT provided (usually export selected ignores other filters, or intersects? 
        // User said "Export Selected", usually implies "Exactly these". So if IDs are present, skip other filters.)

        if (!ids && (admission_start || admission_end || culture_start || culture_end || hospital || pathogens || mrn)) {
            filteredData = flatDataInitial.filter(item => {
                const admissionDate = item.admission_date || '';
                const cultureDate = item.positive_culture_date || ''; // flattened field
                const pathogen = item.pathogen || '';
                const itemMrn = item.medical_record_number || '';
                const itemHospital = item.user_hospital || ''; // flattened uses user_hospital key

                // Admission Date
                if (admission_start && admissionDate < admission_start) return false;
                if (admission_end && admissionDate > admission_end) return false;

                // Culture Date
                if (culture_start && cultureDate < culture_start) return false;
                if (culture_end && cultureDate > culture_end) return false;

                // Hospital
                if (hospital && itemHospital !== hospital) return false;

                // Pathogens (comma separated)
                if (pathogens) {
                    const pList = pathogens.split(',');
                    // Filter matching: dashboard logic is "array of checked types", if item has one of them -> keep.
                    if (!pList.includes(pathogen)) return false;
                }

                // MRN (partial match)
                if (mrn && !itemMrn.toLowerCase().includes(mrn.toLowerCase())) return false;

                return true;
            });
        }

        console.log(`Export: Total ${flatData.length}, Filtered ${filteredData.length}`);

        if (filteredData.length === 0) {
            return res.status(404).json({ error: '無符合篩選條件的資料可匯出' });
        }

        // Get all unique keys from data
        const allKeys = new Set();
        filteredData.forEach(row => {
            Object.keys(row).forEach(key => allKeys.add(key));
        });

        // Create CSV
        const fields = formFields
            .filter(f => allKeys.has(f.key))
            .map(f => ({ label: f.label, value: f.key }));

        // Add any extra fields not in predefined list
        allKeys.forEach(key => {
            if (!formFields.find(f => f.key === key)) {
                fields.push({ label: key, value: key });
            }
        });

        const parser = new Parser({ fields, withBOM: true });
        const csv = parser.parse(filteredData);

        // Set headers for download
        const filename = `mhar-bsi-export-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(csv);
    } catch (err) {
        console.error('Error exporting CSV:', err);
        res.status(500).json({ error: '匯出失敗' });
    }
});

module.exports = router;
