import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import ClientPortal from './pages/ClientPortal'
import AdminDashboard from './pages/AdminDashboard'
import Navbar from './components/Navbar'

export default function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // 1. Check if the user is logged in when the page first loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // 2. Set up a listener for any login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Clean up the listener if the app closes
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router>
      {/* SECURITY: Only render the Navbar if a session exists */}
      {session && <Navbar />}
      
      <Routes>
        {/* If NOT logged in, show Auth screen. If logged in, push to Portal */}
        <Route path="/" element={!session ? <Auth /> : <Navigate to="/portal" />} />
        
        {/* If logged in, show Portal. If NOT logged in, kick back to Auth ("/") */}
        <Route path="/portal" element={session ? <ClientPortal /> : <Navigate to="/" />} />
        
        {/* If logged in, show Admin. If NOT logged in, kick back to Auth ("/") */}
        <Route path="/admin" element={session ? <AdminDashboard /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  )
}