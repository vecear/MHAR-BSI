import { useState, useEffect } from 'react';
import { X, User, AlertCircle, Check } from 'lucide-react';
import { API_URL } from '../App';

interface ProfileData {
    username: string;
    hospital: string;
    email: string;
    display_name: string;
    gender: string;
    phone: string;
    address: string;
    line_id: string;
    security_question: string;
    security_answer: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export default function ProfileModal({ isOpen, onClose, onUpdate }: Props) {
    const [profile, setProfile] = useState<ProfileData>({
        username: '',
        hospital: '',
        email: '',
        display_name: '',
        gender: '',
        phone: '',
        address: '',
        line_id: '',
        security_question: '',
        security_answer: ''
    });
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/users/profile`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('載入個人資料失敗');
            const data = await res.json();
            setProfile({
                username: data.username || '',
                hospital: data.hospital || '',
                email: data.email || '',
                display_name: data.display_name || '',
                gender: data.gender || '',
                phone: data.phone || '',
                address: data.address || '',
                line_id: data.line_id || '',
                security_question: data.security_question || '',
                security_answer: data.security_answer || ''
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : '載入失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate password if changing
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                setError('新密碼與確認密碼不符');
                return;
            }
            if (newPassword.length < 6) {
                setError('新密碼至少需要6個字元');
                return;
            }
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: profile.email,
                    display_name: profile.display_name,
                    gender: profile.gender,
                    phone: profile.phone,
                    address: profile.address,
                    line_id: profile.line_id,
                    security_question: profile.security_question || undefined,
                    security_answer: profile.security_answer || undefined,
                    currentPassword: newPassword ? currentPassword : undefined,
                    newPassword: newPassword || undefined
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '更新失敗');
            }

            setSuccess('個人資料已更新');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            if (onUpdate) onUpdate();

            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新失敗');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal animate-slideUp" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={20} />
                        個人資料設定
                    </h3>
                    <button className="btn btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {error && (
                                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                    <AlertCircle size={18} style={{ marginRight: '8px' }} />
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                                    <Check size={18} style={{ marginRight: '8px' }} />
                                    {success}
                                </div>
                            )}

                            <div className="form-section">
                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>帳號資訊（唯讀）</h4>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">帳號</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.username}
                                            disabled
                                            style={{ backgroundColor: 'var(--bg-primary)' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">所屬醫院</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.hospital}
                                            disabled
                                            style={{ backgroundColor: 'var(--bg-primary)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>個人資料</h4>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">姓名</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.display_name}
                                            onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                                            placeholder="您的姓名"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">性別</label>
                                        <select
                                            className="form-select"
                                            value={profile.gender}
                                            onChange={e => setProfile({ ...profile, gender: e.target.value })}
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
                                            value={profile.email}
                                            onChange={e => setProfile({ ...profile, email: e.target.value })}
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">電話</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={profile.phone}
                                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                            placeholder="0912-345-678"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Line ID</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={profile.line_id}
                                        onChange={e => setProfile({ ...profile, line_id: e.target.value })}
                                        placeholder="Line ID"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">地址</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={profile.address}
                                        onChange={e => setProfile({ ...profile, address: e.target.value })}
                                        placeholder="通訊地址"
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>修改密碼（選填）</h4>
                                <div className="form-group">
                                    <label className="form-label">目前密碼</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        placeholder="輸入目前密碼"
                                    />
                                </div>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">新密碼</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="至少6個字元"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">確認新密碼</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="再次輸入新密碼"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>忘記密碼設定</h4>
                                <div className="form-group">
                                    <label className="form-label">安全問題</label>
                                    <select
                                        className="form-select"
                                        value={profile.security_question}
                                        onChange={e => setProfile({ ...profile, security_question: e.target.value })}
                                    >
                                        <option value="">請選擇安全提問</option>
                                        <option value="生日">生日</option>
                                        <option value="身分證">身分證</option>
                                        <option value="畢業國小">畢業國小</option>
                                        <option value="爸爸姓名">爸爸姓名</option>
                                        <option value="媽媽姓名">媽媽姓名</option>
                                        <option value="結婚紀念日">結婚紀念日</option>
                                        <option value="寵物名字">寵物名字</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">安全問題答案</label>
                                    {profile.security_question === '生日' || profile.security_question === '結婚紀念日' ? (
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={profile.security_answer}
                                            onChange={e => setProfile({ ...profile, security_answer: e.target.value })}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.security_answer}
                                            onChange={e => setProfile({ ...profile, security_answer: e.target.value })}
                                            placeholder="請輸入答案"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                取消
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div> : '儲存'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
