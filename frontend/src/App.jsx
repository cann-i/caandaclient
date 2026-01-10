import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import Pages
import LoginPage from './pages/LoginPage';
import CALayout from './layouts/CALayout';
import ClientLayout from './layouts/ClientLayout';
import Dashboard from './pages/CA/Dashboard';
import Clients from './pages/CA/Clients';
import Documents from './pages/CA/Documents';
import UploadDocs from './pages/CA/UploadDocs';
import Returns from './pages/CA/Returns';
import Reports from './pages/CA/Reports';
import Invoices from './pages/CA/Invoices';
import ClientReportPage from './pages/CA/reports/ClientReport';
import DocumentReport from './pages/CA/reports/DocumentReport';
import PaymentReport from './pages/CA/reports/PaymentReport';
import RequestReport from './pages/CA/reports/RequestReport';
import ClientDocuments from './pages/Client/ClientDocuments';
import ClientRequests from './pages/Client/ClientRequests';
import ClientReturns from './pages/Client/ClientReturns';
import ClientRequest from './pages/CA/requests/ClientRequest';
import ClientDashboard from './pages/Client/ClientDashboard';
import ClientInvoices from './pages/Client/ClientInvoices';
import ClientProfile from './pages/Client/ClientProfile';


import ProfilePage from './pages/CA/ProfilePage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('userRole') || '';
  }); // 'ca' or 'client'
  const [toasts, setToasts] = useState([]);

  // Toast Notification System
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Login Handler
  const handleLogin = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    showToast(`Welcome! Logged in as ${role === 'ca' ? 'CA/Admin' : 'Client'}`, 'success');
  };

  // Logout Handler
  const handleLogout = () => {
    // Save the current role as the last login type before clearing session
    if (userRole) {
      localStorage.setItem('lastLoginType', userRole);
    }

    setIsAuthenticated(false);
    setUserRole('');
    // Clear all storage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    showToast('Logged out successfully', 'info');
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, allowedRole }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRole && userRole !== allowedRole) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <Router>
      <div className="App">
        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`toast flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' :
                toast.type === 'error' ? 'bg-red-500' :
                  toast.type === 'warning' ? 'bg-amber-500' :
                    'bg-blue-500'
                }`}
            >
              <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' :
                toast.type === 'error' ? 'fa-exclamation-circle' :
                  toast.type === 'warning' ? 'fa-exclamation-triangle' :
                    'fa-info-circle'
                }`}></i>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>

        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={
              isAuthenticated ?
                <Navigate to={userRole === 'ca' ? '/dashboard' : '/client/dashboard'} replace /> :
                <LoginPage onLogin={handleLogin} showToast={showToast} />
            }
          />

          {/* CA/Admin Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <Dashboard showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <ProfilePage showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <Clients showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <Documents showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-docs"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <UploadDocs showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/returns"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <Returns showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />

          {/* Reports Routes */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <Reports showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/client"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <ClientReportPage showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/document"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <DocumentReport showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/payment"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <PaymentReport showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/request"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <RequestReport showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <Invoices showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />

          {/* Request Module Routes */}
          <Route
            path="/requests/client"
            element={
              <ProtectedRoute allowedRole="ca">
                <CALayout onLogout={handleLogout} showToast={showToast}>
                  <ClientRequest showToast={showToast} />
                </CALayout>
              </ProtectedRoute>
            }
          />


          {/* Client Routes */}
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedRole="client">
                <ClientLayout onLogout={handleLogout} showToast={showToast}>
                  <ClientDashboard showToast={showToast} />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/documents"
            element={
              <ProtectedRoute allowedRole="client">
                <ClientLayout onLogout={handleLogout} showToast={showToast}>
                  <ClientDocuments showToast={showToast} />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/requests"
            element={
              <ProtectedRoute allowedRole="client">
                <ClientLayout onLogout={handleLogout} showToast={showToast}>
                  <ClientRequests showToast={showToast} />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/returns"
            element={
              <ProtectedRoute allowedRole="client">
                <ClientLayout onLogout={handleLogout} showToast={showToast}>
                  <ClientReturns showToast={showToast} />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/invoices"
            element={
              <ProtectedRoute allowedRole="client">
                <ClientLayout onLogout={handleLogout} showToast={showToast}>
                  <ClientInvoices showToast={showToast} />
                </ClientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute allowedRole="client">
                <ClientLayout onLogout={handleLogout} showToast={showToast}>
                  <ClientProfile showToast={showToast} />
                </ClientLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route
            path="/"
            element={
              isAuthenticated ?
                <Navigate to={userRole === 'ca' ? '/dashboard' : '/client/dashboard'} replace /> :
                <Navigate to="/login" replace />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;