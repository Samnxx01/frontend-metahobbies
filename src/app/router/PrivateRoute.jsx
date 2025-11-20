import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export const PrivateRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user.role !== 'ADMIN' && user.role !== 'DESARROLLADOR') {
    return <Navigate to="/" replace />;
  }

  return children;
};