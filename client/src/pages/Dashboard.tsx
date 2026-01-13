import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, Trash2, Plus, AlertCircle, Filter, X, ArrowUp, ArrowDown, Edit, Clock } from 'lucide-react';
import { API_URL, useAuth } from '../App';
import CsvUpload from '../components/CsvUpload';
import DualDateRangePicker from '../components/DualDateRangePicker';

interface Submission {
    id: number;
    medical_record_number: string;
    admission_date: string;
    form_data: Record<string, unknown>;
    data_status: string;
    created_at: string;
    updated_at: string;
    update_count?: number;
    username: string;
    hospital: string;
    has_pending_delete?: number;
}

interface DeleteRequest {
    id: number;
    submission_id: number;
    status: 'pending' | 'approved' | 'rejected';
}

const HOSPITALS = [
    '內湖總院', '松山分院', '澎湖分院', '桃園總院',
    '台中總院', '高雄總院', '左營總院', '花蓮總院'
];

const HOSPITAL_CONFIG: Record<string, { bg: string; text: string }> = {
    '內湖總院': { bg: '#dbeafe', text: '#2563eb' },
    '松山分院': { bg: '#dcfce7', text: '#16a34a' },
    '澎湖分院': { bg: '#fef3c7', text: '#d97706' },
    '桃園總院': { bg: '#fce7f3', text: '#db2777' },
    '台中總院': { bg: '#e0e7ff', text: '#4f46e5' },
    '高雄總院': { bg: '#fee2e2', text: '#dc2626' },
    '左營總院': { bg: '#f3e8ff', text: '#9333ea' },
    '花蓮總院': { bg: '#ccfbf1', text: '#0d9488' }
};

const PATHOGEN_CONFIG = [
    { id: 'CRKP', label: 'CRKP', bg: '#fee2e2', text: '#dc2626' },
    { id: 'CRAB', label: 'CRAB', bg: '#f3e8ff', text: '#9333ea' },
    { id: 'CRECOLI', label: 'CRECOLI', bg: '#dbeafe', text: '#2563eb' },
    { id: 'CRPA', label: 'CRPA', bg: '#ffedd5', text: '#ea580c' }
];

export default function Dashboard() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [admissionStartDate, setAdmissionStartDate] = useState<string>('');
    const [admissionEndDate, setAdmissionEndDate] = useState<string>('');
    const [cultureStartDate, setCultureStartDate] = useState<string>('');
    const [cultureEndDate, setCultureEndDate] = useState<string>('');
    const [filterHospital, setFilterHospital] = useState('');
    const [filterPathogens, setFilterPathogens] = useState<string[]>([]);
    const [filterMRN, setFilterMRN] = useState('');
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
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchSubmissions(), fetchDeleteRequests()]);
            setLoading(false);
        };
        loadData();
    }, []);

    // Lock hospital filter if user has a hospital
    useEffect(() => {
        if (user?.hospital) {
            setFilterHospital(user.hospital);
        }
    }, [user]);

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
        }
    };

    const fetchDeleteRequests = async () => {
        try {
            const res = await fetch(`${API_URL}/delete-requests`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setDeleteRequests(data);
            }
        } catch (err) {
            console.error('Error fetching delete requests', err);
        }
    };

    // Filter submissions
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const cultureDate = (sub.form_data?.positive_culture_date as string) || '';
            const admissionDate = sub.admission_date || '';

            // Admission date filter
            if (admissionStartDate && admissionDate < admissionStartDate) return false;
            if (admissionEndDate && admissionDate > admissionEndDate) return false;

            // Positive culture date filter
            if (cultureStartDate && cultureDate < cultureStartDate) return false;
            if (cultureEndDate && cultureDate > cultureEndDate) return false;

            if (filterHospital && sub.hospital !== filterHospital) return false;

            const pathogen = (sub.form_data?.pathogen as string) || '';
            if (filterPathogens.length > 0 && !filterPathogens.includes(pathogen)) return false;

            // Medical record number search (case-insensitive partial match)
            if (filterMRN && !sub.medical_record_number.toLowerCase().includes(filterMRN.toLowerCase())) return false;

            return true;
        }).sort((a, b) => {
            const getValue = (item: Submission) => {
                switch (sortField) {
                    case 'record_time': return (item.form_data?.record_time as string) || '';
                    case 'pathogen': return (item.form_data?.pathogen as string) || '';
                    case 'medical_record_number': return item.medical_record_number;
                    case 'admission_date': return item.admission_date;
                    case 'positive_culture_date': return (item.form_data?.positive_culture_date as string) || '';
                    case 'username': return item.username;
                    case 'hospital': return item.hospital;
                    case 'data_status': return item.data_status;
                    case 'created_at': return item.created_at;
                    case 'updated_at': return item.updated_at;
                    case 'update_count': return (item.update_count || 0);
                    default: return '';
                }
            };

            const aValue = getValue(a);
            const bValue = getValue(b);

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [submissions, admissionStartDate, admissionEndDate, cultureStartDate, cultureEndDate, filterHospital, filterPathogens, filterMRN, sortField, sortDirection]);

    // Check if any filter is active
    const hasActiveFilters = admissionStartDate || admissionEndDate || cultureStartDate || cultureEndDate ||
        (!user?.hospital && filterHospital) || filterPathogens.length > 0 || filterMRN;

    // Clear all filters
    const clearAllFilters = () => {
        setAdmissionStartDate('');
        setAdmissionEndDate('');
        setCultureStartDate('');
        setCultureEndDate('');
        if (!user?.hospital) setFilterHospital('');
        setFilterPathogens([]);
        setFilterMRN('');
    };

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
        const reason = prompt('請輸入刪除申請的原因（必填）：');
        if (reason === null) return; // User cancelled
        if (!reason.trim()) {
            alert('請輸入原因');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/delete-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    submission_id: id,
                    request_reason: reason
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '申請失敗');
            }

            alert('刪除申請已送出，待管理員審核');
            await fetchSubmissions(); // Refresh to update has_pending_delete status
            fetchDeleteRequests(); // Refresh delete requests list
        } catch (err) {
            alert(err instanceof Error ? err.message : '申請失敗');
        }
    };

    const getStatusBadge = (status: string) => {
        const isComplete = status === 'complete';
        return (
            <span className={`badge ${isComplete ? 'badge-success' : 'badge-warning'}`}>
                {isComplete ? '已完成' : '未完成'}
            </span>
        );
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    {/* Line 1: Hospital, MRN, Clear button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 'fit-content' }}>
                            <Filter size={18} color="var(--text-muted)" />
                            <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>篩選條件:</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>醫院：</label>
                            {user?.hospital ? (
                                <span className="badge badge-info" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                    {user.hospital}
                                </span>
                            ) : (
                                <select
                                    className="form-select"
                                    value={filterHospital}
                                    onChange={e => setFilterHospital(e.target.value)}
                                    style={{ width: 'auto', minWidth: '100px' }}
                                >
                                    <option value="">全部</option>
                                    {HOSPITALS.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>病歷號：</label>
                            <input
                                type="text"
                                className="form-input"
                                value={filterMRN}
                                onChange={e => setFilterMRN(e.target.value)}
                                placeholder="搜尋..."
                                style={{ width: 'auto', minWidth: '100px', maxWidth: '150px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
                            <button
                                className={`btn ${hasActiveFilters ? 'btn-danger' : 'btn-secondary'}`}
                                onClick={clearAllFilters}
                                disabled={!hasActiveFilters}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.9rem',
                                    opacity: hasActiveFilters ? 1 : 0.5,
                                    cursor: hasActiveFilters ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <X size={14} style={{ marginRight: '4px' }} />
                                清除篩選條件
                            </button>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                {filteredSubmissions.length} / {submissions.length} 筆
                            </div>
                        </div>
                    </div>

                    {/* Line 2: Date Filters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingLeft: '1.5rem' }}>
                        <DualDateRangePicker
                            admissionRange={{ start: admissionStartDate, end: admissionEndDate }}
                            cultureRange={{ start: cultureStartDate, end: cultureEndDate }}
                            onAdmissionChange={(range) => {
                                setAdmissionStartDate(range.start);
                                setAdmissionEndDate(range.end);
                            }}
                            onCultureChange={(range) => {
                                setCultureStartDate(range.start);
                                setCultureEndDate(range.end);
                            }}
                        />
                    </div>

                    {/* Line 3: Pathogen Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>菌種：</label>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {PATHOGEN_CONFIG.map(p => {
                                const isChecked = filterPathogens.includes(p.id);
                                return (
                                    <label
                                        key={p.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            cursor: 'pointer',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '6px',
                                            backgroundColor: isChecked ? p.bg : 'transparent',
                                            border: isChecked ? `2px solid ${p.text}` : '2px solid transparent',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                                if (isChecked) {
                                                    setFilterPathogens(filterPathogens.filter(x => x !== p.id));
                                                } else {
                                                    setFilterPathogens([...filterPathogens, p.id]);
                                                }
                                            }}
                                            style={{ accentColor: p.text, width: '16px', height: '16px' }}
                                        />
                                        <span style={{ color: p.text, fontWeight: 500, fontSize: '0.85rem' }}>
                                            {p.label}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
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
                                    <th onClick={() => handleSort('record_time')} style={{ cursor: 'pointer', minWidth: '60px', textAlign: 'center', verticalAlign: 'middle' }}>
                                        <div>紀錄編號 {sortField === 'record_time' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}</div>
                                        <div style={{ fontSize: '0.75em', fontWeight: 'normal' }}>(建立時間)</div>
                                    </th>
                                    <th onClick={() => handleSort('pathogen')} style={{ cursor: 'pointer', minWidth: '50px', textAlign: 'center', verticalAlign: 'middle' }}>
                                        菌種 {sortField === 'pathogen' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('medical_record_number')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        病歷號 {sortField === 'medical_record_number' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('admission_date')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        住院日期 {sortField === 'admission_date' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('positive_culture_date')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        陽性日期 {sortField === 'positive_culture_date' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('username')} style={{ cursor: 'pointer', minWidth: '45px', textAlign: 'center', verticalAlign: 'middle' }}>
                                        填寫者 {sortField === 'username' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('hospital')} style={{ cursor: 'pointer', minWidth: '60px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                                        醫院 {sortField === 'hospital' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('data_status')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        狀態 {sortField === 'data_status' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' }}>
                                        最後更新時間 {sortField === 'updated_at' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                    <th onClick={() => handleSort('update_count')} style={{ cursor: 'pointer', minWidth: '45px', textAlign: 'center', verticalAlign: 'middle' }}>
                                        更新次數 {sortField === 'update_count' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubmissions.map(sub => {
                                    const pendingDelete = deleteRequests.some(r => r.submission_id === sub.id && r.status === 'pending');
                                    return (
                                        <tr key={sub.id}>
                                            <td style={{ textAlign: 'left', verticalAlign: 'middle', paddingLeft: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-start', width: '100%' }}>
                                                    <Link
                                                        to={`/form/${sub.id}`}
                                                        className="btn btn-icon"
                                                        title="修改"
                                                        style={{ opacity: pendingDelete ? 0.5 : 1, pointerEvents: pendingDelete ? 'none' : 'auto' }}
                                                    >
                                                        <Edit size={16} color="var(--color-primary)" />
                                                    </Link>
                                                    {pendingDelete ? (
                                                        <div className="btn btn-icon" title="刪除申請審核中" style={{ cursor: 'help' }}>
                                                            <Clock size={16} color="var(--color-warning)" />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="btn btn-icon"
                                                            onClick={() => handleDelete(sub.id)}
                                                            title="刪除"
                                                        >
                                                            <Trash2 size={16} color="var(--color-danger)" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.85em', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                                {(sub.form_data?.record_time as string)?.replace(/[-T:]/g, '') || '-'}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {(() => {
                                                    const pathogen = (sub.form_data?.pathogen as string) || '';
                                                    const config = PATHOGEN_CONFIG.find(p => p.id === pathogen);

                                                    return pathogen ? (
                                                        <span className="badge" style={{ backgroundColor: config?.bg || '#f0f0f0', color: config?.text || '#666' }}>
                                                            {pathogen}
                                                        </span>
                                                    ) : '-';
                                                })()}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sub.medical_record_number}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sub.admission_date}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{(sub.form_data?.positive_culture_date as string) || '-'}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sub.username}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {(() => {
                                                    const hConfig = HOSPITAL_CONFIG[sub.hospital];
                                                    return (
                                                        <span className="badge" style={{ backgroundColor: hConfig?.bg || '#f0f0f0', color: hConfig?.text || '#666' }}>
                                                            {sub.hospital}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                    {getStatusBadge(sub.data_status)}
                                                    {sub.has_pending_delete === 1 && (
                                                        <span className="badge badge-danger" style={{ fontSize: '0.7em', padding: '2px 6px' }}>
                                                            刪除申請中
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div>{new Date(sub.updated_at + (sub.updated_at.includes('Z') ? '' : 'Z')).toLocaleDateString('zh-TW')}</div>
                                                <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                                    {new Date(sub.updated_at + (sub.updated_at.includes('Z') ? '' : 'Z')).toLocaleTimeString('zh-TW', { hour12: false })}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className="badge badge-secondary" style={{ backgroundColor: '#f0f0f0', color: '#666' }}>
                                                    {sub.update_count || 1} 次
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div >
                </div >
            )
            }
        </div >
    );
}
