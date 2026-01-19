import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import FormPage from './pages/FormPage';
import DeleteRequests from './pages/DeleteRequests';
import AdminDeleteRequests from './pages/AdminDeleteRequests';
import UserManagement from './pages/UserManagement';
import ProjectGuide from './pages/ProjectGuide';
import Statistics from './pages/Statistics';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';

// Re-export useAuth for backward compatibility
export { useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/register" element={
        user ? <Navigate to="/" replace /> : <Register />
      } />
      <Route path="/forgot-password" element={
        user ? <Navigate to="/" replace /> : <ForgotPassword />
      } />

      <Route path="/" element={
        user ? <Layout /> : <Navigate to="/login" replace />
      }>
        <Route index element={
          user?.role === 'admin' ? <AdminDashboard /> : <Dashboard />
        } />
        <Route path="form" element={<FormPage />} />
        <Route path="form/:id" element={<FormPage />} />
        <Route path="guide" element={<ProjectGuide />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="delete-requests" element={<DeleteRequests />} />
        <Route path="admin/delete-requests" element={<AdminDeleteRequests />} />
        <Route path="users" element={<UserManagement />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
