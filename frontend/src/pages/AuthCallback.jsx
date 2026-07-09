import { useEffect } from 'react';
import { supabase } from '../supabaseClient'; // adjust path to your client
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // This function automatically exchanges the token for a session
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        navigate('/dashboard'); // Take them to your app
      }
    });
  }, [navigate]);

  return <div>Verifying your account...</div>;
};

export default AuthCallback;