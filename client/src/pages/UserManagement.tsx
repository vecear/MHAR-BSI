import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Edit, Trash2, X, UserPlus, AlertCircle } from 'lucide-react';
import { userService } from '../services/firestore';
import type { FirestoreUser } from '../services/firestore';
import { PROJECTS } from '../constants/projects';

interface UserFormData {
    email: string;
    password: string;
    username: string;
    hospital: string;
    display_name: string;
    gender: string;
    phone: string;
    address: string;
    line_id: string;
    allowed_projects: string[];
}

const HOSPITALS = [
    '內湖總院', '松山分院', '澎湖分院', '桃園總院',
    '台中總院', '高雄總院', '左營總院', '花蓮總院'
];

const initialUserForm: UserFormData = {
    email: '',
    password: '',
    username: '',
    hospital: HOSPITALS[0],
    display_name: '',
    gender: '',
    phone: '',
    address: '',
    line_id: '',
    allowed_projects: []
};

export default function UserManagement() {
    const { refreshPendingDeleteCount } = useOutletContext<{ refreshPendingDeleteCount: () => void }>();
    const [users, setUsers] = useState<FirestoreUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal states
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<FirestoreUser | null>(null);
    const [userForm, setUserForm] = useState<UserFormData>(initialUserForm);
    const [savingUser, setSavingUser] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getAll();
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

    const openEditUser = (user: FirestoreUser) => {
        setEditingUser(user);
        setUserForm({
            email: user.email || '',
            password: '',
            username: user.username,
            hospital: user.hospital,
            display_name: user.display_name || '',
            gender: user.gender || '',
            phone: user.phone || '',
            address: user.address || '',
            line_id: user.line_id || '',
            allowed_projects: user.allowed_projects || []
        });
        setShowUserModal(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setSavingUser(true);
        try {
            await userService.update(editingUser.id, {
                username: userForm.username,
                hospital: userForm.hospital,
                display_name: userForm.display_name,
                gender: userForm.gender,
                phone: userForm.phone,
                address: userForm.address,
                line_id: userForm.line_id,
                allowed_projects: userForm.allowed_projects
            });

            setShowUserModal(false);
            setUserForm(initialUserForm);
            fetchUsers();
            refreshPendingDeleteCount?.();
        } catch (err) {
            alert(err instanceof Error ? err.message : '儲存失敗');
        } finally {
            setSavingUser(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('確定要刪除此使用者嗎？（該使用者建立的表單資料將會保留）')) return;
        try {
            await userService.delete(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            refreshPendingDeleteCount?.();
        } catch (err) {
            alert(err instanceof Error ? err.message : '刪除失敗');
        }
    };

    const toggleProjectPermission = (projectId: string) => {
        setUserForm(prev => {
            const current = new Set(prev.allowed_projects);
            if (current.has(projectId)) {
                current.delete(projectId);
            } else {
                current.add(projectId);
            }
            return { ...prev, allowed_projects: Array.from(current) };
        });
    };

    return (
        <div className="animate-fadeIn">
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.95); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
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
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Email</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>帳號</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>姓名</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>醫院</th>
                                        <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>可存取專案</th>
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
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {/* Check for no permissions */}
                                                {(!u.allowed_projects || u.allowed_projects.length === 0) && (
                                                    <span className="badge animate-pulse" style={{
                                                        marginRight: '8px',
                                                        verticalAlign: 'middle',
                                                        animation: 'pulse 1.5s infinite',
                                                        backgroundColor: '#e63946', // Bright red
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                        border: '1px solid #d62828',
                                                        boxShadow: '0 0 4px rgba(230, 57, 70, 0.5)'
                                                    }}>
                                                        未開通
                                                    </span>
                                                )}
                                                {u.email || '-'}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                {u.username}
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{u.display_name || '-'}</td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className="badge badge-info">{u.hospital}</span>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {(u.allowed_projects || []).map(pid => (
                                                        <span key={pid} className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                                                            {PROJECTS.find(p => p.id === pid)?.name || pid}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{u.created_at?.toLocaleString('zh-TW', { hour12: false }) || '-'}</td>
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
                                {!editingUser && (
                                    <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                                        注意：建議使用者自行透過註冊頁面建立帳號，此處僅供管理員建立 Firestore 使用者資料。
                                    </div>
                                )}

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label required">Email</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={userForm.email}
                                            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                            required
                                            disabled={!!editingUser}
                                            style={editingUser ? { backgroundColor: 'var(--bg-primary)' } : {}}
                                        />
                                    </div>
                                    {!editingUser && (
                                        <div className="form-group">
                                            <label className="form-label required">密碼</label>
                                            <input
                                                type="password"
                                                className="form-input"
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                minLength={6}
                                                required
                                                placeholder="至少6個字元"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label required">帳號（顯示名稱）</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={userForm.username}
                                            onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                            required
                                        />
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
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">專案存取權限</label>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
                                        {PROJECTS.map(project => (
                                            <label key={project.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={userForm.allowed_projects.includes(project.id)}
                                                    onChange={() => toggleProjectPermission(project.id)}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                {project.name}
                                            </label>
                                        ))}
                                    </div>
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
                                        <label className="form-label">電話</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={userForm.phone}
                                            onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                            placeholder="0912-345-678"
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
