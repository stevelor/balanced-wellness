import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  // NEW: Check the user's role when the Navbar loads
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.app_metadata?.role === 'admin') {
        setIsAdmin(true)
      }
    }
    checkUserRole()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav style={{ 
      padding: '15px 30px', 
      backgroundColor: '#2c3e50', 
      color: 'white', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: 0, fontSize: '1.5em' }}>Balanced Wellness</h2>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/portal" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
          Client Portal
        </Link>
        
        {/* NEW: Conditionally render the Admin Dashboard link */}
        {isAdmin && (
          <Link to="/admin" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
            Admin Dashboard
          </Link>
        )}
        
        <button 
          onClick={handleLogout} 
          style={{ 
            backgroundColor: '#e74c3c', 
            color: 'white', 
            border: 'none', 
            padding: '8px 15px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}