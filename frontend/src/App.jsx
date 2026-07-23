import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './App.css';
import Auth from './pages/Auth';
import ClientPortal from './pages/ClientPortal';
import AdminDashboard from './pages/AdminDashboard';
import Button from './components/Button';

// Protected Route Component to handle access logic
const ProtectedRoute = ({ children, allowedRoles }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading-text" style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const userRole = session.user.app_metadata.role;

  if (!allowedRoles.includes(userRole)) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <h2>Unauthorized Access</h2>
        <p style={{ marginBottom: '20px' }}>You do not have permission to view the admin dashboard.</p>

        <Button
          variant="danger"
          style={{ marginRight: '10px' }}
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/'; // Send back to login
          }}
        >
          Log Out
        </Button>

        <Button
          variant="primary"
          onClick={() => window.location.href = '/portal'}
        >
          Return to Portal
        </Button>
      </div>
    );
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/portal" element={<ClientPortal />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;