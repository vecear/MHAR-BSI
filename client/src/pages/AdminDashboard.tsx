import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Eye, Trash2, Plus, Users, UserPlus, X, AlertCircle, Edit } from 'lucide-react';
import { API_URL } from '../App';

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
    address: ''
};

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'submissions' | 'users'>('submissions');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
            address: user.address || ''
        });
        setShowUserModal(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingUser(true);
        try {
            if (editingUser) {
                // Update existing user
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
                        newPassword: userForm.password || undefined
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '更新失敗');
                }
            } else {
                // Create new user
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
                // Submissions Table
                <div className="card">
                    {submissions.length === 0 ? (
                        <div className="empty-state">
                            <FileText className="empty-state-icon" />
                            <h3>尚無表單記錄</h3>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>病歷號</th>
                                        <th>住院日期</th>
                                        <th>填寫者</th>
                                        <th>醫院</th>
                                        <th>狀態</th>
                                        <th>更新時間</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(sub => (
                                        <tr key={sub.id}>
                                            <td>{sub.medical_record_number}</td>
                                            <td>{sub.admission_date}</td>
                                            <td>{sub.username}</td>
                                            <td>
                                                <span className="badge badge-info">{sub.hospital}</span>
                                            </td>
                                            <td>
                                                <span className={`badge ${sub.data_status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                                                    {sub.data_status === 'complete' ? '已完成' : '未完成'}
                                                </span>
                                            </td>
                                            <td>{new Date(sub.updated_at).toLocaleString('zh-TW')}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <Link to={`/form/${sub.id}`} className="btn btn-icon" title="檢視/編輯">
                                                        <Eye size={16} color="var(--color-primary)" />
                                                    </Link>
                                                    <button className="btn btn-icon" onClick={() => handleDeleteSubmission(sub.id)} title="刪除">
                                                        <Trash2 size={16} color="var(--color-danger)" />
                                                    </button>
                                                </div>
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
                                        <th>帳號</th>
                                        <th>姓名</th>
                                        <th>醫院</th>
                                        <th>E-mail</th>
                                        <th>電話</th>
                                        <th>建立時間</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.username}</td>
                                            <td>{u.display_name || '-'}</td>
                                            <td>
                                                <span className="badge badge-info">{u.hospital}</span>
                                            </td>
                                            <td>{u.email || '-'}</td>
                                            <td>{u.phone || '-'}</td>
                                            <td>{new Date(u.created_at).toLocaleString('zh-TW')}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button className="btn btn-icon" onClick={() => openEditUser(u)} title="編輯">
                                                        <Edit size={16} color="var(--color-primary)" />
                                                    </button>
                                                    <button className="btn btn-icon" onClick={() => handleDeleteUser(u.id)} title="刪除">
                                                        <Trash2 size={16} color="var(--color-danger)" />
                                                    </button>
                                                </div>
                                            </td>
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
