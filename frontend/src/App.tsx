import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Chat } from './pages/Chat';
import { Documents } from './pages/Documents';
import { UploadDocument } from './pages/UploadDocument';
import { DocumentDetail } from './pages/DocumentDetail';
import { History } from './pages/History';
import { UserManagement } from './pages/UserManagement';
import { RolePermissionManagement } from './pages/RolePermissionManagement';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Enterprise Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="chat" element={<Chat />} />
              <Route path="documents" element={<Documents />} />
              <Route path="upload" element={<UploadDocument />} />
              <Route path="documents/:id" element={<DocumentDetail />} />
              <Route path="history" element={<History />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="permissions" element={<RolePermissionManagement />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
