import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Eye, Trash2, Plus, Users, UserPlus, X, AlertCircle } from 'lucide-react';
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
    created_at: string;
}

const HOSPITALS = [
    '內湖總院', '松山分院', '澎湖分院', '桃園總院',
    '台中總院', '高雄總院', '左營總院', '花蓮總院'
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'submissions' | 'users'>('submissions');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal states
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', hospital: HOSPITALS[0] });
    const [addingUser, setAddingUser] = useState(false);

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

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingUser(true);
        try {
            const res = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newUser)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '新增失敗');
            }
            setShowAddUser(false);
            setNewUser({ username: '', password: '', hospital: HOSPITALS[0] });
            fetchUsers();
        } catch (err) {
            alert(err instanceof Error ? err.message : '新增失敗');
        } finally {
            setAddingUser(false);
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
                        <button className="btn btn-primary" onClick={() => setShowAddUser(true)}>
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
                                        <th>醫院</th>
                                        <th>建立時間</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.username}</td>
                                            <td>
                                                <span className="badge badge-info">{u.hospital}</span>
                                            </td>
                                            <td>{new Date(u.created_at).toLocaleString('zh-TW')}</td>
                                            <td>
                                                <button className="btn btn-icon" onClick={() => handleDeleteUser(u.id)} title="刪除">
                                                    <Trash2 size={16} color="var(--color-danger)" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Add User Modal */}
            {showAddUser && (
                <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
                    <div className="modal animate-slideUp" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>新增使用者</h3>
                            <button className="btn btn-icon" onClick={() => setShowAddUser(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label required">帳號</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newUser.username}
                                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">密碼</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        minLength={6}
                                        required
                                    />
                                    <small style={{ color: 'var(--text-muted)' }}>至少6個字元</small>
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">所屬醫院</label>
                                    <select
                                        className="form-select"
                                        value={newUser.hospital}
                                        onChange={e => setNewUser({ ...newUser, hospital: e.target.value })}
                                    >
                                        {HOSPITALS.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUser(false)}>
                                    取消
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={addingUser}>
                                    {addingUser ? <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div> : '建立'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
