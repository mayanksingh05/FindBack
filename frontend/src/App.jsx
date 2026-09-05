import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ReportModal from './components/ReportModal';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BrowseCatalog from './pages/BrowseCatalog';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Authenticating FindBack session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
  }

  return children;
}

function MainLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const [reportModalState, setReportModalState] = useState({
    isOpen: false,
    type: 'lost',
  });

  const openReport = (type = 'lost') => {
    setReportModalState({ isOpen: true, type });
  };

  const closeReport = () => {
    setReportModalState({ isOpen: false, type: 'lost' });
  };

  const handleReportSuccess = () => {
    // Reload or notify
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Loading FindBack...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isLoginPage && <Navbar onOpenReport={openReport} />}

      <main style={{ flex: 1 }}>
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route path="/login" element={<Login />} />

          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard onOpenReport={openReport} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard onOpenReport={openReport} />
              </ProtectedRoute>
            }
          />

          <Route path="/browse" element={<BrowseCatalog onOpenReport={openReport} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Report Modal */}
      <ReportModal
        type={reportModalState.type}
        isOpen={reportModalState.isOpen}
        onClose={closeReport}
        onSuccess={handleReportSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
