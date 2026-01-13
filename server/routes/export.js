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
    { key: 'primary_source', label: 'Primary Source' },
    { key: 'type_of_infection', label: 'Type of Infection' },
    { key: 'chronic_diseases', label: 'Chronic Diseases' },
    { key: 'thrombocytopenia', label: 'Thrombocytopenia' },
    { key: 'icu_at_onset', label: 'ICU at Bacteremia Onset' },
    { key: 'duration_before_bacteremia', label: 'Duration before Bacteremia (days)' },
    { key: 'renal_function_admission', label: 'Renal function at admission (Cr)' },
    { key: 'sofa_score', label: 'SOFA Score' },
    { key: 'septic_shock', label: 'Septic Shock' },
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
    { key: 'antibiotics_used', label: 'Antibiotics Used' },

    // Outcome
    { key: 'infection_control', label: 'Infection Control Measure' },
    { key: 'crude_mortality', label: 'Crude Mortality' },
    { key: 'poly_microbial', label: 'Poly Microbial' },
    { key: 'hospital_stay_days', label: 'Hospital Stay after Bacteremia (days)' },
    { key: 'clinical_response_14days', label: 'Clinical Response at 14 days' },
    { key: 'negative_bc', label: 'Negative b/c During Treatment' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'data_status', label: 'Data Status' },

    // Metadata
    { key: 'username', label: 'Submitted By' },
    { key: 'user_hospital', label: 'User Hospital' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' }
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
        data_status: submission.data_status
    };

    // Flatten all form fields
    if (formData) {
        Object.keys(formData).forEach(key => {
            const value = formData[key];

            // Special handling for mic_data - expand each drug into separate column
            if (key === 'mic_data' && typeof value === 'object' && value !== null) {
                Object.keys(value).forEach(drug => {
                    // Create column name like MIC_AMPICILLIN
                    const colName = `mic_${drug.toLowerCase().replace(/[\/\s-]/g, '_')}`;
                    flat[colName] = value[drug];
                });
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

        // Get all unique keys from data
        const allKeys = new Set();
        flatData.forEach(row => {
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
        const csv = parser.parse(flatData);

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
