import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth({ session }) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    if (isSignUp) {
      // Supabase handles the actual account creation here
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) alert(error.message)
      else alert('Check your email for the confirmation link!')
    } else {
      // Supabase checks the credentials and logs the user in
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
    }
    setLoading(false)
  }

  // If the user is already logged in, show a welcome message and a logout button
  if (session) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Logged in as: {session.user.email}</h3>
        <button onClick={() => supabase.auth.signOut()}>Log Out</button>
      </div>
    )
  }

  // If not logged in, show the form
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center' }}>{isSignUp ? 'Create Account' : 'Client Login'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email: </label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password: </label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer' }}>
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
        </button>
      </form>
      <p 
        style={{ marginTop: '15px', cursor: 'pointer', color: '#0066cc', textAlign: 'center' }} 
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
      </p>
    </div>
  )
}