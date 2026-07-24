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
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !window.location.hash.includes('type=recovery')) {
        navigate('/portal'); 
      } else {
        setIsVerifying(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password');
      } else if (event === 'SIGNED_IN' && session) {
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
      if (error) alert(error.message); // If you have react-hot-toast imported here, change to toast.error!
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
      setIsResetting(false); 
    }
    setLoading(false);
  };

  if (isVerifying) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif', color: '#666' }}>Verifying your account...</div>;
  }

  // --- STYLED FORGOT PASSWORD SCREEN ---
  if (isResetting) {
    return (
      <div style={{ maxWidth: '420px', margin: '80px auto', padding: '40px 30px', backgroundColor: '#ffffff', border: '1px solid #eaeaea', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.04)', fontFamily: 'sans-serif' }}>
        <h2 style={{ textAlign: 'center', color: '#2c3e50', margin: '0 0 10px 0', fontSize: '1.8rem' }}>Reset Password</h2>
        <p style={{ textAlign: 'center', fontSize: '0.95rem', color: '#666', marginBottom: '25px', lineHeight: '1.5' }}>
          Enter your email address and we will send you a link to reset your password.
        </p>
        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '0.95rem' }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', boxSizing: 'border-box', fontSize: '1rem', outlineColor: '#899E8B' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '14px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: loading ? '#aebfad' : '#899E8B', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.05rem', marginTop: '10px', boxShadow: '0 4px 6px rgba(137, 158, 139, 0.2)' }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p 
          style={{ marginTop: '20px', cursor: 'pointer', color: '#899E8B', textAlign: 'center', fontWeight: '500', fontSize: '0.95rem' }} 
          onClick={() => setIsResetting(false)}
        >
          &larr; Back to Login
        </p>
      </div>
    );
  }

  // --- STYLED LOGIN / SIGN UP SCREEN ---
  return (
    <div style={{ maxWidth: '420px', margin: '80px auto', padding: '40px 30px', backgroundColor: '#ffffff', border: '1px solid #eaeaea', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.04)', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50', margin: '0 0 5px 0', fontSize: '1.8rem' }}>
        {isSignUp ? 'Create Account' : 'Welcome Back'}
      </h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '25px', fontSize: '0.95rem' }}>
        {isSignUp ? 'Join Balanced Wellness to book sessions.' : 'Log in to manage your healing sessions.'}
      </p>

      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '0.95rem' }}>Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', boxSizing: 'border-box', fontSize: '1rem', outlineColor: '#899E8B' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#2c3e50', fontSize: '0.95rem' }}>Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', paddingRight: '45px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', boxSizing: 'border-box', fontSize: '1rem', outlineColor: '#899E8B' }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"} 
            </button>
          </div>
          
          {!isSignUp && (
            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <button type="button" onClick={() => setIsResetting(true)} style={{ background: 'none', border: 'none', color: '#899E8B', cursor: 'pointer', fontSize: '0.9rem', padding: 0, fontWeight: '500' }}>
                Forgot Password?
              </button>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} style={{ padding: '14px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: loading ? '#aebfad' : '#899E8B', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.05rem', marginTop: '10px', boxShadow: '0 4px 6px rgba(137, 158, 139, 0.2)' }}>
          {loading ? 'Processing...' : isSignUp ? 'Create My Account' : 'Log In'}
        </button>
      </form>
      
      <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#666' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}
        </p>
        <button 
          type="button"
          style={{ background: 'none', border: 'none', color: '#899E8B', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', padding: '5px 10px', marginTop: '5px' }} 
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? 'Log In Here' : 'Sign Up Here'}
        </button>
      </div>
    </div>
  );
}