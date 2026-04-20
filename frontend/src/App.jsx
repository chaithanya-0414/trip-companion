import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TripProvider } from './context/TripContext';
import Navbar from './components/Navbar';
import ChatPanel from './components/ChatPanel';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Itinerary from './pages/Itinerary';
import Settlements from './pages/Settlements';
import Admin from './pages/Admin';

function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, marginLeft: '240px', background: 'var(--navy-950)', minHeight: '100vh' }}>
        <Outlet />
      </main>
      <ChatPanel />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const devBypass = sessionStorage.getItem('dev_bypass');
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-950)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--teal-400)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading TripSync...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
  return (user || devBypass) ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/expenses"    element={<Expenses />} />
        <Route path="/itinerary"   element={<Itinerary />} />
        <Route path="/settlements" element={<Settlements />} />
        <Route path="/admin"       element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TripProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'toast-custom',
              duration: 3500,
              style: {
                background: 'var(--navy-800)',
                color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                fontSize: '13px',
              },
            }}
          />
        </TripProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
