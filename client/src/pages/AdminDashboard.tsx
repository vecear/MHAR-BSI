import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Trash2, Edit, AlertCircle, X, Filter, ArrowUp, ArrowDown, Upload, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submissionService, exportService, userService } from '../services/firestore';
import type { Submission } from '../services/firestore';
import CsvUpload from '../components/CsvUpload';
import DualDateRangePicker from '../components/DualDateRangePicker';

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
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [pendingUserCount, setPendingUserCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    useEffect(() => {
        if (user) {
            fetchSubmissions();
            userService.countPending().then(setPendingUserCount);
        }
    }, [user]);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const data = await submissionService.getAll(undefined, true);
            setSubmissions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '發生錯誤');
        } finally {
            setLoading(false);
        }
    };

    // Filter submissions
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const cultureDate = (sub.form_data?.positive_culture_date as string) || '';
            const admissionDate = sub.admission_date || '';

            if (admissionStartDate && admissionDate < admissionStartDate) return false;
            if (admissionEndDate && admissionDate > admissionEndDate) return false;
            if (cultureStartDate && cultureDate < cultureStartDate) return false;
            if (cultureEndDate && cultureDate > cultureEndDate) return false;
            if (filterHospital && sub.hospital !== filterHospital) return false;

            const pathogen = (sub.form_data?.pathogen as string) || '';
            if (filterPathogens.length > 0 && !filterPathogens.includes(pathogen)) return false;
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
                    case 'username': return item.username || '';
                    case 'hospital': return item.hospital || '';
                    case 'data_status': return item.data_status;
                    case 'created_at': return item.created_at?.getTime() || 0;
                    case 'updated_at': return item.updated_at?.getTime() || 0;
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

    const hasActiveFilters = admissionStartDate || admissionEndDate || cultureStartDate || cultureEndDate ||
        filterHospital || filterPathogens.length > 0 || filterMRN;

    const clearAllFilters = () => {
        setAdmissionStartDate('');
        setAdmissionEndDate('');
        setCultureStartDate('');
        setCultureEndDate('');
        setFilterHospital('');
        setFilterPathogens([]);
        setFilterMRN('');
    };

    const handleExportFilteredCSV = async () => {
        try {
            const ids = filteredSubmissions.map(s => s.id);
            const csvContent = await exportService.exportToCSV(ids);
            downloadCSV(csvContent, `mhar-bsi-filtered-${new Date().toISOString().split('T')[0]}.csv`);
        } catch (err) {
            alert(err instanceof Error ? err.message : '匯出失敗');
        }
    };

    const handleExportSelectedCSV = async () => {
        if (selectedIds.size === 0) return;
        try {
            const ids = Array.from(selectedIds);
            const csvContent = await exportService.exportToCSV(ids);
            downloadCSV(csvContent, `mhar-bsi-selected-${new Date().toISOString().split('T')[0]}.csv`);
        } catch (err) {
            alert(err instanceof Error ? err.message : '匯出失敗');
        }
    };

    const downloadCSV = async (content: string, defaultFileName: string) => {
        const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });

        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: defaultFileName,
                    types: [{ description: 'CSV 檔案', accept: { 'text/csv': ['.csv'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                if ((err as Error).name === 'AbortError') return;
            }
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleDeleteSubmission = async (id: string) => {
        if (!confirm('確定要刪除此筆資料嗎？')) return;
        try {
            await submissionService.delete(id);
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
            await Promise.all(ids.map(id => submissionService.delete(id)));
            setSubmissions(prev => prev.filter(s => !selectedIds.has(s.id)));
            setSelectedIds(new Set());
        } catch (err) {
            alert(err instanceof Error ? err.message : '刪除失敗');
        }
    };

    const toggleSelect = (id: string) => {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1>管理員儀表板</h1>
                    {pendingUserCount > 0 && (
                        <button
                            onClick={() => navigate('/users')}
                            className="badge"
                            title="前往審核"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                animation: 'pulse 1.5s infinite',
                                background: 'linear-gradient(90deg, #FF0000, #FF7F00, #eab308, #22c55e, #3b82f6, #a855f7, #ec4899)',
                                color: 'white',
                                border: '2px solid white',
                                fontSize: '1rem',
                                padding: '0.4rem 0.8rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                borderRadius: '9999px'
                            }}
                        >
                            <UserPlus size={18} />
                            開通新成員 ({pendingUserCount})
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <CsvUpload variant="buttons" onUploadComplete={fetchSubmissions} userHospital={user?.hospital || ''} onError={setError} />
                </div>
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
            ) : (
                <>
                    {/* Filter Section */}
                    <div className="card filter-section" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
                        <div className="filter-content">
                            {/* Line 1: Hospital, MRN, Clear button */}
                            <div className="filter-row filter-row-main">
                                <div className="filter-group filter-label">
                                    <Filter size={18} color="var(--text-muted)" />
                                    <span style={{ fontWeight: 500 }}>篩選條件:</span>
                                </div>
                                <div className="filter-group">
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

                                <div className="filter-group">
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

                                <div className="filter-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleExportFilteredCSV}
                                        disabled={filteredSubmissions.length === 0}
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', marginRight: '0.5rem' }}
                                    >
                                        <Upload size={14} style={{ marginRight: '4px' }} />
                                        {hasActiveFilters ? '匯出篩選表單' : '匯出表單'}
                                    </button>
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
                            <div className="filter-row filter-row-dates">
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
                            <div className="filter-row filter-row-pathogens">
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
                        {selectedIds.size > 0 && (
                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button className="btn btn-success" onClick={handleExportSelectedCSV} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Upload size={16} />
                                    匯出勾選 ({selectedIds.size})
                                </button>
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
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{`${sub.username || ''}|${sub.hospital || ''}`}</td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {(() => {
                                                        const displayHospital = (sub.form_data?.hospital as string) || sub.hospital || '';
                                                        const hConfig = HOSPITAL_CONFIG[displayHospital] || HOSPITAL_CONFIG[sub.hospital || ''];
                                                        return (
                                                            <span className="badge" style={{ backgroundColor: hConfig?.bg || '#f0f0f0', color: hConfig?.text || '#666' }}>
                                                                {displayHospital}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <span className={`badge ${['complete', 'completed', '完成'].includes(sub.data_status?.toLowerCase() || '') ? 'badge-success' : 'badge-warning'}`}>
                                                        {['complete', 'completed', '完成'].includes(sub.data_status?.toLowerCase() || '') ? '已完成' : '未完成'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div>{sub.updated_at?.toLocaleDateString('zh-TW') || '-'}</div>
                                                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                                        {sub.updated_at?.toLocaleTimeString('zh-TW', { hour12: false }) || ''}
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
            )}
        </div>
    );
}
