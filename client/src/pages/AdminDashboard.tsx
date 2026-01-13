
import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { FileText, Download, Trash2, Edit, AlertCircle, X, Filter, ArrowUp, ArrowDown, Plus, Check, XCircle } from 'lucide-react';
import { API_URL } from '../App';
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
}

interface DeleteRequest {
    id: number;
    submission_id: number;
    medical_record_number: string;
    admission_date: string;
    requester_username: string;
    requester_hospital: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reject_reason?: string;
    request_reason?: string;
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

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'submissions' | 'delete-requests'>('submissions');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { refreshPendingDeleteCount } = useOutletContext<{ refreshPendingDeleteCount: () => void }>();

    // Read URL params to switch tabs
    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'delete-requests') {
            setActiveTab('delete-requests');
        }
    }, [location.search]);

    // Filter states
    const [admissionStartDate, setAdmissionStartDate] = useState('');
    const [admissionEndDate, setAdmissionEndDate] = useState('');
    const [cultureStartDate, setCultureStartDate] = useState('');
    const [cultureEndDate, setCultureEndDate] = useState('');
    const [filterHospital, setFilterHospital] = useState('');
    const [filterPathogens, setFilterPathogens] = useState<string[]>([]);
    const [filterMRN, setFilterMRN] = useState('');
    const [sortField, setSortField] = useState<string>('updated_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to new updates first generally
        }
    };

    useEffect(() => {
        // Reset specific states when tab changes if needed
        setError('');

        const fetchData = async () => {
            if (activeTab === 'submissions') await fetchSubmissions();
            else if (activeTab === 'delete-requests') await fetchDeleteRequests();
        };
        fetchData();
    }, [activeTab]);

    // Fetch delete requests count on mount (to show correct tab badge)
    useEffect(() => {
        fetchDeleteRequestsCount();
    }, []);

    const fetchDeleteRequestsCount = async () => {
        try {
            const res = await fetch(`${API_URL}/delete-requests`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setDeleteRequests(data);
            }
        } catch {
            // Silently fail - just for count display
        }
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/forms`, { credentials: 'include' });
            if (!res.ok) throw new Error('取得資料失敗');
            const data = await res.json();
            setSubmissions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    const fetchDeleteRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/delete-requests`, { credentials: 'include' });
            if (!res.ok) throw new Error('取得删除申請失敗');
            const data = await res.json();
            setDeleteRequests(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDelete = async (id: number) => {
        if (!confirm('確定要核准此删除申請？資料將永久删除。')) return;
        try {
            const res = await fetch(`${API_URL}/delete-requests/${id}/approve`, {
                method: 'PUT',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('操作失敗');

            // Refresh counts and current view
            fetchDeleteRequests();
            if (activeTab === 'submissions') fetchSubmissions();
            refreshPendingDeleteCount();
        } catch (err) {
            alert(err instanceof Error ? err.message : '操作失敗');
        }
    };

    const handleRejectDelete = async (id: number) => {
        const reason = prompt('請輸入拒絕理由（可留空）：');
        if (reason === null) return; // User cancelled
        try {
            const res = await fetch(`${API_URL}/delete-requests/${id}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason })
            });
            if (!res.ok) throw new Error('操作失敗');
            fetchDeleteRequests();
            refreshPendingDeleteCount();
        } catch (err) {
            alert(err instanceof Error ? err.message : '操作失敗');
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
        filterHospital || filterPathogens.length > 0 || filterMRN;

    // Clear all filters
    const clearAllFilters = () => {
        setAdmissionStartDate('');
        setAdmissionEndDate('');
        setCultureStartDate('');
        setCultureEndDate('');
        setFilterHospital('');
        setFilterPathogens([]);
        setFilterMRN('');
    };

    const handleExportCSV = async () => {
        try {
            const res = await fetch(`${API_URL}/export/csv`, { credentials: 'include' });
            if (!res.ok) throw new Error('匯出失敗');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mhar-bsi-all-data-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err instanceof Error ? err.message : '匯出失敗');
        }
    };

    const handleDeleteSubmission = async (id: number) => {
        if (!confirm('確定要刪除此筆資料嗎？')) return;
        try {
            const res = await fetch(`${API_URL}/forms/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('刪除失敗');
            setSubmissions(prev => prev.filter(s => s.id !== id));
            setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        } catch (err) {
            alert(err instanceof Error ? err.message : '刪除失敗');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`確定要刪除這 ${selectedIds.size} 筆資料嗎？`)) return;
        try {
            const ids = Array.from(selectedIds);
            await Promise.all(ids.map(id =>
                fetch(`${API_URL}/forms/${id}`, { method: 'DELETE', credentials: 'include' })
            ));
            setSubmissions(prev => prev.filter(s => !selectedIds.has(s.id)));
            setSelectedIds(new Set());
        } catch (err) {
            alert(err instanceof Error ? err.message : '刪除失敗');
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredSubmissions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredSubmissions.map(s => s.id)));
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>管理員儀表板</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {activeTab === 'submissions' && (
                        <>
                            <button className="btn btn-secondary" onClick={handleExportCSV}>
                                <Download size={18} />
                                匯出全部 CSV
                            </button>
                        </>
                    )}
                    <Link to="/form" className="btn btn-primary">
                        <Plus size={18} />
                        新增表單
                    </Link>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    className={`btn ${activeTab === 'submissions' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('submissions')}
                >
                    <FileText size={18} />
                    所有表單 ({submissions.length})
                </button>
                <button
                    className={`btn ${activeTab === 'delete-requests' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('delete-requests')}
                >
                    <Trash2 size={18} />
                    刪除表單 ({deleteRequests.length})
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            ) : activeTab === 'submissions' ? (
                <>
                    {/* Filter Section */}
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                            {/* Line 1: Hospital, MRN, Clear button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Filter size={18} color="var(--text-muted)" />
                                    <span style={{ fontWeight: 500 }}>篩選條件:</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ color: 'var(--text-secondary)' }}>醫院：</label>
                                    <select
                                        className="form-select"
                                        value={filterHospital}
                                        onChange={e => setFilterHospital(e.target.value)}
                                        style={{ width: 'auto', minWidth: '120px' }}
                                    >
                                        <option value="">全部醫院</option>
                                        {HOSPITALS.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ color: 'var(--text-secondary)' }}>病歷號：</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={filterMRN}
                                        onChange={e => setFilterMRN(e.target.value)}
                                        placeholder="搜尋..."
                                        style={{ width: 'auto', minWidth: '100px', maxWidth: '150px' }}
                                    />
                                </div>

                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        顯示 {filteredSubmissions.length} / {submissions.length} 筆
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

                    {/* Submissions Table */}
                    <div className="card">
                        {/* Bulk delete button above table */}
                        {selectedIds.size > 0 && (
                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button className="btn btn-danger" onClick={handleBulkDelete} style={{ fontSize: '0.9rem' }}>
                                    <Trash2 size={16} />
                                    多筆一次刪除 ({selectedIds.size})
                                </button>
                                <button className="btn btn-warning" onClick={() => setSelectedIds(new Set())} style={{ fontSize: '0.9rem' }}>
                                    <X size={16} />
                                    取消複選
                                </button>
                            </div>
                        )}
                        {filteredSubmissions.length === 0 ? (
                            <div className="empty-state">
                                <FileText className="empty-state-icon" />
                                <h3>{submissions.length === 0 ? '尚無表單記錄' : '無符合條件的記錄'}</h3>
                                {submissions.length > 0 && (
                                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                        請調整篩選條件
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">

                                    <thead>
                                        <tr>
                                            <th style={{ width: '30px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th style={{ minWidth: '50px', textAlign: 'left', verticalAlign: 'middle', paddingLeft: '0.5rem' }}>修改</th>
                                            <th onClick={() => handleSort('record_time')} style={{ cursor: 'pointer', minWidth: '60px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div>紀錄編號 {sortField === 'record_time' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}</div>
                                                <div style={{ fontSize: '0.75em', fontWeight: 'normal' }}>(建立時間)</div>
                                            </th>
                                            <th onClick={() => handleSort('pathogen')} style={{ cursor: 'pointer', minWidth: '50px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                菌種 {sortField === 'pathogen' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('medical_record_number')} style={{ cursor: 'pointer', minWidth: '50px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                病歷號 {sortField === 'medical_record_number' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('admission_date')} style={{ cursor: 'pointer', minWidth: '55px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                住院日期 {sortField === 'admission_date' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('positive_culture_date')} style={{ cursor: 'pointer', minWidth: '55px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                陽性日期 {sortField === 'positive_culture_date' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('username')} style={{ cursor: 'pointer', minWidth: '45px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                填寫者 {sortField === 'username' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('hospital')} style={{ cursor: 'pointer', minWidth: '60px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                                                醫院 {sortField === 'hospital' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('data_status')} style={{ cursor: 'pointer', minWidth: '50px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                                                狀態 {sortField === 'data_status' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer', minWidth: '65px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                最後更新時間 {sortField === 'updated_at' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('update_count')} style={{ cursor: 'pointer', minWidth: '45px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                更新次數 {sortField === 'update_count' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSubmissions.map(sub => (
                                            <tr key={sub.id}>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(sub.id)}
                                                        onChange={() => toggleSelect(sub.id)}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'left', verticalAlign: 'middle', paddingLeft: '0.5rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-start', width: '100%' }}>
                                                        <Link to={`/form/${sub.id}`} className="btn btn-icon" title="修改">
                                                            <Edit size={16} color="var(--color-primary)" />
                                                        </Link>
                                                        <button className="btn btn-icon" onClick={() => handleDeleteSubmission(sub.id)} title="刪除">
                                                            <Trash2 size={16} color="var(--color-danger)" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8em', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
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
                                                    <span className={`badge ${sub.data_status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                                                        {sub.data_status === 'complete' ? '已完成' : '未完成'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div>{new Date(sub.updated_at).toLocaleDateString('zh-TW')}</div>
                                                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                                        {new Date(sub.updated_at).toLocaleTimeString('zh-TW', { hour12: false })}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <span className="badge badge-secondary" style={{ backgroundColor: '#f0f0f0', color: '#666' }}>
                                                        {sub.update_count || 1} 次
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                // Delete Requests Table
                <div className="card">
                    {deleteRequests.length === 0 ? (
                        <div className="empty-state">
                            <Trash2 className="empty-state-icon" />
                            <h3>暫無待審核的刪除申請</h3>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                當使用者申請刪除資料時，會顯示在這裡
                            </p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>紀錄編號</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>病歷號</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>住院日期</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>申請原因</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>申請者</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>醫院</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>申請時間</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>狀態</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>拒絕原因</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>動作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deleteRequests.map(req => (
                                        <tr key={req.id}>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.85em', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                                {req.status === 'approved' ? (
                                                    ((req as any).record_time as string)?.replace(/[-T:]/g, '') || '-'
                                                ) : (
                                                    <Link to={`/form/${req.submission_id}`} style={{ textDecoration: 'none', color: 'var(--color-primary)' }}>
                                                        {((req as any).record_time as string)?.replace(/[-T:]/g, '') || '-'}
                                                    </Link>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{req.medical_record_number}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{req.admission_date}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', maxWidth: '150px', whiteSpace: 'normal', fontSize: '0.9rem', color: '#444' }}>
                                                {req.request_reason || <span style={{ color: '#aaa', fontStyle: 'italic' }}>無</span>}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{req.requester_username}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className="badge badge-info">{req.requester_hospital}</span>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {new Date(req.created_at + (req.created_at.includes('Z') ? '' : 'Z')).toLocaleString('zh-TW', { hour12: false })}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {req.status === 'pending' && (
                                                    <span className="badge badge-warning">待審核</span>
                                                )}
                                                {req.status === 'approved' && (
                                                    <span className="badge badge-success">已刪除</span>
                                                )}
                                                {req.status === 'rejected' && (
                                                    <span className="badge badge-danger">已拒絕</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', maxWidth: '150px' }}>
                                                {req.status === 'rejected' ? (
                                                    <span style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>
                                                        {req.reject_reason || '-'}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {req.status === 'pending' ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={() => handleApproveDelete(req.id)}
                                                            title="核准刪除"
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                                        >
                                                            <Check size={14} />
                                                            核准
                                                        </button>
                                                        <button
                                                            className="btn btn-danger"
                                                            onClick={() => handleRejectDelete(req.id)}
                                                            title="拒絕"
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                                        >
                                                            <XCircle size={14} />
                                                            拒絕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div >
    );
}
