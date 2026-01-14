import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import { useToast } from '../components/Toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function ForgotPassword() {
    const { showError, showSuccess } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setSent(true);
            showSuccess('密碼重設郵件已寄出，請查收信箱');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '發送失敗';
            if (errorMessage.includes('user-not-found')) {
                showError('找不到此 Email 的帳號');
            } else if (errorMessage.includes('invalid-email')) {
                showError('Email 格式錯誤');
            } else {
                showError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card animate-slideUp" style={{ maxWidth: '420px' }}>
                <div className="login-header">
                    <div className="login-logo">🔐</div>
                    <h1 className="login-title">忘記密碼</h1>
                    <p className="login-subtitle">MHAR-BSI 菌血症研究表單系統</p>
                </div>

                {!sent ? (
                    <form onSubmit={handleSubmit}>
                        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                            <Mail size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                            輸入您的 Email，系統將寄送密碼重設連結
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="請輸入您的 Email"
                                required
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '1rem' }}
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                            ) : (
                                <>
                                    <KeyRound size={18} />
                                    發送重設郵件
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ marginBottom: '0.5rem' }}>郵件已寄出</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            請查收 <strong>{email}</strong> 的信箱，<br />
                            點擊郵件中的連結重設密碼
                        </p>
                        <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
                            返回登入
                        </Link>
                    </div>
                )}

                {!sent && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <Link to="/" className="btn btn-secondary" style={{ width: '100%' }}>
                            <ArrowLeft size={18} />
                            返回登入
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
