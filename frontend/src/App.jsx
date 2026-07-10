import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

// Import your page components
// Note: Double-check that your login file is named Login.jsx and is inside the pages folder. 
// If you called it Auth.jsx or put it in components, just update the path below!
import Login from './pages/Auth' 
import ClientPortal from './pages/ClientPortal'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. When the app first loads, ask Supabase to check the browser's memory for a saved login token
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false) // Finished checking!
    })

    // 2. Set up a listener that watches for any login or logout events in real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Cleanup the listener when the app unmounts
    return () => subscription.unsubscribe()
  }, [])

  // Show a blank screen or a tiny loading message for a split second while we check for a saved user
  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px', color: '#899E8B' }}>Loading...</div>
  }

  return (
    <Router>
      <Routes>
        {/* If there is NO session, show the Login page. If they ARE logged in, redirect straight to the Portal. */}
        <Route 
          path="/" 
          element={!session ? <Login /> : <Navigate to="/portal" />} 
        />
        
        {/* If they ARE logged in, show the Portal. If NO session, kick them back to the Login screen. */}
        <Route 
          path="/portal" 
          element={session ? <ClientPortal /> : <Navigate to="/" />} 
        />
        
        {/* Protect the Admin Dashboard using the exact same logic. */}
        <Route 
          path="/admin" 
          element={session ? <AdminDashboard /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  )
}