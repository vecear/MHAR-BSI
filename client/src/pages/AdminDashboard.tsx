
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Trash2, Edit, AlertCircle, Users, X, Filter, ArrowUp, ArrowDown, UserPlus, Plus, Check, XCircle } from 'lucide-react';
import { API_URL } from '../App';

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

interface User {
    id: number;
    username: string;
    hospital: string;
    role: string;
    email?: string;
    display_name?: string;
    gender?: string;
    phone?: string;
    address?: string;
    line_id?: string;
    created_at: string;
}

interface UserFormData {
    username: string;
    password: string;
    hospital: string;
    email: string;
    display_name: string;
    gender: string;
    phone: string;

    address: string;
    line_id: string;
}

const HOSPITALS = [
    '內湖總院', '松山分院', '澎湖分院', '桃園總院',
    '台中總院', '高雄總院', '左營總院', '花蓮總院'
];



const initialUserForm: UserFormData = {
    username: '',
    password: '',
    hospital: HOSPITALS[0],
    email: '',
    display_name: '',
    gender: '',
    phone: '',
    address: '',
    line_id: ''
};

interface DeleteRequest {
    id: number;
    submission_id: number;
    medical_record_number: string;
    admission_date: string;
    requester_username: string;
    requester_hospital: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

const PATHOGEN_CONFIG = [
    { id: 'CRKP', label: 'CRKP', bg: '#fee2e2', text: '#dc2626' },
    { id: 'CRAB', label: 'CRAB', bg: '#f3e8ff', text: '#9333ea' },
    { id: 'CRECOLI', label: 'CRECOLI', bg: '#dbeafe', text: '#2563eb' },
    { id: 'CRPA', label: 'CRPA', bg: '#ffedd5', text: '#ea580c' }
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'submissions' | 'users' | 'delete-requests'>('submissions');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterHospital, setFilterHospital] = useState('');
    const [filterPathogen, setFilterPathogen] = useState('');
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

    // Modal states
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState<UserFormData>(initialUserForm);
    const [savingUser, setSavingUser] = useState(false);

    useEffect(() => {
        // Reset specific states when tab changes if needed
        setError('');

        const fetchData = async () => {
            if (activeTab === 'submissions') await fetchSubmissions();
            else if (activeTab === 'users') await fetchUsers();
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

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users`, { credentials: 'include' });
            if (!res.ok) throw new Error('取得使用者失敗');
            const data = await res.json();
            setUsers(data);
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
        } catch (err) {
            alert(err instanceof Error ? err.message : '操作失敗');
        }
    };

    // Filter submissions
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const cultureDate = (sub.form_data?.positive_culture_date as string) || '';

            if (startDate && cultureDate < startDate) return false;
            if (endDate && cultureDate > endDate) return false;
            if (filterHospital && sub.hospital !== filterHospital) return false;

            const pathogen = (sub.form_data?.pathogen as string) || '';
            if (filterPathogen && pathogen !== filterPathogen) return false;

            return true;
        }).sort((a, b) => {
            const getValue = (item: Submission) => {
                switch (sortField) {
                    case 'medical_record_number': return item.medical_record_number;
                    case 'admission_date': return item.admission_date;
                    case 'positive_culture_date': return (item.form_data?.positive_culture_date as string) || '';
                    case 'username': return item.username;
                    case 'hospital': return item.hospital;
                    case 'data_status': return item.data_status;
                    case 'created_at': return item.created_at;
                    case 'updated_at': return item.updated_at;
                    case 'update_count': return (item.update_count || 0); // numeric comparison works with < >
                    default: return '';
                }
            };

            const aValue = getValue(a);
            const bValue = getValue(b);

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [submissions, startDate, endDate, filterHospital, filterPathogen, sortField, sortDirection]);

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

    const openAddUser = () => {
        setEditingUser(null);
        setUserForm(initialUserForm);
        setShowUserModal(true);
    };

    const openEditUser = (user: User) => {
        setEditingUser(user);
        setUserForm({
            username: user.username,
            password: '',
            hospital: user.hospital,
            email: user.email || '',
            display_name: user.display_name || '',
            gender: user.gender || '',
            phone: user.phone || '',
            address: user.address || '',
            line_id: user.line_id || ''
        });
        setShowUserModal(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingUser(true);
        try {
            if (editingUser) {
                const res = await fetch(`${API_URL}/users/${editingUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        ...userForm,
                        newPassword: userForm.password || undefined
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '更新失敗');
                }
            } else {
                if (!userForm.password) throw new Error('請輸入密碼');
                const res = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(userForm)
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '新增失敗');
                }
            }
            setShowUserModal(false);
            setUserForm(initialUserForm);
            fetchUsers();
        } catch (err) {
            alert(err instanceof Error ? err.message : '儲存失敗');
        } finally {
            setSavingUser(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('確定要刪除此使用者嗎？該使用者的所有表單資料也會一併刪除。')) return;
        try {
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('刪除失敗');
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : '刪除失敗');
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <h1>管理員儀表板</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {activeTab === 'submissions' && (
                        <>
                            {selectedIds.size > 0 && (
                                <button className="btn btn-danger" onClick={handleBulkDelete}>
                                    <Trash2 size={18} />
                                    多筆一次刪除 ({selectedIds.size})
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={handleExportCSV}>
                                <Download size={18} />
                                匯出全部 CSV
                            </button>
                        </>
                    )}
                    {activeTab === 'users' && (
                        <button className="btn btn-primary" onClick={openAddUser}>
                            <UserPlus size={18} />
                            新增使用者
                        </button>
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
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={18} />
                    使用者管理 ({users.length})
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
                            {/* Line 1: Basic Filters */}
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

                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {(startDate || endDate || filterHospital || filterPathogen) && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setStartDate('');
                                                setEndDate('');
                                                setFilterHospital('');
                                                setFilterPathogen('');
                                            }}
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                        >
                                            <X size={14} style={{ marginRight: '4px' }} />
                                            清除篩選
                                        </button>
                                    )}
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        顯示 {filteredSubmissions.length} / {submissions.length} 筆
                                    </div>
                                </div>
                            </div>

                            {/* Line 2: Pathogen Tags */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '2rem' }}>
                                <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>菌種：</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => setFilterPathogen('')}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            border: filterPathogen === '' ? '2px solid var(--color-primary)' : '2px solid transparent',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            transition: 'all 0.2s ease',
                                            boxShadow: filterPathogen === '' ? 'var(--shadow-sm)' : 'none'
                                        }}
                                    >
                                        全部
                                    </button>
                                    {PATHOGEN_CONFIG.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setFilterPathogen(p.id)}
                                            style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.85rem',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                border: filterPathogen === p.id ? `2px solid ${p.text}` : '2px solid transparent',
                                                backgroundColor: p.bg,
                                                color: p.text,
                                                transition: 'all 0.2s ease',
                                                boxShadow: filterPathogen === p.id ? 'var(--shadow-sm)' : 'none',
                                                opacity: filterPathogen && filterPathogen !== p.id ? 0.6 : 1
                                            }}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submissions Table */}
                    <div className="card">
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
                                            <th style={{ minWidth: '60px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div>紀錄編號</div>
                                                <div style={{ fontSize: '0.75em', fontWeight: 'normal' }}>(建立時間)</div>
                                            </th>
                                            <th style={{ minWidth: '50px', textAlign: 'center', verticalAlign: 'middle' }}>菌種</th>
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
                                            <th style={{ minWidth: '45px', textAlign: 'center', verticalAlign: 'middle' }}>
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
                                                    <span className="badge badge-info">{sub.hospital}</span>
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
            ) : activeTab === 'delete-requests' ? (
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
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>申請者</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>醫院</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>申請時間</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>狀態</th>
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
                                                    <span className="badge badge-success">已核准</span>
                                                )}
                                                {req.status === 'rejected' && (
                                                    <span className="badge badge-danger">已拒絕</span>
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
                                                            className="btn btn-secondary"
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
            ) : (
                // Users Table
                <div className="card">
                    {users.length === 0 ? (
                        <div className="empty-state">
                            <Users className="empty-state-icon" />
                            <h3>尚無使用者</h3>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                點擊「新增使用者」來建立帳號
                            </p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: '80px', textAlign: 'left', verticalAlign: 'middle', paddingLeft: '1.5rem' }}>修改</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>帳號</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>姓名</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>醫院</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>E-mail</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>電話</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>建立時間</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td style={{ textAlign: 'left', verticalAlign: 'middle', paddingLeft: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-start', width: '100%' }}>
                                                    <button className="btn btn-icon" onClick={() => openEditUser(u)} title="編輯">
                                                        <Edit size={16} color="var(--color-primary)" />
                                                    </button>
                                                    <button className="btn btn-icon" onClick={() => handleDeleteUser(u.id)} title="刪除">
                                                        <Trash2 size={16} color="var(--color-danger)" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{u.username}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{u.display_name || '-'}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className="badge badge-info">{u.hospital}</span>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{u.email || '-'}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{u.phone || '-'}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{new Date(u.created_at + (u.created_at.includes('Z') ? '' : 'Z')).toLocaleString('zh-TW', { hour12: false })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )
            }

            {/* User Modal (Add/Edit) */}
            {
                showUserModal && (
                    <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                        <div className="modal animate-slideUp" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{editingUser ? '編輯使用者' : '新增使用者'}</h3>
                                <button className="btn btn-icon" onClick={() => setShowUserModal(false)}>
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveUser}>
                                <div className="modal-body">
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label required">帳號</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={userForm.username}
                                                onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className={`form-label ${editingUser ? '' : 'required'}`}>
                                                {editingUser ? '新密碼（留空不變更）' : '密碼'}
                                            </label>
                                            <input
                                                type="password"
                                                className="form-input"
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                minLength={6}
                                                required={!editingUser}
                                                placeholder={editingUser ? '留空保持原密碼' : '至少6個字元'}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label required">所屬醫院</label>
                                        <select
                                            className="form-select"
                                            value={userForm.hospital}
                                            onChange={e => setUserForm({ ...userForm, hospital: e.target.value })}
                                        >
                                            {HOSPITALS.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />

                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">姓名</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={userForm.display_name}
                                                onChange={e => setUserForm({ ...userForm, display_name: e.target.value })}
                                                placeholder="使用者姓名"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">性別</label>
                                            <select
                                                className="form-select"
                                                value={userForm.gender}
                                                onChange={e => setUserForm({ ...userForm, gender: e.target.value })}
                                            >
                                                <option value="">請選擇</option>
                                                <option value="male">男</option>
                                                <option value="female">女</option>
                                                <option value="other">其他</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">E-mail</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={userForm.email}
                                                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                                placeholder="user@example.com"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">電話</label>
                                            <input
                                                type="tel"
                                                className="form-input"
                                                value={userForm.phone}
                                                onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                                placeholder="0912-345-678"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">地址</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={userForm.address}
                                                onChange={e => setUserForm({ ...userForm, address: e.target.value })}
                                                placeholder="通訊地址"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Line ID</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={userForm.line_id}
                                                onChange={e => setUserForm({ ...userForm, line_id: e.target.value })}
                                                placeholder="Line ID"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>
                                        取消
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={savingUser}>
                                        {savingUser ? <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div> : (editingUser ? '儲存' : '建立')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
