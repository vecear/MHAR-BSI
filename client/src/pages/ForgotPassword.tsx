import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '../components/Toast';
import { API_URL } from '../App';

type Step = 'username' | 'answer' | 'reset';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { showError } = useToast();
    const [step, setStep] = useState<Step>('username');
    const [username, setUsername] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGetQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/forgot-password/question`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '查詢失敗');
            }

            setSecurityQuestion(data.security_question);
            setStep('answer');
        } catch (err) {
            showError(err instanceof Error ? err.message : '查詢失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAnswer = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showError('新密碼與確認密碼不一致');
            return;
        }

        if (newPassword.length < 6) {
            showError('新密碼至少需要6個字元');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/forgot-password/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    security_answer: securityAnswer,
                    new_password: newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '驗證失敗');
            }

            setStep('reset');
        } catch (err) {
            showError(err instanceof Error ? err.message : '驗證失敗');
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

                {step === 'username' && (
                    <form onSubmit={handleGetQuestion}>
                        <div className="form-group">
                            <label className="form-label required">帳號</label>
                            <input
                                type="text"
                                className="form-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="請輸入您的帳號"
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
                                '下一步'
                            )}
                        </button>
                    </form>
                )}

                {step === 'answer' && (
                    <form onSubmit={handleVerifyAnswer}>
                        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                            帳號：<strong>{username}</strong>
                        </div>

                        <div className="form-group">
                            <label className="form-label">安全提問</label>
                            <div className="form-input" style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}>
                                {securityQuestion}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label required">您的答案</label>
                            {securityQuestion === '生日' || securityQuestion === '結婚紀念日' ? (
                                <input
                                    type="date"
                                    className="form-input"
                                    value={securityAnswer}
                                    onChange={(e) => setSecurityAnswer(e.target.value)}
                                    required
                                    autoFocus
                                />
                            ) : (
                                <input
                                    type="text"
                                    className="form-input"
                                    value={securityAnswer}
                                    onChange={(e) => setSecurityAnswer(e.target.value)}
                                    placeholder="請輸入答案"
                                    required
                                    autoFocus
                                />
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label required">新密碼</label>
                            <input
                                type="password"
                                className="form-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="至少6個字元"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">確認新密碼</label>
                            <input
                                type="password"
                                className="form-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="再次輸入新密碼"
                                required
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
                                    重設密碼
                                </>
                            )}
                        </button>
                    </form>
                )}

                {step === 'reset' && (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ marginBottom: '0.5rem' }}>密碼已重設</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            請使用新密碼登入系統
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={() => navigate('/')}
                        >
                            返回登入
                        </button>
                    </div>
                )}

                {step !== 'reset' && (
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
