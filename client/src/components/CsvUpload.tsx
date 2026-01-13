import { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, AlertCircle, Check, ClipboardList } from 'lucide-react';
import { API_URL } from '../App';

// Options for one-hot encoding columns
const PRIMARY_SOURCES = ['Lung', 'Blood', 'Wound', 'GI', 'Urine', 'CLABSI'];
const CHRONIC_DISEASES = [
    'MI', 'HCVD', 'OLD CVA', 'Dementia', 'Liver Cirrhosis',
    'Diabetes Mellitus', 'Renal disease', 'Autoimmune',
    'Leukemia', 'Lymphoma', 'Solid Tumor', 'AIDS',
    'COPD', 'Connective tissue disease', 'PUD', 'None'
];

// Boolean fields to transform Yes->1, No->0 for import
const BOOLEAN_FIELDS = [
    'thrombocytopenia', 'icu_at_onset', 'septic_shock',
    'infection_control', 'poly_microbial', 'clinical_response_14days',
    'negative_bc'
];

// Antibiotic list for export columns (Must match FormStep3/export.js)
const ANTIBIOTIC_DRUGS = [
    'Amikacin', 'Gentamicin', 'Tobramycin',
    'Meropenem', 'Imipenem', 'Ertapenem', 'Doripenem',
    'Ceftriaxone', 'Cefepime', 'Ceftazidime', 'Cefazolin',
    'Levofloxacin', 'Ciprofloxacin', 'Moxifloxacin',
    'Colistin', 'Polymyxin B',
    'Tigecycline',
    'Piperacillin-Tazobactam', 'Ampicillin-Sulbactam', 'Ceftazidime-Avibactam', 'Ceftolozane-Tazobactam',
    'Trimethoprim-Sulfamethoxazole',
    'Fosfomycin', 'Aztreonam'
];

// CSV 欄位定義（對應表單欄位）- 不包含 hospital，因使用者醫院由系統帶入
const CSV_HEADERS = [
    'username',
    'hospital',
    'record_time',
    'medical_record_number',
    'admission_date',
    'name',
    'recorded_by',
    'sex',
    'age',
    'bw',
    'pathogen',
    'positive_culture_date',
    // Split Primary Source
    'primary_source', // Legacy/Header placeholder
    ...PRIMARY_SOURCES.map(opt => `ps_${opt}`),
    'type_of_infection',
    // Split Chronic Diseases
    'chronic_diseases', // Legacy/Header placeholder
    ...CHRONIC_DISEASES.map(opt => `cd_${opt.replace(/\s+/g, '_')}`),
    'thrombocytopenia',
    'icu_at_onset',
    'duration_before_bacteremia',
    'renal_function_admission',
    'sofa_score',
    'septic_shock',
    'renal_function_bacteremia',
    'mic_ampicillin',
    'mic_cefazolin',
    'mic_gentamicin',
    'mic_amikacin',
    'mic_trimeth_sulfame',
    'mic_piperacillin_taz',
    'mic_cefuroxime',
    'mic_ceftriaxone',
    'mic_meropenem',
    'mic_doripenem',
    'mic_imipenem',
    'mic_ertapenem',
    'mic_cefepime',
    'mic_tigecycline',
    'mic_levofloxacin',
    'mic_colistin',
    'mic_flomoxef',
    'mic_cefoperazo_sulba',
    'mic_caz_avibactam',
    'mic_ceftolozane',
    'antibiotic_classes',
    'antibiotic_details',
    ...ANTIBIOTIC_DRUGS.map(drug => `ab_${drug.replace(/[\s\/-]/g, '_')}`),
    'infection_control',
    'crude_mortality',
    'poly_microbial',
    'hospital_stay_days',
    'clinical_response_14days',
    'negative_bc',
    'remarks',
    'data_status'
];

const CSV_HEADER_LABELS: Record<string, string> = {
    'username': '帳號',
    'hospital': '醫院',
    'record_time': '紀錄時間(YYYY-MM-DDTHH:MM)',
    'medical_record_number': '病歷號',
    'admission_date': '住院日期(YYYY-MM-DD)',
    'name': '姓名',
    'recorded_by': '紀錄者',
    'sex': '性別(M/F)',
    'age': '年齡',
    'bw': '體重(kg)',
    'pathogen': '病原菌',
    'positive_culture_date': '陽性培養日期(YYYY-MM-DD)',
    // Label for column
    'primary_source': 'Primary Source',
    ...PRIMARY_SOURCES.reduce((acc, opt) => ({ ...acc, [`ps_${opt}`]: `${opt} (Yes=1, No=0)` }), {}),
    'type_of_infection': '感染類型',
    // Label for column
    'chronic_diseases': 'Chronic Diseases',
    ...CHRONIC_DISEASES.reduce((acc, opt) => ({ ...acc, [`cd_${opt.replace(/\s+/g, '_')}`]: `${opt} (Yes=1, No=0)` }), {}),
    'thrombocytopenia': 'Thrombocytopenia (Yes=1, No=0)',
    'icu_at_onset': 'ICU at Bacteremia Onset (Yes=1, No=0)',
    'duration_before_bacteremia': '菌血症前天數',
    'renal_function_admission': '入院腎功能',
    'sofa_score': 'SOFA分數',
    'septic_shock': 'Septic Shock (Yes=1, No=0)',
    'renal_function_bacteremia': '菌血症時腎功能',
    'mic_ampicillin': 'MIC_AMPICILLIN',
    'mic_cefazolin': 'MIC_CEFAZOLIN',
    'mic_gentamicin': 'MIC_GENTAMICIN',
    'mic_amikacin': 'MIC_AMIKACIN',
    'mic_trimeth_sulfame': 'MIC_TRIMETH/SULFAME',
    'mic_piperacillin_taz': 'MIC_PIPERACILLIN-TAZ',
    'mic_cefuroxime': 'MIC_CEFUROXIME',
    'mic_ceftriaxone': 'MIC_CEFTRIAXONE',
    'mic_meropenem': 'MIC_MEROPENEM',
    'mic_doripenem': 'MIC_DORIPENEM',
    'mic_imipenem': 'MIC_IMIPENEM',
    'mic_ertapenem': 'MIC_ERTAPENEM',
    'mic_cefepime': 'MIC_CEFEPIME',
    'mic_tigecycline': 'MIC_TIGECYCLINE',
    'mic_levofloxacin': 'MIC_LEVOFLOXACIN',
    'mic_colistin': 'MIC_COLISTIN',
    'mic_flomoxef': 'MIC_FLOMOXEF',
    'mic_cefoperazo_sulba': 'MIC_CEFOPERAZO/SULBA',
    'mic_caz_avibactam': 'MIC_CAZ/Avibactam',
    'mic_ceftolozane': 'MIC_CEFTOLOZANE',
    'antibiotic_classes': 'Antibiotic Classes',
    'antibiotic_details': 'Antibiotic Details',
    ...ANTIBIOTIC_DRUGS.reduce((acc, drug) => ({ ...acc, [`ab_${drug.replace(/[\s\/-]/g, '_')}`]: drug }), {}),
    'infection_control': 'Infection Control Measure (Yes=1, No=0)',
    'crude_mortality': '粗死亡率',
    'poly_microbial': 'Poly Microbial (Yes=1, No=0)',
    'hospital_stay_days': '住院天數',
    'clinical_response_14days': 'Clinical Response at 14 days (Yes=1, No=0)',
    'negative_bc': 'Negative b/c During Treatment (Yes=1, No=0)',
    'remarks': '備註',
    'data_status': '狀態'
};

// 藥物對應類別 Map (for import)
const DRUG_CLASS_MAP: Record<string, string> = {
    'Amikacin': 'aminoglycoside',
    'Gentamicin': 'aminoglycoside',
    'Tobramycin': 'aminoglycoside',
    'Meropenem': 'carbapenem',
    'Imipenem': 'carbapenem',
    'Ertapenem': 'carbapenem',
    'Doripenem': 'carbapenem',
    'Ceftriaxone': 'cephalosporin',
    'Cefepime': 'cephalosporin',
    'Ceftazidime': 'cephalosporin',
    'Cefazolin': 'cephalosporin',
    'Levofloxacin': 'fluoroquinolone',
    'Ciprofloxacin': 'fluoroquinolone',
    'Moxifloxacin': 'fluoroquinolone',
    'Colistin': 'polymyxin',
    'Polymyxin B': 'polymyxin',
    'Tigecycline': 'tigecycline',
    'Piperacillin-Tazobactam': 'beta_lactam',
    'Ampicillin-Sulbactam': 'beta_lactam',
    'Ceftazidime-Avibactam': 'beta_lactam',
    'Ceftolozane-Tazobactam': 'beta_lactam',
    'Trimethoprim-Sulfamethoxazole': 'sulfonamide',
    'Fosfomycin': 'other',
    'Aztreonam': 'other'
};

// 範例資料 - 不包含 hospital
const SAMPLE_DATA = [
    'user1',
    '左營總院',
    '2026-01-15T09:30',
    'A123456789',
    '2026-01-15',
    '王小明',
    '張醫師',
    'M',
    '65',
    '70',
    'Escherichia coli',
    '2026-01-16',
    'Urinary tract',
    'Community-acquired',
    'Diabetes|Hypertension',
    'No',
    'No',
    '5',
    'Normal',
    '4',
    'No',
    'Normal',
    '<=1',
    '<=2',
    '<=2',
    '<=2',
    '<=20',
    '<=4',
    '<=4',
    '<=1',
    '<=1',
    '<=1',
    '<=1',
    '<=0.5',
    '<=1',
    '<=0.5',
    '<=0.25',
    '<=0.5',
    '<=0.5',
    '<=1',
    '<=0.5',
    '<=0.5',
    'aminoglycoside|carbapenem',
    'Gentamicin (2026-01-16 ~ 2026-01-20) | Meropenem (2026-01-20 ~ 2026-01-25)',
    'Resolved',
    'No',
    'No',
    '14',
    'Improved',
    'Yes',
    ''
];

interface UploadResult {
    success: number;
    failed: number;
    errors: string[];
}

interface CsvUploadProps {
    onUploadComplete?: () => void;
    onError?: (message: string) => void;
    userHospital: string;
    variant?: 'card' | 'buttons';
}

const CSV_HEADER_ALIASES: Record<string, string[]> = {
    'username': ['Submitted By', 'username'],
    'hospital': ['User Hospital', 'user_hospital', 'Hospital'],
    'record_time': ['Record Time', 'record_time'],
    'medical_record_number': ['Medical Record Number', 'medical_record_number'],
    'admission_date': ['Admission Date', 'admission_date'],
    'name': ['Name', 'name'],
    'recorded_by': ['Recorded By', 'recorded_by'],
    'sex': ['Sex', 'sex'],
    'age': ['Age', 'age'],
    'bw': ['BW', 'bw'],
    'pathogen': ['Pathogen', 'pathogen'],
    'positive_culture_date': ['Positive Culture Date', 'positive_culture_date'],
    'primary_source': ['Primary Source', 'primary_source'],
    ...PRIMARY_SOURCES.reduce((acc, opt) => ({
        ...acc,
        [`ps_${opt}`]: [opt, `ps_${opt}`] // Map "Lung" and "ps_Lung" to key "ps_Lung"
    }), {}),
    'type_of_infection': ['Type of Infection', 'type_of_infection'],
    'chronic_diseases': ['Chronic Diseases', 'chronic_diseases'],
    ...CHRONIC_DISEASES.reduce((acc, opt) => ({
        ...acc,
        [`cd_${opt.replace(/\s+/g, '_')}`]: [opt, `cd_${opt.replace(/\s+/g, '_')}`]
    }), {}),
    'thrombocytopenia': ['Thrombocytopenia', 'thrombocytopenia'],
    'icu_at_onset': ['ICU at Bacteremia Onset', 'icu_at_onset'],
    'duration_before_bacteremia': ['Duration before Bacteremia (days)', 'duration_before_bacteremia'],
    'renal_function_admission': ['Renal function at admission (Cr)', 'renal_function_admission'],
    'sofa_score': ['SOFA Score', 'sofa_score'],
    'septic_shock': ['Septic Shock', 'septic_shock'],
    'renal_function_bacteremia': ['Renal function at bacteremia', 'renal_function_bacteremia'],
    'mic_ampicillin': ['MIC_AMPICILLIN'],
    'mic_cefazolin': ['MIC_CEFAZOLIN'],
    'mic_gentamicin': ['MIC_GENTAMICIN'],
    'mic_amikacin': ['MIC_AMIKACIN'],
    'mic_trimeth_sulfame': ['MIC_TRIMETH/SULFAME'],
    'mic_piperacillin_taz': ['MIC_PIPERACILLIN-TAZ'],
    'mic_cefuroxime': ['MIC_CEFUROXIME'],
    'mic_ceftriaxone': ['MIC_CEFTRIAXONE'],
    'mic_meropenem': ['MIC_MEROPENEM'],
    'mic_doripenem': ['MIC_DORIPENEM'],
    'mic_imipenem': ['MIC_IMIPENEM'],
    'mic_ertapenem': ['MIC_ERTAPENEM'],
    'mic_cefepime': ['MIC_CEFEPIME'],
    'mic_tigecycline': ['MIC_TIGECYCLINE'],
    'mic_levofloxacin': ['MIC_LEVOFLOXACIN'],
    'mic_colistin': ['MIC_COLISTIN'],
    'mic_flomoxef': ['MIC_FLOMOXEF'],
    'mic_cefoperazo_sulba': ['MIC_CEFOPERAZO/SULBA'],
    'mic_caz_avibactam': ['MIC_CAZ/Avibactam'],
    'mic_ceftolozane': ['MIC_CEFTOLOZANE'],
    'antibiotic_classes': ['Antibiotic Classes', 'antibiotic_classes'],
    'antibiotic_details': ['Antibiotic Details', 'antibiotic_details'],
    ...ANTIBIOTIC_DRUGS.reduce((acc, drug) => ({
        ...acc,
        [`ab_${drug.replace(/[\s\/-]/g, '_')}`]: [drug, `ab_${drug.replace(/[\s\/-]/g, '_')}`]
    }), {}),
    'infection_control': ['Infection Control Measure', 'infection_control'],
    'crude_mortality': ['Crude Mortality', 'crude_mortality'],
    'poly_microbial': ['Poly Microbial', 'poly_microbial'],
    'hospital_stay_days': ['Hospital Stay after Bacteremia (days)', 'hospital_stay_days'],
    'clinical_response_14days': ['Clinical Response at 14 days', 'clinical_response_14days'],
    'negative_bc': ['Negative b/c During Treatment', 'negative_bc'],
    'remarks': ['Remarks', 'remarks'],
    'data_status': ['Data Status', 'data_status', 'Status', '狀態']
};

export default function CsvUpload({ onUploadComplete, onError, userHospital, variant = 'card' }: CsvUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 下載 CSV 範本
    const downloadTemplate = async () => {
        // 使用 BOM 讓 Excel 正確識別 UTF-8
        const BOM = '\uFEFF';
        const headerRow = CSV_HEADERS.map(h => CSV_HEADER_LABELS[h] || h).join(',');
        const sampleRow = SAMPLE_DATA.map(v => `"${v}"`).join(',');
        const csvContent = BOM + headerRow + '\n' + sampleRow;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const defaultFileName = 'MHAR-BSI_範本.csv';

        // 嘗試使用 File System Access API 顯示「另存為」對話框
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: defaultFileName,
                    types: [{
                        description: 'CSV 檔案',
                        accept: { 'text/csv': ['.csv'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                // 使用者取消或 API 失敗，fallback 到傳統方式
                if ((err as Error).name === 'AbortError') return;
            }
        }

        // Fallback: 傳統下載方式
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 解析 CSV (支援引號處理)
    const parseCSV = (text: string): string[][] => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        return lines.map(line => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        // 處理 escaped quotes ""
                        current += '"';
                        i++; // 跳過下一個引號
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current);

            // Post-process to trim and removing surrounding quotes
            return result.map(val => {
                let v = val.trim();
                // If it was fully quoted, strip quotes
                if (v.startsWith('"') && v.endsWith('"')) {
                    v = v.slice(1, -1).replace(/""/g, '"');
                }
                return v;
            });
        });
    };

    // 處理上傳
    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');
        setResult(null);

        try {
            const text = await file.text();
            const rows = parseCSV(text);

            if (rows.length < 2) {
                throw new Error('CSV 檔案至少需要標題列和一筆資料');
            }

            // 處理標題列 (去除 BOM 和空白)
            const headers = rows[0].map(h => h.trim().replace(/^\uFEFF/, ''));
            const headerMap = new Map<string, number>();
            headers.forEach((h, i) => headerMap.set(h, i));

            // 跳過標題列
            const dataRows = rows.slice(1);
            const results: UploadResult = { success: 0, failed: 0, errors: [] };

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                if (row.length < 2 || !row[0]) continue; // 跳過空行

                try {
                    const formData: Record<string, any> = {};
                    let ownerUsername = '';

                    // Helper to find column index
                    const findColIndex = (key: string) => {
                        // 1. Try key directly
                        if (headerMap.has(key)) return headerMap.get(key);
                        // 2. Try Label (Chinese)
                        const label = CSV_HEADER_LABELS[key];
                        if (label && headerMap.has(label)) return headerMap.get(label);
                        // 3. Try Aliases (English etc)
                        const aliases = CSV_HEADER_ALIASES[key];
                        if (aliases) {
                            for (const alias of aliases) {
                                if (headerMap.has(alias)) return headerMap.get(alias);
                            }
                        }
                        return undefined;
                    };

                    // 嘗試從 'username' 相關欄位獲取
                    const usernameIdx = findColIndex('username');
                    if (usernameIdx !== undefined) ownerUsername = row[usernameIdx];

                    CSV_HEADERS.forEach((key) => {
                        // Skip special handling fields in basic loop
                        if (key === 'username' || key === 'hospital') return;

                        // Skip dynamic columns here (handled inside primary_source/chronic_diseases logic)
                        if (key.startsWith('ps_') || key.startsWith('cd_') || key.startsWith('ab_')) return;

                        const colIndex = findColIndex(key);
                        let value = '';
                        if (colIndex !== undefined && row[colIndex]) {
                            value = row[colIndex];
                        }

                        // 處理多選欄位（用 | 或 , 分隔）
                        if (key === 'primary_source') {
                            // 1. Try legacy single column
                            if (value) {
                                formData[key] = value.split(/[|,]/).map(v => v.trim()).filter(v => v);
                            } else {
                                // 2. Try reconstruction from 1/0 columns
                                const selected: string[] = [];
                                PRIMARY_SOURCES.forEach(opt => {
                                    const psKey = `ps_${opt}`;
                                    const psIdx = findColIndex(psKey);
                                    if (psIdx !== undefined) {
                                        const optVal = row[psIdx]?.trim();
                                        if (optVal === '1' || optVal?.toLowerCase() === 'yes' || optVal?.toLowerCase() === 'true') {
                                            selected.push(opt);
                                        }
                                    }
                                });
                                // Only update if we found something or initialized
                                if (selected.length > 0) formData[key] = selected;
                            }
                        }
                        else if (key === 'chronic_diseases') {
                            if (value) {
                                formData[key] = value.split(/[|,]/).map(v => v.trim()).filter(v => v);
                            } else {
                                const selected: string[] = [];
                                CHRONIC_DISEASES.forEach(opt => {
                                    const cdKey = `cd_${opt.replace(/\s+/g, '_')}`;
                                    const cdIdx = findColIndex(cdKey);
                                    if (cdIdx !== undefined) {
                                        const optVal = row[cdIdx]?.trim();
                                        if (optVal === '1' || optVal?.toLowerCase() === 'yes' || optVal?.toLowerCase() === 'true') {
                                            selected.push(opt);
                                        }
                                    }
                                });
                                if (selected.length > 0) formData[key] = selected;
                            }
                        }
                        else if (key === 'antibiotic_classes') {
                            formData[key] = value ? value.split(/[|,]/).map(v => v.trim()).filter(v => v) : [];
                        }
                        // MIC Data Handling
                        else if (key.startsWith('mic_')) {
                            if (!formData.mic_data) formData.mic_data = {};
                            if (value) {
                                // Extract key from header mic_key
                                // FormStep2 uses the exact suffix as key (e.g. 'ampicillin', 'trimeth_sulfame')
                                // export.js creates headers like mic_ampicillin, mic_trimeth_sulfame
                                // So we just strip 'mic_' to get the correct internal key
                                let drugKey = key.replace('mic_', '');
                                formData.mic_data[drugKey] = value;
                            }
                        }
                        // Antibiotic Details Parser
                        else if (key === 'antibiotic_details') {
                            if (value) {
                                const details: Record<string, any> = {};
                                const segments = value.split('|').map(s => s.trim());

                                // Ensure antibiotic_classes array exists
                                if (!formData.antibiotic_classes) {
                                    formData.antibiotic_classes = [];
                                }

                                segments.forEach(segment => {
                                    // Parse: "Drug (Start ~ End)" or "Drug (Start ~ End; Start2 ~ End2)"
                                    const match = segment.match(/^(.*?) \((.*?) ~ (.*?)\)(?:; (.*?) ~ (.*?))?$/);
                                    if (match) {
                                        const drugName = match[1];
                                        const start1 = match[2];
                                        const end1 = match[3];
                                        const start2 = match[4];
                                        const end2 = match[5];

                                        const drugClass = DRUG_CLASS_MAP[drugName];
                                        if (drugClass) {
                                            // Auto-add class to top-level list to ensure visibility
                                            if (!formData.antibiotic_classes.includes(drugClass)) {
                                                formData.antibiotic_classes.push(drugClass);
                                            }

                                            if (!details[drugClass]) {
                                                details[drugClass] = { drugs: [], usage: {} };
                                            }

                                            if (!details[drugClass].drugs.includes(drugName)) {
                                                details[drugClass].drugs.push(drugName);
                                            }

                                            details[drugClass].usage[drugName] = {
                                                start_date: start1 === '?' ? '' : start1,
                                                end_date: end1 === '?' ? '' : end1,
                                                second_use: !!start2,
                                                second_start_date: start2 === '?' ? '' : start2,
                                                second_end_date: end2 === '?' ? '' : end2
                                            };
                                        }
                                    }
                                });
                                formData.antibiotic_details = details;
                            } else {
                                formData.antibiotic_details = {};
                            }
                        }
                        // Antibiotic Independent Columns Import
                        else if (key === 'antibiotic_classes') { // Just a placeholder check to allow injecting logic once per row
                            // Reconstruct Antibiotics from ab_ columns
                            if (!formData.antibiotic_details) formData.antibiotic_details = {};
                            if (!formData.antibiotic_classes) formData.antibiotic_classes = [];

                            const details = formData.antibiotic_details;

                            ANTIBIOTIC_DRUGS.forEach(drug => {
                                const colKey = `ab_${drug.replace(/[\s\/-]/g, '_')}`;
                                const colIdx = findColIndex(colKey);
                                let val = '';
                                if (colIdx !== undefined && row[colIdx]) {
                                    val = row[colIdx].trim();
                                }

                                // Clean up value (remove potential tab from Excel fix)
                                val = val.replace(/^\t/, '');

                                if (val && val !== '0') {
                                    // Found a used antibiotic
                                    const drugClass = DRUG_CLASS_MAP[drug];
                                    if (drugClass) {
                                        // Add class
                                        if (!formData.antibiotic_classes.includes(drugClass)) {
                                            formData.antibiotic_classes.push(drugClass);
                                        }

                                        // Initialize class details
                                        if (!details[drugClass]) {
                                            details[drugClass] = { drugs: [], usage: {} };
                                        }
                                        if (!details[drugClass].drugs.includes(drug)) {
                                            details[drugClass].drugs.push(drug);
                                        }

                                        // Parse Dates: "Start ~ End" or "Start ~ End; Start2 ~ End2"
                                        const parts = val.split(';').map(p => p.trim());
                                        const [firstUse, secondUse] = parts;

                                        const [start1, end1] = firstUse ? firstUse.split('~').map(d => d.trim()) : ['', ''];

                                        let usageObj = {
                                            start_date: start1 || '',
                                            end_date: end1 || '',
                                            second_use: false,
                                            second_start_date: '',
                                            second_end_date: ''
                                        };

                                        if (secondUse) {
                                            const [start2, end2] = secondUse.split('~').map(d => d.trim());
                                            usageObj.second_use = true;
                                            usageObj.second_start_date = start2 || '';
                                            usageObj.second_end_date = end2 || '';
                                        }

                                        details[drugClass].usage[drug] = usageObj;
                                    }
                                }
                            });

                            formData.antibiotic_details = details;

                            // Check if regular parsing found anything, if not, allow this to stand. 
                            // If regular parsing (antibiotic_details column) also ran, it might overwrite or be overwritten.
                            // But usually we prefer the granular columns if they exist.
                            // Since this block runs when key is 'antibiotic_classes', and loop runs in order...
                            // Actually, 'antibiotic_details' comes AFTER 'antibiotic_classes' in standard CSV_HEADERS.
                            // So 'antibiotic_details' block might overwrite this if the summary column exists and is parsed.
                            // To be safe, we should merge or prioritized granular columns.
                            // Let's rely on granular columns logic to be smart enough.
                        }
                        // Boolean Fields Import (1 -> Yes, 0 -> No)
                        else if (BOOLEAN_FIELDS.includes(key)) {
                            if (value === '1') formData[key] = 'Yes';
                            else if (value === '0') formData[key] = 'No';
                            else formData[key] = value; // Keep original if Yes/No or other
                        }
                        else {
                            formData[key] = value;
                        }
                    });

                    // 額外處理 hospital
                    const hospitalIdx = findColIndex('hospital');
                    if (hospitalIdx !== undefined && row[hospitalIdx]) {
                        formData.hospital = row[hospitalIdx];
                    }

                    // Normalize status
                    const rawStatus = (formData.data_status || '').toString().trim().toLowerCase();
                    const status = ['complete', 'completed', '完成'].includes(rawStatus) ? 'complete' : 'incomplete';

                    // 發送到後端
                    const payload: any = {
                        medical_record_number: formData.medical_record_number,
                        admission_date: formData.admission_date,
                        form_data: formData,
                        data_status: status
                    };

                    // 如果有 username，傳給後端 (後端會檢查是否為 admin)
                    if (ownerUsername) {
                        payload.owner_username = ownerUsername;
                    }

                    const res = await fetch(`${API_URL}/forms`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || '儲存失敗');
                    }

                    results.success++;
                } catch (err) {
                    results.failed++;
                    results.errors.push(`第 ${i + 2} 行: ${err instanceof Error ? err.message : '未知錯誤'}`);
                }
            }

            setResult(results);
            if (results.success > 0 && onUploadComplete) {
                onUploadComplete();
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : '上傳失敗';
            setError(msg);
            if (onError) onError(msg);
        } finally {
            setUploading(false);
            // 重設 input 以允許重複上傳同一檔案
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (variant === 'buttons') {
        return (
            <>
                <button className="btn btn-secondary" onClick={downloadTemplate} title="下載 CSV 範本">
                    <ClipboardList size={18} />
                    下載範本
                </button>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }} title="上傳 CSV">
                    <Download size={18} />
                    {uploading ? '...' : '匯入'}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                    />
                </label>
            </>
        );
    }

    return (
        <div className="csv-upload-section">
            <div className="csv-upload-header">
                <FileSpreadsheet size={24} />
                <div>
                    <h3>CSV 批次匯入</h3>
                    <p>下載範本、使用 Excel 編輯後上傳</p>
                </div>
            </div>

            <div className="csv-upload-actions">
                <button className="btn btn-secondary" onClick={downloadTemplate}>
                    <Download size={18} />
                    下載 CSV 範本
                </button>

                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <Upload size={18} />
                    {uploading ? '上傳中...' : '上傳 CSV'}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {result && (
                <div className={`alert ${result.failed > 0 ? 'alert-warning' : 'alert-success'}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: result.errors.length > 0 ? '8px' : 0 }}>
                        {result.failed > 0 ? <AlertCircle size={18} /> : <Check size={18} />}
                        <span>成功匯入 {result.success} 筆，失敗 {result.failed} 筆</span>
                    </div>
                    {result.errors.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '24px', fontSize: '0.875rem' }}>
                            {result.errors.slice(0, 5).map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                            {result.errors.length > 5 && (
                                <li>...還有 {result.errors.length - 5} 個錯誤</li>
                            )}
                        </ul>
                    )}
                </div>
            )}

            <div className="csv-upload-tips">
                <strong>使用說明：</strong>
                <ol>
                    <li>點擊「下載 CSV 範本」獲取範本檔案</li>
                    <li>使用 Excel 或其他試算表軟體開啟編輯</li>
                    <li>填寫完成後另存為 CSV 格式</li>
                    <li>點擊「上傳 CSV」匯入資料</li>
                </ol>
                <p><strong>注意：</strong>多選欄位（如感染來源、慢性疾病）請使用 | 符號分隔多個選項</p>
            </div>
        </div>
    );
}
