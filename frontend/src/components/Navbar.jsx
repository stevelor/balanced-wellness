import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useState, useEffect } from 'react'
import Button from './Button'

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
      padding: '15px 20px', // Adjusted padding to save space on mobile
      backgroundColor: '#ffffff', 
      display: 'flex',
      flexWrap: 'wrap', // <-- THIS IS THE MAGIC FIX: Allows wrapping on small screens
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '15px', // Adds breathing room between the title and links when they stack
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      borderBottom: '1px solid #eaeaea'
    }}>
      <h2 style={{ margin: 0, fontSize: '1.5em', fontFamily: '"Lora", serif', color: '#899E8B' }}>
        Balanced Wellness
      </h2>

      {/* Added flexWrap here as well so the links themselves stack if necessary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'center' }}>

        <a
          href="https://www.healwithdonna.com/"
          style={{ color: '#555', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}
        >
          Return to Main Website
        </a>

        <Link to="/portal" style={{ color: '#555', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>
          Portal Home
        </Link>

        {isAdmin && (
          <Link to="/admin" style={{ color: '#555', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>
            Admin Dashboard
          </Link>
        )}

        <Button variant="secondary" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
          Logout
        </Button>
      </div>
    </nav>
  )
}