import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { LogIn, Building2, FolderKanban } from 'lucide-react';
import { PROJECTS, DEFAULT_PROJECT_ID } from '../constants/projects';

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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(email, password, projectId);
        } catch (err) {
            // Firebase error messages mapping
            const errorMessage = err instanceof Error ? err.message : '登入失敗';
            if (errorMessage.includes('user-not-found') || errorMessage.includes('wrong-password') || errorMessage.includes('invalid-credential')) {
                showError('帳號或密碼錯誤');
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
            <div className="login-card animate-slideUp">
                <div className="login-header">
                    <div className="login-logo">🏥</div>
                    <h1 className="login-title">MHAS</h1>
                    <p className="login-subtitle">Military Hospitals Antimicrobial-resistant Surveillance</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="請輸入 Email"
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

                    <div className="form-group">
                        <label className="form-label required">選擇專案</label>
                        <div className="select-wrapper" style={{ position: 'relative' }}>
                            <FolderKanban size={18} style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }} />
                            <select
                                className="form-select"
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                                required
                            >
                                {PROJECTS.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
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
