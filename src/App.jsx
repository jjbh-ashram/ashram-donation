import { useState, useEffect } from 'react';
import { isAuthenticated } from './lib/supabase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    setIsAuth(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <>
      {isAuth ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
