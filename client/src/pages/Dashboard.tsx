import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Trash2, Plus, AlertCircle, Filter, X, ArrowUp, ArrowDown, Edit } from 'lucide-react';
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

// Generate years from 2020 to 2100
const YEARS = Array.from({ length: 81 }, (_, i) => 2020 + i);
const MONTHS = [
    { value: '', label: '全部月份' },
    { value: '01', label: '1月' },
    { value: '02', label: '2月' },
    { value: '03', label: '3月' },
    { value: '04', label: '4月' },
    { value: '05', label: '5月' },
    { value: '06', label: '6月' },
    { value: '07', label: '7月' },
    { value: '08', label: '8月' },
    { value: '09', label: '9月' },
    { value: '10', label: '10月' },
    { value: '11', label: '11月' },
    { value: '12', label: '12月' }
];

export default function Dashboard() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState<string>('');
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

            if (filterYear && !cultureDate.startsWith(filterYear)) {
                return false;
            }
            if (filterMonth && filterYear) {
                const monthPart = cultureDate.substring(5, 7);
                if (monthPart !== filterMonth) {
                    return false;
                }
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
    }, [submissions, filterYear, filterMonth, sortField, sortDirection]);

    const handleExportCSV = async () => {
        try {
            const res = await fetch(`${API_URL}/export/csv`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('匯出失敗');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mhar-bsi-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err instanceof Error ? err.message : '匯出失敗');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('確定要刪除此筆資料嗎？')) return;

        try {
            const res = await fetch(`${API_URL}/forms/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('刪除失敗');
            setSubmissions(submissions.filter(s => s.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : '刪除失敗');
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
                    <button className="btn btn-secondary" onClick={handleExportCSV}>
                        <Download size={18} />
                        匯出 CSV
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

            {/* CSV 批次匯入區塊 */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <CsvUpload onUploadComplete={fetchSubmissions} userHospital={user?.hospital || ''} />
            </div>

            {/* Filter Section */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={18} color="var(--text-muted)" />
                        <span style={{ fontWeight: 500 }}>篩選條件 (陽性日期)：</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)' }}>年份：</label>
                        <select
                            className="form-select"
                            value={filterYear}
                            onChange={e => {
                                setFilterYear(e.target.value);
                                if (!e.target.value) setFilterMonth('');
                            }}
                            style={{ width: 'auto', minWidth: '100px' }}
                        >
                            <option value="">全部年份</option>
                            {YEARS.map(year => (
                                <option key={year} value={year}>{year}年</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)' }}>月份：</label>
                        <select
                            className="form-select"
                            value={filterMonth}
                            onChange={e => setFilterMonth(e.target.value)}
                            disabled={!filterYear}
                            style={{ width: 'auto', minWidth: '100px' }}
                        >
                            {MONTHS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                    {(filterYear || filterMonth) && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setFilterYear('');
                                setFilterMonth('');
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
