import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { LogIn, FolderKanban, Eye, EyeOff } from 'lucide-react';
import { PROJECTS, DEFAULT_PROJECT_ID } from '../constants/projects';

const HOSPITALS = [
    '三軍總院',
    '松山分院',
    '澎湖分院',
    '桃園總院',
    '台中總院',
    '高雄總院',
    '左營總院',
    '花蓮總院'
];

const EMAIL_DOMAINS = [
    '@gmail.com',
    '@hotmail.com',
    '@hotmail.com.tw',
    '@yahoo.com',
    '@yahoo.com.tw',
    '@office365.ndmctsgh.edu.tw'
];

export default function Login() {
    const { login } = useAuth();
    const { showError } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
    const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);

    const handleEmailChange = (value: string) => {
        setEmail(value);

        // Check if user is typing before @ or after @
        const atIndex = value.indexOf('@');
        if (atIndex === -1 && value.length > 0) {
            // User hasn't typed @ yet, show suggestions with their username
            const suggestions = EMAIL_DOMAINS.map(domain => value + domain);
            setEmailSuggestions(suggestions);
            setShowEmailSuggestions(true);
        } else if (atIndex > 0) {
            // User has typed @, show matching domains
            const username = value.substring(0, atIndex);
            const domainPart = value.substring(atIndex);
            const matchingDomains = EMAIL_DOMAINS.filter(domain =>
                domain.toLowerCase().startsWith(domainPart.toLowerCase())
            );
            if (matchingDomains.length > 0 && domainPart !== matchingDomains[0]) {
                const suggestions = matchingDomains.map(domain => username + domain);
                setEmailSuggestions(suggestions);
                setShowEmailSuggestions(true);
            } else {
                setShowEmailSuggestions(false);
            }
        } else {
            setShowEmailSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setEmail(suggestion);
        setShowEmailSuggestions(false);
    };

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
                        <div style={{ position: 'relative' }}>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => handleEmailChange(e.target.value)}
                                onFocus={() => {
                                    if (email.length > 0) {
                                        handleEmailChange(email);
                                    }
                                }}
                                onBlur={() => {
                                    // Delay hiding to allow click on suggestions
                                    setTimeout(() => setShowEmailSuggestions(false), 200);
                                }}
                                placeholder="請輸入 Email"
                                required
                                autoFocus
                                autoComplete="off"
                            />
                            {showEmailSuggestions && emailSuggestions.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    backgroundColor: '#fff',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 1000
                                }}>
                                    {emailSuggestions.map((suggestion, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                cursor: 'pointer',
                                                borderBottom: index < emailSuggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                                                transition: 'background-color 0.2s',
                                                fontSize: '0.9rem'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {suggestion}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label required">密碼</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="請輸入密碼"
                                style={{ paddingRight: '2.5rem' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
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
