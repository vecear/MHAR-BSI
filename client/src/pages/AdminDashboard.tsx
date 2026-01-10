
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Eye, Trash2, Edit, AlertCircle, Users, X, Filter, ArrowUp, ArrowDown, UserPlus, Plus } from 'lucide-react';
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

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'submissions' | 'users'>('submissions');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterHospital, setFilterHospital] = useState('');
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

    // Modal states
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState<UserFormData>(initialUserForm);
    const [savingUser, setSavingUser] = useState(false);

    useEffect(() => {
        if (activeTab === 'submissions') {
            fetchSubmissions();
        } else {
            fetchUsers();
        }
    }, [activeTab]);

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

    // Filter submissions
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const cultureDate = (sub.form_data?.positive_culture_date as string) || '';

            if (filterYear && !cultureDate.startsWith(filterYear)) {
                return false;
            }
            if (filterMonth && filterYear) {
                const monthPart = cultureDate.substring(5, 7);
                if (monthPart !== filterMonth) {
                    return false;
                }
            }
            if (filterHospital && sub.hospital !== filterHospital) {
                return false;
            }
            return true;
        }).sort((a, b) => {
            const aValue = (() => {
                switch (sortField) {
                    case 'medical_record_number': return a.medical_record_number;
                    case 'admission_date': return a.admission_date;
                    case 'positive_culture_date': return (a.form_data?.positive_culture_date as string) || '';
                    case 'username': return a.username;
                    case 'hospital': return a.hospital;
                    case 'data_status': return a.data_status;
                    case 'created_at': return a.created_at;
                    case 'updated_at': return a.updated_at;
                    case 'update_count': return (a.update_count || 0).toString();
                    default: return '';
                }
            })();
            const bValue = (() => {
                switch (sortField) {
                    case 'medical_record_number': return b.medical_record_number;
                    case 'admission_date': return b.admission_date;
                    case 'positive_culture_date': return (b.form_data?.positive_culture_date as string) || '';
                    case 'username': return b.username;
                    case 'hospital': return b.hospital;
                    case 'data_status': return b.data_status;
                    case 'created_at': return b.created_at;
                    case 'updated_at': return b.updated_at;
                    case 'update_count': return (b.update_count || 0).toString();
                    default: return '';
                }
            })();

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [submissions, filterYear, filterMonth, filterHospital, sortField, sortDirection]);

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
            setSubmissions(submissions.filter(s => s.id !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : '刪除失敗');
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
                        username: userForm.username,
                        hospital: userForm.hospital,
                        email: userForm.email,
                        display_name: userForm.display_name,
                        gender: userForm.gender,
                        phone: userForm.phone,
                        address: userForm.address,
                        line_id: userForm.line_id,
                        newPassword: userForm.password || undefined
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '更新失敗');
                }
            } else {
                if (!userForm.password) {
                    throw new Error('請輸入密碼');
                }
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
            setUsers(users.filter(u => u.id !== id));
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
                        <button className="btn btn-secondary" onClick={handleExportCSV}>
                            <Download size={18} />
                            匯出全部 CSV
                        </button>
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

            {/* Tabs */}
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
                            {(filterYear || filterMonth || filterHospital) && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setFilterYear('');
                                        setFilterMonth('');
                                        setFilterHospital('');
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
                                            <th style={{ minWidth: '80px', textAlign: 'left', verticalAlign: 'middle', paddingLeft: '1.5rem' }}>修改</th>
                                            <th onClick={() => handleSort('medical_record_number')} style={{ cursor: 'pointer', minWidth: '100px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                病歷號 {sortField === 'medical_record_number' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('admission_date')} style={{ cursor: 'pointer', minWidth: '110px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                住院日期 {sortField === 'admission_date' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('positive_culture_date')} style={{ cursor: 'pointer', minWidth: '110px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                陽性日期 {sortField === 'positive_culture_date' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('username')} style={{ cursor: 'pointer', minWidth: '90px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                填寫者 {sortField === 'username' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('hospital')} style={{ cursor: 'pointer', minWidth: '120px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                                                醫院 {sortField === 'hospital' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('data_status')} style={{ cursor: 'pointer', minWidth: '100px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                                                狀態 {sortField === 'data_status' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer', minWidth: '130px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                建立時間 {sortField === 'created_at' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer', minWidth: '130px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                最後更新時間 {sortField === 'updated_at' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                            <th style={{ minWidth: '90px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                更新次數 {sortField === 'update_count' && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSubmissions.map(sub => (
                                            <tr key={sub.id}>
                                                <td style={{ textAlign: 'left', verticalAlign: 'middle', paddingLeft: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-start', width: '100%' }}>
                                                        <Link to={`/form/${sub.id}`} className="btn btn-icon" title="修改">
                                                            <Edit size={16} color="var(--color-primary)" />
                                                        </Link>
                                                        <button className="btn btn-icon" onClick={() => handleDeleteSubmission(sub.id)} title="刪除">
                                                            <Trash2 size={16} color="var(--color-danger)" />
                                                        </button>
                                                    </div>
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
                                                    <div>{new Date(sub.created_at).toLocaleDateString('zh-TW')}</div>
                                                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                                        {new Date(sub.created_at).toLocaleTimeString('zh-TW', { hour12: false })}
                                                    </div>
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
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{new Date(u.created_at).toLocaleString('zh-TW', { hour12: false })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* User Modal (Add/Edit) */}
            {showUserModal && (
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
            )}
        </div>
    );
}
