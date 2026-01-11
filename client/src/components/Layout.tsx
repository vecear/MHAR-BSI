import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, FileText, Home, Settings, User, Palette, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth, API_URL } from '../App';
import { useTheme, THEMES } from '../context/ThemeContext';
import ProfileModal from './ProfileModal';

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [showProfile, setShowProfile] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [pendingDeleteCount, setPendingDeleteCount] = useState(0);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettingsMenu(false);
                setShowThemeMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch pending delete requests count for admin
    useEffect(() => {
        if (user?.role === 'admin') {
            fetchPendingDeleteCount();
            // Refresh every 30 seconds
            const interval = setInterval(fetchPendingDeleteCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user?.role]);

    const fetchPendingDeleteCount = async () => {
        try {
            const res = await fetch(`${API_URL}/delete-requests`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const pendingCount = data.filter((r: { status: string }) => r.status === 'pending').length;
                setPendingDeleteCount(pendingCount);
            }
        } catch {
            // Silently fail
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="app-layout">
            <nav className="navbar">
                <div className="navbar-brand">
                    <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                        🏥 MHAR-BSI 菌血症研究表單
                    </Link>
                </div>

                <div className="navbar-nav">
                    <Link to="/" className="navbar-link">
                        <Home size={18} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        首頁
                    </Link>
                    <Link to="/form" className="navbar-link">
                        <FileText size={18} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        新增表單
                    </Link>
                    {user?.role !== 'admin' && (
                        <Link to="/delete-requests" className="navbar-link">
                            <Trash2 size={18} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            刪除申請
                        </Link>
                    )}
                    {user?.role === 'admin' && pendingDeleteCount > 0 && (
                        <span className="badge badge-danger" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            animation: 'pulse 2s infinite',
                            cursor: 'pointer'
                        }} onClick={() => navigate('/')}
                        >
                            <AlertTriangle size={14} />
                            申請刪除 ({pendingDeleteCount})
                        </span>
                    )}
                </div>

                <div className="navbar-user">
                    <span>
                        {user?.username} ({user?.display_name || '未設定姓名'}|{user?.hospital})
                        {user?.role === 'admin' && (
                            <span className="badge badge-info" style={{ marginLeft: '8px' }}>
                                管理員
                            </span>
                        )}
                    </span>

                    <div className="settings-dropdown" ref={settingsRef} style={{ position: 'relative' }}>
                        <button
                            className={`btn btn-icon ${showSettingsMenu ? 'active' : ''}`}
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                            title="設定"
                        >
                            <Settings size={18} color="white" />
                        </button>

                        {showSettingsMenu && (
                            <div className="dropdown-menu" style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius)',
                                boxShadow: 'var(--shadow-lg)',
                                minWidth: '200px',
                                zIndex: 1000,
                                padding: '0.5rem 0'
                            }}>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setShowProfile(true);
                                        setShowSettingsMenu(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-primary)',
                                        textAlign: 'left',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    <User size={16} style={{ marginRight: '0.75rem' }} />
                                    修改基本資料
                                </button>

                                <div
                                    className="dropdown-item-submenu-trigger"
                                    onMouseEnter={() => setShowThemeMenu(true)}
                                    onMouseLeave={() => setShowThemeMenu(false)}
                                    style={{ position: 'relative' }}
                                >
                                    <button
                                        className="dropdown-item"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-primary)',
                                            textAlign: 'left',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <Palette size={16} style={{ marginRight: '0.75rem' }} />
                                            頁面主題
                                        </div>
                                        <ChevronRight size={14} />
                                    </button>

                                    {showThemeMenu && (
                                        <div className="dropdown-submenu" style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: '100%',
                                            marginRight: '0.5rem',
                                            backgroundColor: 'var(--bg-card)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--border-radius)',
                                            boxShadow: 'var(--shadow-lg)',

                                            width: '640px', // Fixed width for 4 columns
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(4, 1fr)',
                                            gap: '0.5rem',
                                            padding: '0.5rem'
                                        }}>
                                            {THEMES.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTheme(t.id)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        width: '100%',
                                                        padding: '0.5rem 1rem',
                                                        border: 'none',
                                                        background: theme === t.id ? 'var(--color-primary-light)' : 'none',
                                                        cursor: 'pointer',
                                                        color: theme === t.id ? 'var(--color-primary)' : 'var(--text-primary)',
                                                        textAlign: 'left',
                                                        fontSize: '0.9rem'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '12px',
                                                        height: '12px',
                                                        borderRadius: '50%',
                                                        backgroundColor: t.color,
                                                        marginRight: '0.75rem',
                                                        border: '1px solid var(--border-color)'
                                                    }} />
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="btn btn-icon" onClick={handleLogout} title="登出">
                        <LogOut size={18} color="white" />
                    </button>
                </div>
            </nav>

            <main className="main-content">
                <div className="container">
                    <Outlet />
                </div>
            </main>

            <ProfileModal
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
            />
        </div>
    );
}

