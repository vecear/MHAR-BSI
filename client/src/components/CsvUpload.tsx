import { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import { API_URL } from '../App';

// CSV 欄位定義（對應表單欄位）- 不包含 hospital，因使用者醫院由系統帶入
const CSV_HEADERS = [
    'medical_record_number',
    'admission_date',
    'name',
    'recorded_by',
    'sex',
    'age',
    'bw',
    'pathogen',
    'positive_culture_date',
    'primary_source',
    'type_of_infection',
    'chronic_diseases',
    'thrombocytopenia',
    'icu_at_onset',
    'duration_before_bacteremia',
    'renal_function_admission',
    'sofa_score',
    'septic_shock',
    'renal_function_bacteremia',
    'infection_control',
    'crude_mortality',
    'poly_microbial',
    'hospital_stay_days',
    'clinical_response_14days',
    'negative_bc',
    'remarks'
];

const CSV_HEADER_LABELS: Record<string, string> = {
    'medical_record_number': '病歷號',
    'admission_date': '住院日期(YYYY-MM-DD)',
    'name': '姓名',
    'recorded_by': '紀錄者',
    'sex': '性別(M/F)',
    'age': '年齡',
    'bw': '體重(kg)',
    'pathogen': '病原菌',
    'positive_culture_date': '陽性培養日期(YYYY-MM-DD)',
    'primary_source': '感染來源(多選用|分隔)',
    'type_of_infection': '感染類型',
    'chronic_diseases': '慢性疾病(多選用|分隔)',
    'thrombocytopenia': '血小板減少(Yes/No)',
    'icu_at_onset': '發病時在ICU(Yes/No)',
    'duration_before_bacteremia': '菌血症前天數',
    'renal_function_admission': '入院腎功能',
    'sofa_score': 'SOFA分數',
    'septic_shock': '敗血性休克(Yes/No)',
    'renal_function_bacteremia': '菌血症時腎功能',
    'infection_control': '感染控制',
    'crude_mortality': '粗死亡率',
    'poly_microbial': '多重微生物(Yes/No)',
    'hospital_stay_days': '住院天數',
    'clinical_response_14days': '14天臨床反應',
    'negative_bc': '陰性血液培養',
    'remarks': '備註'
};

// 範例資料 - 不包含 hospital
const SAMPLE_DATA = [
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
    userHospital: string;
}

export default function CsvUpload({ onUploadComplete, userHospital }: CsvUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 下載 CSV 範本
    const downloadTemplate = () => {
        // 使用 BOM 讓 Excel 正確識別 UTF-8
        const BOM = '\uFEFF';
        const headerRow = CSV_HEADERS.map(h => CSV_HEADER_LABELS[h] || h).join(',');
        const sampleRow = SAMPLE_DATA.map(v => `"${v}"`).join(',');
        const csvContent = BOM + headerRow + '\n' + sampleRow;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'MHAR-BSI_範本.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 解析 CSV
    const parseCSV = (text: string): string[][] => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        return lines.map(line => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
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

            // 跳過標題列
            const dataRows = rows.slice(1);
            const results: UploadResult = { success: 0, failed: 0, errors: [] };

            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                if (row.length < 2 || !row[0]) continue; // 跳過空行

                try {
                    const formData: Record<string, any> = {};

                    CSV_HEADERS.forEach((header, index) => {
                        let value = row[index] || '';

                        // 處理多選欄位（用 | 分隔）
                        if (header === 'primary_source' || header === 'chronic_diseases') {
                            formData[header] = value ? value.split('|').map(v => v.trim()) : [];
                        } else {
                            formData[header] = value;
                        }
                    });

                    // 發送到後端 - 強制使用使用者的醫院
                    formData.hospital = userHospital;

                    const res = await fetch(`${API_URL}/forms`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            medical_record_number: formData.medical_record_number,
                            admission_date: formData.admission_date,
                            form_data: formData,
                            data_status: 'incomplete'
                        })
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
            setError(err instanceof Error ? err.message : '上傳失敗');
        } finally {
            setUploading(false);
            // 重設 input 以允許重複上傳同一檔案
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

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
