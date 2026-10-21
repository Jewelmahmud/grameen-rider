import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import type { AppRole } from '../types';

interface Props extends PropsWithChildren {
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ allowedRoles, children }: Props) => {
  const { isAuthenticated, selectedRole } = useAuth();
  const isDevBypassEnabled = import.meta.env.DEV;

  if (isDevBypassEnabled) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && selectedRole && !allowedRoles.includes(selectedRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
