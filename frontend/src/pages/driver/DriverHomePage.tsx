import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import PhoneAndroidOutlined from '@mui/icons-material/PhoneAndroidOutlined';
import { useTranslation } from 'react-i18next';
import { customerApi } from '../../api/api';
import { usePublicConfig } from '../../api/hooks';
import { useAuth } from '../../auth/AuthProvider';
import { CardSkeleton, ErrorAlert } from '../../components/common';
import { useSiteCopy } from '../../content/site';
import { vehicleLabel } from '../../i18n';

/** Where to download the driver app; set per environment. */
const DRIVER_APP_URL = import.meta.env.VITE_DRIVER_APP_URL?.trim();

/** Drivers work in the mobile app; the web shows their status and where to get the app. */
export default function DriverHomePage() {
  const c = useSiteCopy().driverHome;
  const { t } = useTranslation();
  const { me } = useAuth();
  const config = usePublicConfig();
  const phone = config.data?.['support.phone'] as string | undefined;
  const driver = useQuery({
    queryKey: ['driver-me'],
    queryFn: customerApi.driverMe,
    retry: false,
  });
  const notRegistered = axios.isAxiosError(driver.error) && driver.error.response?.status === 404;
  const d = driver.data;

  const status = notRegistered
    ? { severity: 'info' as const, text: c.notRegistered }
    : d?.isSuspended
      ? { severity: 'error' as const, text: c.suspended }
      : d?.verificationStatus === 'approved'
        ? { severity: 'success' as const, text: c.approved }
        : d?.verificationStatus === 'rejected'
          ? { severity: 'error' as const, text: c.rejected }
          : d
            ? { severity: 'warning' as const, text: c.pending }
            : null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>{c.title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>{c.body}</Typography>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>{c.statusTitle}</Typography>
              {driver.isLoading && <CardSkeleton rows={2} />}
              {!notRegistered && <ErrorAlert error={driver.error} onRetry={() => driver.refetch()} />}
              {status && <Alert severity={status.severity}>{status.text}</Alert>}
              {d?.vehicles && d.vehicles.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                  {d.vehicles.map((v) => (
                    <Chip key={v.id} label={`${vehicleLabel(t, v.vehicleType)}${v.licensePlate ? ` · ${v.licensePlate}` : ''}`} color={v.isVerified ? 'success' : 'default'} variant="outlined" />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <PhoneAndroidOutlined color="primary" fontSize="large" aria-hidden />
              <Typography variant="h6" component="h2" sx={{ mt: 1 }}>{c.getApp}</Typography>
              {DRIVER_APP_URL ? (
                <Button variant="contained" href={DRIVER_APP_URL} target="_blank" rel="noopener" sx={{ mt: 2, minHeight: 44 }}>
                  {c.getApp}
                </Button>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {c.appSoon}
                  {phone && <> <a href={`tel:${phone}`}>{phone}</a></>}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {me?.permissions.includes('trips.book') && (
        <Button component={RouterLink} to="/book" sx={{ mt: 3 }}>{c.bookToo}</Button>
      )}
    </Container>
  );
}
