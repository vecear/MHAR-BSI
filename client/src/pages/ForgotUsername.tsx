import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function ForgotUsername() {
    const { showError } = useToast();
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [foundUsername, setFoundUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFoundUsername('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:3001/api/auth/forgot-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '查詢失敗');
            }

            setFoundUsername(data.username);
        } catch (err) {
            showError(err instanceof Error ? err.message : '查詢失敗');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card animate-slideUp" style={{ maxWidth: '420px' }}>
                <div className="login-header">
                    <div className="login-logo">👤</div>
                    <h1 className="login-title">忘記帳號</h1>
                    <p className="login-subtitle">MHAR-BSI 菌血症研究表單系統</p>
                </div>

                {foundUsername ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ marginBottom: '0.5rem' }}>找到您的帳號</h2>
                        <div className="alert alert-success" style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>
                            <User size={20} style={{ marginRight: '8px' }} />
                            帳號：<strong>{foundUsername}</strong>
                        </div>
                        <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
                            返回登入
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
                            請輸入您註冊時使用的信箱和電話，系統將為您查詢帳號
                        </p>

                        <div className="form-group">
                            <label className="form-label required">E-mail</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="請輸入註冊時的信箱"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">電話</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="請輸入註冊時的電話"
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
                                    <User size={18} />
                                    查詢帳號
                                </>
                            )}
                        </button>
                    </form>
                )}

                {!foundUsername && (
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
