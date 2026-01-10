import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, FileText, Users, Home } from 'lucide-react';
import { useAuth } from '../App';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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
                </div>

                <div className="navbar-user">
                    <span>
                        {user?.username} ({user?.hospital})
                        {user?.role === 'admin' && (
                            <span className="badge badge-info" style={{ marginLeft: '8px' }}>
                                管理員
                            </span>
                        )}
                    </span>
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
        </div>
    );
}
