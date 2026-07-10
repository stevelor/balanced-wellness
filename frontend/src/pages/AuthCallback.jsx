import { useEffect } from 'react';
import { supabase } from '../supabaseClient'; // adjust path to your client
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const navigate = useNavigate();
  // Add a loading state that starts as true
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // 1. Check if they already have a valid session right now
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/client-portal'); // Your correct route!
      } else {
        setIsVerifying(false); // Stop verifying, show the login screen
      }
    });

    // 2. Listen for the moment they click the email link or log in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/client-portal');
      }
    });

    // Cleanup listener
    return () => subscription.unsubscribe();
  }, [navigate]);

  // If still checking Supabase, show the verifying message
  if (isVerifying) {
    return <div>Verifying your account...</div>;
  }

  // YOUR REGULAR LOGIN FORM CODE GOES HERE
  return (
    <div>
      {/* Ensure your normal email/password login inputs and buttons are here */}
      <h1>Log In to Balanced Wellness</h1>
    </div>
  );
};

export default AuthCallback;