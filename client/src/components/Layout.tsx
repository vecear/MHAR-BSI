import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, FileText, Home, Settings, User, Palette, ChevronRight, Trash2, AlertTriangle, Users } from 'lucide-react';
import { useAuth, API_URL } from '../App';
import { useTheme, THEMES } from '../context/ThemeContext';
import ProfileModal from './ProfileModal';

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfile, setShowProfile] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [pendingDeleteCount, setPendingDeleteCount] = useState(0);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Clock state
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
            <nav className="navbar" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '0' }}>
                {/* First row: brand + user info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.5rem', width: '100%' }}>
                    <div className="navbar-brand">
                        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                            🏥 MHAR-BSI 菌血症研究表單
                        </Link>
                    </div>

                    {/* User info section - stays in first row */}
                    <div className="navbar-user">
                        {user?.role === 'admin' && pendingDeleteCount > 0 && (
                            <span
                                className="badge badge-danger"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    animation: 'pulse 2s infinite',
                                    cursor: 'pointer',
                                    marginRight: '2rem',
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem'
                                }}
                                onClick={() => navigate('/?tab=delete-requests')}
                                title="點擊查看刪除申請"
                            >
                                <AlertTriangle size={16} />
                                申請刪除中 ({pendingDeleteCount})
                            </span>
                        )}
                        <div style={{ marginRight: '1.5rem', fontSize: '0.95rem', fontWeight: 500, opacity: 0.9 }}>
                            {currentTime.toLocaleString('zh-TW', {
                                hour12: false,
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </div>
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
                                                top: window.innerWidth <= 768 ? '100%' : 0,
                                                right: window.innerWidth <= 768 ? 0 : '100%',
                                                marginRight: window.innerWidth <= 768 ? 0 : '0.5rem',
                                                marginTop: window.innerWidth <= 768 ? '0.25rem' : 0,
                                                backgroundColor: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius)',
                                                boxShadow: 'var(--shadow-lg)',
                                                width: window.innerWidth <= 480 ? '280px' : window.innerWidth <= 768 ? '400px' : '640px',
                                                maxWidth: '90vw',
                                                display: 'grid',
                                                gridTemplateColumns: window.innerWidth <= 480 ? 'repeat(2, 1fr)' : window.innerWidth <= 768 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
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
                </div>

                {/* Second row: Navigation links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1px 2rem', backgroundColor: 'rgba(255,255,255,0.08)', width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Link to="/" className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}>
                        <Home size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        首頁
                    </Link>
                    <Link to="/form" className={`navbar-link ${location.pathname.startsWith('/form') ? 'active' : ''}`}>
                        <FileText size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        新增表單
                    </Link>
                    {user?.role === 'admin' && (
                        <Link to="/admin/delete-requests" className={`navbar-link ${location.pathname === '/admin/delete-requests' ? 'active' : ''}`}>
                            <Trash2 size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            刪除表單
                        </Link>
                    )}
                    {user?.role === 'admin' && (
                        <Link to="/users" className={`navbar-link ${location.pathname === '/users' ? 'active' : ''}`}>
                            <Users size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            使用者管理
                        </Link>
                    )}
                    {user?.role !== 'admin' && (
                        <Link to="/delete-requests" className={`navbar-link ${location.pathname === '/delete-requests' ? 'active' : ''}`}>
                            <Trash2 size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            刪除申請
                        </Link>
                    )}
                </div>
            </nav>

            <main className="main-content">
                <div className="container">
                    <Outlet context={{ refreshPendingDeleteCount: fetchPendingDeleteCount }} />
                </div>
            </main>

            <ProfileModal
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
            />
        </div>
    );
}

