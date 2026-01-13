import { useState, useEffect } from 'react';
import { Users, Edit, Trash2, X, UserPlus, AlertCircle } from 'lucide-react';
import { API_URL } from '../App';

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

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal states
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState<UserFormData>(initialUserForm);
    const [savingUser, setSavingUser] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

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
        if (!confirm('確定要刪除此使用者嗎？（該使用者建立的表單資料將會保留）')) return;
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
                <h1>使用者管理</h1>
                <button className="btn btn-primary" onClick={openAddUser}>
                    <UserPlus size={18} />
                    新增使用者
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
            ) : (
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
