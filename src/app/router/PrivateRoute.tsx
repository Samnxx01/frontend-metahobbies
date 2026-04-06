import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { getGovernedLoginPath, getGovernedPublicHomePath } from '@/app/services/governedNavigation';

interface PrivateRouteProps {
  children: ReactNode;
  requireAdmin?: boolean; // Nueva prop opcional
}

export const PrivateRoute = ({ children, requireAdmin = true }: PrivateRouteProps) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={getGovernedLoginPath()} replace state={{ from: location }} />;
  }
  
  // Solo verificar rol de admin si requireAdmin es true
  if (requireAdmin && user?.role !== 'ADMIN' && user?.role !== 'DESARROLLADOR' && user?.role !== 'DIOS') {
    return <Navigate to={getGovernedPublicHomePath()} replace />;
  }

  return <>{children}</>;
};
