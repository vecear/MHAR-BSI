import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, FileText, Home, Settings, User, ChevronRight, Trash2, AlertTriangle, Users, RefreshCw, Upload, Download, BookOpen, Bell, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deleteRequestService, exportService, commentService, userService } from '../services/firestore';
import { useTheme, THEMES } from '../context/ThemeContext';
import { PROJECTS } from '../constants/projects';
import ProfileModal from './ProfileModal';
import CsvUpload from './CsvUpload';

export default function Layout() {
    const { user, logout, currentProject } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfile, setShowProfile] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [pendingDeleteCount, setPendingDeleteCount] = useState(0);
    const [unreadCommentCount, setUnreadCommentCount] = useState(0);
    const [pendingUserCount, setPendingUserCount] = useState(0);
    const [showImportModal, setShowImportModal] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Get project name
    const projectName = PROJECTS.find(p => p.id === currentProject)?.name || currentProject;

    // Theme helpers
    const currentTheme = theme;
    const handleThemeChange = (newTheme: any) => {
        setTheme(newTheme);
    };

    // Clock state


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

    // Fetch pending counts for admin
    useEffect(() => {
        if (user?.role === 'admin') {
            fetchCounts();
            const interval = setInterval(fetchCounts, 30000);
            return () => clearInterval(interval);
        }
    }, [user?.role]);

    const fetchCounts = async () => {
        try {
            const deleteCount = await deleteRequestService.countPending();
            setPendingDeleteCount(deleteCount);

            const commentCount = await commentService.countUnread();
            setUnreadCommentCount(commentCount);

            const userCount = await userService.countPending();
            setPendingUserCount(userCount);
        } catch {
            // Silently fail
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleExportAllData = async () => {
        try {
            const csvContent = await exportService.exportToCSV();
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const prefix = user?.role === 'admin' ? 'all-data' : (user?.hospital || 'data');
            a.download = `mhar-bsi-${prefix}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            alert(err instanceof Error ? err.message : '匯出失敗');
        }
    };

    return (
        <div className="app-layout">
            <nav className="navbar navbar-stacked">
                {/* First row: brand + user info */}
                <div className="navbar-header">
                    <div className="navbar-brand">
                        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                            🏥 MHAS | {projectName || '待審核'}
                        </Link>
                    </div>

                    {/* User info section */}
                    <div className="navbar-user">
                        {/* Delete Request Notification */}
                        {user?.role === 'admin' && pendingDeleteCount > 0 && (
                            <span
                                className="badge badge-danger navbar-badge"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    animation: 'pulse 2s infinite',
                                    cursor: 'pointer',
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem'
                                }}
                                onClick={() => navigate('/admin/delete-requests')}
                                title="點擊查看刪除申請"
                            >
                                <AlertTriangle size={16} />
                                申請刪除中 ({pendingDeleteCount})
                            </span>
                        )}

                        {/* Pending Users Notification */}
                        {user?.role === 'admin' && pendingUserCount > 0 && (
                            <span
                                className="badge navbar-badge"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    animation: 'pulse 2s infinite',
                                    cursor: 'pointer',
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: '#fca5a5', // Light Red
                                    color: '#7f1d1d', // Dark Red Text
                                    marginLeft: '8px'
                                }}
                                onClick={() => navigate('/users')}
                                title="點擊前往審核"
                            >
                                <UserPlus size={16} />
                                開通新成員 ({pendingUserCount})
                            </span>
                        )}

                        {/* Comment Notification */}
                        {user?.role === 'admin' && unreadCommentCount > 0 && (
                            <span
                                className="badge navbar-badge"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    animation: 'pulse 2s infinite',
                                    cursor: 'pointer',
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: 'var(--color-warning)', // Orange/Yellow
                                    color: '#fff',
                                    marginLeft: '8px'
                                }}
                                onClick={() => navigate('/guide')}
                                title="點擊查看未讀留言"
                            >
                                <Bell size={16} />
                                新留言 ({unreadCommentCount})
                            </span>
                        )}


                        <div className="navbar-controls-row">
                            <div className="navbar-profile">
                                {user?.username} ({user?.display_name || '未設定姓名'}|{user?.hospital})
                                <span
                                    className={`badge ${user?.role === 'admin' ? 'badge-info' : 'badge-success'}`}
                                    style={{ marginLeft: '8px' }}
                                >
                                    {user?.role === 'admin' ? '管理員' : '成員'}
                                </span>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Second row: Navigation links */}
                <div className="navbar-secondary-row">
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', flex: 1 }}>
                        <Link to="/" className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}>
                            <Home size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            首頁
                        </Link>
                        <Link to="/guide" className={`navbar-link ${location.pathname === '/guide' ? 'active' : ''}`}>
                            <BookOpen size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            收案說明
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

                    {/* Moved Actions: Settings & Refresh */}
                    <div className="navbar-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
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

                                    <button
                                        className="dropdown-item"
                                        onClick={() => {
                                            handleExportAllData();
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
                                        <Upload size={16} style={{ marginRight: '0.75rem' }} />
                                        {user?.role === 'admin' ? '匯出整個資料庫' : '匯出我的資料'}
                                    </button>

                                    <button
                                        className="dropdown-item"
                                        onClick={() => {
                                            setShowImportModal(true);
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
                                        <Download size={16} style={{ marginRight: '0.75rem' }} />
                                        匯入資料
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
                                                🎨
                                                <span style={{ marginLeft: '0.75rem' }}>切換主題</span>
                                            </div>
                                            <ChevronRight size={16} />
                                        </button>

                                        {/* Theme Submenu */}
                                        {showThemeMenu && (
                                            <div className="submenu" style={{
                                                position: 'absolute',
                                                top: 0,
                                                right: '100%',
                                                marginTop: 0,
                                                backgroundColor: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius)',
                                                boxShadow: 'var(--shadow-lg)',
                                                minWidth: '180px',
                                                zIndex: 1001,
                                                padding: '0.5rem 0'
                                            }}>
                                                {THEMES.map(t => (
                                                    <button
                                                        key={t.id}
                                                        className={`dropdown-item ${currentTheme === t.id ? 'active' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleThemeChange(t.id);
                                                            setShowThemeMenu(false);
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
                                                        <span style={{ marginRight: '0.5rem' }}>🎨</span>
                                                        {t.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }}></div>

                                    <button
                                        className="dropdown-item"
                                        onClick={handleLogout}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--color-danger)',
                                            textAlign: 'left',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <LogOut size={16} style={{ marginRight: '0.75rem' }} />
                                        登出
                                    </button>
                                </div>
                            )}
                        </div>

                        <button className="btn btn-icon" onClick={() => window.location.reload()} title="重新整理">
                            <RefreshCw size={18} color="white" />
                        </button>
                    </div>
                </div >
            </nav >

            <main className="main-content">
                <div className="container">
                    {(!user?.allowed_projects || user.allowed_projects.length === 0) ? (
                        <div className="card animate-fadeIn" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', animation: 'pulse 2s infinite' }}>⏳</div>
                            <h2 style={{ marginBottom: '1rem' }}>帳號待審核</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                                您的帳號已成功建立，但尚未開通任何專案權限。<br />
                                請聯繫系統管理員協助開通，開通後請重新整理頁面。
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => window.location.reload()}
                                style={{ marginTop: '2rem' }}
                            >
                                <RefreshCw size={18} style={{ marginRight: '8px' }} />
                                重新整理狀態
                            </button>
                        </div>
                    ) : (
                        <Outlet context={{ refreshPendingDeleteCount: fetchCounts }} />
                    )}
                </div>
            </main>

            <ProfileModal
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
            />

            {/* Import Modal */}
            {
                showImportModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: 'var(--border-radius)',
                            padding: '1.5rem',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h2 style={{ margin: 0 }}>匯入資料</h2>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <CsvUpload
                                variant="card"
                                userHospital={user?.hospital || ''}
                                onUploadComplete={() => {
                                    setShowImportModal(false);
                                    window.location.reload();
                                }}
                                onError={(msg) => alert(msg)}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
}
