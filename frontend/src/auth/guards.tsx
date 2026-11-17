import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Permission } from '../api/types';
import { homeFor, useAuth } from './AuthProvider';

export function FullPageSpinner() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }} role="status" aria-label="Loading">
      <CircularProgress />
    </Box>
  );
}

/** Requires a session. Permissions are checked by the server too; this only hides what can't be used. */
export function RequireAuth({ children, staff }: PropsWithChildren<{ staff?: boolean }>) {
  const { status, me } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (staff && !me?.isStaff) return <Navigate to={homeFor(me)} replace />;
  return <>{children}</>;
}

export function RequirePermission({ perm, children }: PropsWithChildren<{ perm: Permission | Permission[] }>) {
  const { can } = useAuth();
  const { t } = useTranslation();
  const perms = Array.isArray(perm) ? perm : [perm];
  if (!can(...perms)) {
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        {t('common.noAccess')}
      </Alert>
    );
  }
  return <>{children}</>;
}

export function GuestOnly({ children }: PropsWithChildren) {
  const { status, me } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to={homeFor(me)} replace />;
  return <>{children}</>;
}
