import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, sessionValid, initializing } = useAuth();
  const location = useLocation();

  // Show nothing while initializing to avoid flash of login page
  if (initializing) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!isAuthenticated || !sessionValid) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
