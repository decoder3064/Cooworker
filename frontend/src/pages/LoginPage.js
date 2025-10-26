import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, signInWithGoogle, checkUserExists, createNewUser } from '../firebase';

function LoginPage() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      const uid = user.uid;
      // Store user ID in localStorage for use in other pages
      localStorage.setItem('user_id', uid);
      const isExisting = await checkUserExists(uid);
      if (!isExisting) {
        await createNewUser(uid, user);
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h2>Login to Cooworker</h2>
      <button style={{ padding: '10px 20px', fontSize: '16px' }} onClick={handleGoogleLogin}>
        Login with Google
      </button>
    </div>
  );
}

export default LoginPage;
