import { useState, useEffect } from 'react';
import { isAuthenticated } from './lib/supabase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExpenseTracker from './components/ExpenseTracker';
import FileStorage from './components/FileStorage';
import { EditModeProvider } from './contexts/EditModeContext';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);
      setLoading(false);
    };

    // Check URL path for routing
    const path = window.location.pathname;
    if (path === '/expense') {
      setCurrentPage('expense');
    } else if (path === '/files') {
      setCurrentPage('files');
    } else {
      setCurrentPage('dashboard');
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      if (path === '/expense') {
        setCurrentPage('expense');
      } else if (path === '/files') {
        setCurrentPage('files');
      } else {
        setCurrentPage('dashboard');
      }
    });

    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsAuth(true);
  };

  const navigate = (page) => {
    setCurrentPage(page);
    if (page === 'dashboard') {
      window.history.pushState({}, '', '/');
    } else {
      window.history.pushState({}, '', `/${page}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isAuth) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <EditModeProvider>
      {currentPage === 'expense' ? (
        <ExpenseTracker navigate={navigate} />
      ) : currentPage === 'files' ? (
        <FileStorage navigate={navigate} />
      ) : (
        <Dashboard navigate={navigate} />
      )}
    </EditModeProvider>
  );
}

export default App;
