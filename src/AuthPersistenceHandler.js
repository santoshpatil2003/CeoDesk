import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

const AuthPersistenceHandler = () => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is logged in and on /auth/signin, redirect to their previous or default page
    if (!loading && currentUser && location.pathname === '/auth/signin') {
      const prevPath = window.sessionStorage.getItem('lastPath');
      navigate(prevPath || '/dashboard', { replace: true });
    }
  }, [currentUser, loading, location.pathname, navigate]);

  useEffect(() => {
    // Store the last visited path for refresh persistence
    if (!loading && currentUser && location.pathname !== '/auth/signin') {
      window.sessionStorage.setItem('lastPath', location.pathname);
    }
  }, [currentUser, loading, location.pathname]);

  return null;
};

export default AuthPersistenceHandler;
