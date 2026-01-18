import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { useToast } from './Toast';

interface ProfileData {
    username: string;
    hospital: string;
    email: string;
    display_name: string;
    gender: string;
    phone: string;
    address: string;
    line_id: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export default function ProfileModal({ isOpen, onClose, onUpdate }: Props) {
    const { user, updateUserProfile } = useAuth();
    const [profile, setProfile] = useState<ProfileData>({
        username: '',
        hospital: '',
        email: '',
        display_name: '',
        gender: '',
        phone: '',
        address: '',
        line_id: ''
    });
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { showError, showSuccess } = useToast();

    useEffect(() => {
        if (isOpen && user) {
            setProfile({
                username: user.username || '',
                hospital: user.hospital || '',
                email: user.email || '',
                display_name: user.display_name || '',
                gender: user.gender || '',
                phone: user.phone || '',
                address: user.address || '',
                line_id: user.line_id || ''
            });
            setLoading(false);
        }
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate password if changing
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                showError('新密碼與確認密碼不符');
                return;
            }
            if (newPassword.length < 6) {
                showError('新密碼至少需要6個字元');
                return;
            }
            if (!currentPassword) {
                showError('請輸入目前密碼');
                return;
            }
        }

        setSaving(true);
        try {
            // Update profile in Firestore
            await updateUserProfile({
                display_name: profile.display_name,
                gender: profile.gender,
                phone: profile.phone,
                address: profile.address,
                line_id: profile.line_id
            });

            // Update password in Firebase Auth if provided
            if (newPassword && auth.currentUser) {
                try {
                    // Re-authenticate user first
                    const credential = EmailAuthProvider.credential(
                        auth.currentUser.email!,
                        currentPassword
                    );
                    await reauthenticateWithCredential(auth.currentUser, credential);
                    await updatePassword(auth.currentUser, newPassword);
                } catch (authError) {
                    const errMsg = authError instanceof Error ? authError.message : '密碼更新失敗';
                    if (errMsg.includes('wrong-password')) {
                        throw new Error('目前密碼錯誤');
                    }
                    throw new Error(errMsg);
                }
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            showSuccess('個人資料已更新');

            if (onUpdate) onUpdate();

            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            showError(err instanceof Error ? err.message : '更新失敗');
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

                            <div className="form-section">
                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>帳號資訊（唯讀）</h4>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={profile.email}
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
                                        <label className="form-label">電話</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={profile.phone}
                                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                            placeholder="0912-345-678"
                                        />
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
