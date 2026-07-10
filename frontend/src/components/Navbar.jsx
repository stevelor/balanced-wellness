import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

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
      backgroundColor: '#ffffff', // Softened to white for a cleaner, premium look
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      borderBottom: '1px solid #eaeaea'
    }}>
      {/* Updated to match the new Lora serif font and sage green brand color */}
      <h2 style={{ margin: 0, fontSize: '1.5em', fontFamily: '"Lora", serif', color: '#899E8B' }}>
        Balanced Wellness
      </h2>
      
      <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
        
        {/* CHANGED: The Escape Hatch link back to Donna's main Wix site */}
        <a 
          href="https://www.healwithdonna.com/" 
          style={{ color: '#555', textDecoration: 'none', fontWeight: '500' }}
        >
          Return to Main Website
        </a>

        <Link to="/portal" style={{ color: '#555', textDecoration: 'none', fontWeight: '500' }}>
          Portal Home
        </Link>
        
        {isAdmin && (
          <Link to="/admin" style={{ color: '#555', textDecoration: 'none', fontWeight: '500' }}>
            Admin Dashboard
          </Link>
        )}
        
        {/* Updated logout button to be less harsh than the bright red */}
        <button 
          onClick={handleLogout} 
          style={{ 
            backgroundColor: '#F4F1EA', 
            color: '#555', 
            border: '1px solid #ddd', 
            padding: '8px 16px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'background-color 0.3s ease'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}