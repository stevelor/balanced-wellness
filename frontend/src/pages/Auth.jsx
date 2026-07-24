import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // NEW: State to control whether we show the dedicated Reset screen
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If they are logged in, make sure they aren't actively clicking a recovery link
      if (session && !window.location.hash.includes('type=recovery')) {
        navigate('/portal'); 
      } else {
        setIsVerifying(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // THE FIX: Listen specifically for password recovery and route them to the new page
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password');
      } else if (event === 'SIGNED_IN' && session) {
        // Prevent normal login routing if they are recovering a password
        if (!window.location.hash.includes('type=recovery')) {
          navigate('/portal');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Check your email for the confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert("Password reset link sent! Please check your email.");
      setIsResetting(false); // Send them back to the normal login view
    }
    setLoading(false);
  };

  if (isVerifying) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Verifying your account...</div>;
  }

  // --- THE NEW DEDICATED FORGOT PASSWORD SCREEN ---
  if (isResetting) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
        <h2 style={{ textAlign: 'center' }}>Reset Password</h2>
        <p style={{ textAlign: 'center', fontSize: '0.9em', color: '#666', marginBottom: '20px' }}>
          Enter your email address and we will send you a link to reset your password.
        </p>
        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email: </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p 
          style={{ marginTop: '15px', cursor: 'pointer', color: '#0066cc', textAlign: 'center' }} 
          onClick={() => setIsResetting(false)}
        >
          Back to Login
        </p>
      </div>
    );
  }

  // --- THE STANDARD LOGIN / SIGN UP SCREEN ---
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>{isSignUp ? 'Create Account' : 'Client Login'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email: </label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password: </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px', paddingRight: '40px', boxSizing: 'border-box' }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {showPassword ? "🙈" : "👁️"} 
            </button>
          </div>
          
          {/* Changes view instead of triggering email send instantly */}
          {!isSignUp && (
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <button type="button" onClick={() => setIsResetting(true)} style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontSize: '0.9em', padding: 0 }}>
                Forgot Password?
              </button>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
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
  );
}