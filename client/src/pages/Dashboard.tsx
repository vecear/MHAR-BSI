import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Upload, Trash2, Plus, AlertCircle, Filter, X, ArrowUp, ArrowDown, Edit } from 'lucide-react';
import { API_URL, useAuth } from '../App';
import CsvUpload from '../components/CsvUpload';

interface Submission {
    id: number;
    medical_record_number: string;
    admission_date: string;
    form_data: Record<string, unknown>;
    data_status: string;
    created_at: string;
    updated_at: string;
    username: string;
    hospital: string;
}



export default function Dashboard() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [sortField, setSortField] = useState<string>('updated_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to new updates first generally
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const res = await fetch(`${API_URL}/forms`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('取得資料失敗');
            const data = await res.json();
            setSubmissions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    // Filter submissions by year and month
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const cultureDate = (sub.form_data?.positive_culture_date as string) || ''; // Format: YYYY-MM-DD

            if (startDate && cultureDate < startDate) {
                return false;
            }
            if (endDate && cultureDate > endDate) {
                return false;
            }
            return true;
        }).sort((a, b) => {
            const aValue = (() => {
                switch (sortField) {
                    case 'medical_record_number': return a.medical_record_number;
                    case 'admission_date': return a.admission_date;
                    case 'positive_culture_date': return (a.form_data?.positive_culture_date as string) || '';
                    case 'data_status': return a.data_status;
                    case 'updated_at': return a.updated_at;
                    default: return '';
                }
            })();
            const bValue = (() => {
                switch (sortField) {
                    case 'medical_record_number': return b.medical_record_number;
                    case 'admission_date': return b.admission_date;
                    case 'positive_culture_date': return (b.form_data?.positive_culture_date as string) || '';
                    case 'data_status': return b.data_status;
                    case 'updated_at': return b.updated_at;
                    default: return '';
                }
            })();

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [submissions, startDate, endDate, sortField, sortDirection]);

    const handleExportCSV = async () => {
        try {
            const res = await fetch(`${API_URL}/export/csv`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('匯出失敗');

            const blob = await res.blob();
            const defaultFileName = `mhar-bsi-export-${new Date().toISOString().split('T')[0]}.csv`;

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
                    if ((err as Error).name === 'AbortError') return;
                }
            }

            // Fallback: 傳統下載方式
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err instanceof Error ? err.message : '匯出失敗');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('確定要申請刪除此筆資料嗎？此申請將送交管理員審核。')) return;

        try {
            const res = await fetch(`${API_URL}/delete-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ submission_id: id })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '申請失敗');
            }

            alert('刪除申請已送出，待管理員審核');
        } catch (err) {
            alert(err instanceof Error ? err.message : '申請失敗');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>我的表單記錄</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <CsvUpload variant="buttons" onUploadComplete={fetchSubmissions} userHospital={user?.hospital || ''} onError={setError} />
                    <button className="btn btn-secondary" onClick={handleExportCSV}>
                        <Upload size={18} />
                        匯出
                    </button>
                    <Link to="/form" className="btn btn-primary">
                        <Plus size={18} />
                        新增表單
                    </Link>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {error}
                </div>
            )}



            {/* Filter Section */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={18} color="var(--text-muted)" />
                        <span style={{ fontWeight: 500 }}>篩選條件 (陽性日期)：</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)' }}>起：</label>
                        <input
                            type="date"
                            className="form-input"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{ width: 'auto' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)' }}>迄：</label>
                        <input
                            type="date"
                            className="form-input"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{ width: 'auto' }}
                        />
                    </div>
                    {(startDate || endDate) && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                            }}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                        >
                            <X size={14} style={{ marginRight: '4px' }} />
                            清除篩選
                        </button>
                    )}
                    <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        顯示 {filteredSubmissions.length} / {submissions.length} 筆
                    </div>
                </div>
            </div>

            {filteredSubmissions.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <FileText className="empty-state-icon" />
                        <h3>{submissions.length === 0 ? '尚無表單記錄' : '無符合條件的記錄'}</h3>
                        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                            {submissions.length === 0 ? '點擊「新增表單」開始填寫' : '請調整篩選條件'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ minWidth: '80px', textAlign: 'left', verticalAlign: 'middle', paddingLeft: '1.5rem' }}>修改</th>
                                    <th onClick={() => handleSort('medical_record_number')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        病歷號 {sortField === 'medical_record_number' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('admission_date')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        住院日期 {sortField === 'admission_date' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('positive_culture_date')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        陽性日期 {sortField === 'positive_culture_date' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('data_status')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        狀態 {sortField === 'data_status' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        更新時間 {sortField === 'updated_at' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubmissions.map(sub => (
                                    <tr key={sub.id}>
                                        <td style={{ textAlign: 'left', verticalAlign: 'middle', paddingLeft: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-start', width: '100%' }}>
                                                <Link
                                                    to={`/form/${sub.id}`}
                                                    className="btn btn-icon"
                                                    title="修改"
                                                >
                                                    <Edit size={16} color="var(--color-primary)" />
                                                </Link>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={() => handleDelete(sub.id)}
                                                    title="刪除"
                                                >
                                                    <Trash2 size={16} color="var(--color-danger)" />
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sub.medical_record_number}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sub.admission_date}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{(sub.form_data?.positive_culture_date as string) || '-'}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <span className={`badge ${sub.data_status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                                                {sub.data_status === 'complete' ? '已完成' : '未完成'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{new Date(sub.updated_at).toLocaleString('zh-TW', { hour12: false })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div >
            )
            }
        </div >
    );
}
