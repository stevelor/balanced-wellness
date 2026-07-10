import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Ensure this path is correct
import Auth from './pages/AuthCallback';
import ClientPortal from './pages/ClientPortal';
import AdminDashboard from './pages/AdminDashboard';

// 1. Protected Route Component to handle access logic
const ProtectedRoute = ({ children, allowedRoles }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Check the role from the session metadata
  const userRole = session.user.app_metadata.role;

  if (!allowedRoles.includes(userRole)) {
    return <div>Unauthorized Access</div>;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/portal" element={<ClientPortal />} />
        
        {/* 2. Wrap the Admin Dashboard with the ProtectedRoute */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;