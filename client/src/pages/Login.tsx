import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { useToast } from '../components/Toast';
import { LogIn, Building2 } from 'lucide-react';

const HOSPITALS = [
    '內湖總院',
    '松山分院',
    '澎湖分院',
    '桃園總院',
    '台中總院',
    '高雄總院',
    '左營總院',
    '花蓮總院'
];

export default function Login() {
    const { login } = useAuth();
    const { showError } = useToast();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(username, password);
        } catch (err) {
            showError(err instanceof Error ? err.message : '登入失敗');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card animate-slideUp">
                <div className="login-header">
                    <div className="login-logo">🏥</div>
                    <h1 className="login-title">MHAR-BSI</h1>
                    <p className="login-subtitle">菌血症研究表單系統</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">帳號</label>
                        <input
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="請輸入帳號"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label required">密碼</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="請輸入密碼"
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
                                <LogIn size={18} />
                                登入
                            </>
                        )}
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <Link to="/register" className="btn btn-secondary" style={{ flex: 1 }}>
                        建立帳號
                    </Link>
                    <Link to="/forgot-password" className="btn btn-secondary" style={{ flex: 1 }}>
                        忘記密碼
                    </Link>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                    <Link to="/forgot-username" className="btn btn-secondary" style={{ width: '100%' }}>
                        忘記帳號
                    </Link>
                </div>

                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
                        <Building2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        國軍醫院認證系統
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'center' }}>
                        {HOSPITALS.map(h => (
                            <span key={h} className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                                {h}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
