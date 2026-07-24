import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // This tells Supabase to overwrite the password for the current session
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert('Password successfully updated!');
      navigate('/portal'); // Send them back to the portal
    }
    
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>Reset Password</h2>
      <p style={{ textAlign: 'center', fontSize: '0.9em', color: '#666' }}>Please enter your new password below.</p>
      
      <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>New Password: </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px', paddingRight: '40px', boxSizing: 'border-box' }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0' }}
            >
              {showPassword ? "🙈" : "👁️"} 
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          {loading ? 'Updating...' : 'Save New Password'}
        </button>
      </form>
    </div>
  );
}