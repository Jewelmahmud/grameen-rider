import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { opsApi, peopleApi } from '../../api/api';
import type { Vehicle } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { CardSkeleton, ConfirmDialog, ErrorAlert, PageHeader, StatusChip, useNotify } from '../../components/common';
import { vehicleLabel } from '../../i18n';
import { dateOnly, dateTime, fromNow, fullName, money, num } from '../../lib/format';
import { VERIFY_COLOR } from './DriversPage';

export default function DriverDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { can } = useAuth();
  const qc = useQueryClient();
  const notify = useNotify();
  const q = useQuery({ queryKey: ['admin-driver', id], queryFn: () => peopleApi.driver(id) });
  const trips = useQuery({ queryKey: ['admin-trips', { driverId: id, pageSize: 10 }], queryFn: () => opsApi.trips({ driverId: id, pageSize: 10 }) });
  const [dialog, setDialog] = useState<'suspend' | 'reject' | null>(null);

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['admin-driver', id] });
    void qc.invalidateQueries({ queryKey: ['admin-drivers'] });
    setDialog(null);
    notify(t('common.saved'));
  };
  const verify = useMutation({ mutationFn: (v: { status: 'approved' | 'rejected'; reason?: string }) => peopleApi.verifyDriver(id, v.status, v.reason), onSuccess: done });
  const suspend = useMutation({ mutationFn: (reason: string) => peopleApi.suspend(id, reason), onSuccess: done });
  const unsuspend = useMutation({ mutationFn: () => peopleApi.unsuspend(id), onSuccess: done });
  const vehicle = useMutation({
    mutationFn: (v: { id: string; patch: Partial<Vehicle> }) => peopleApi.updateVehicle(v.id, v.patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-driver', id] });
      notify(t('common.saved'));
    },
  });

  const d = q.data;
  const name = fullName(d?.userProfile);

  return (
    <>
      <PageHeader
        title={name}
        crumbs={[{ label: t('nav.people') }, { label: t('nav.drivers'), to: '/console/drivers' }]}
        action={
          d && (
            <>
              {can('drivers.verify') && d.verificationStatus !== 'approved' && (
                <Button variant="contained" onClick={() => verify.mutate({ status: 'approved' })} disabled={verify.isPending}>Approve</Button>
              )}
              {can('drivers.verify') && d.verificationStatus === 'pending' && (
                <Button color="error" onClick={() => setDialog('reject')}>Reject</Button>
              )}
              {can('drivers.suspend') &&
                (d.isSuspended ? (
                  <Button onClick={() => unsuspend.mutate()} disabled={unsuspend.isPending}>Lift suspension</Button>
                ) : (
                  <Button color="error" variant="outlined" onClick={() => setDialog('suspend')}>Suspend</Button>
                ))}
            </>
          )
        }
      />
      <ErrorAlert error={q.error ?? verify.error ?? unsuspend.error ?? vehicle.error} onRetry={q.error ? () => q.refetch() : undefined} />
      {q.isLoading && <CardSkeleton rows={4} />}
      {d && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            {d.isSuspended && <Alert severity="error" sx={{ mb: 2 }}>Suspended: {d.suspendedReason}</Alert>}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip size="small" color={VERIFY_COLOR[d.verificationStatus]} label={d.verificationStatus} />
                  <Chip size="small" variant={d.isOnline ? 'filled' : 'outlined'} color={d.isOnline ? 'success' : 'default'} label={d.isOnline ? 'Online' : 'Offline'} />
                </Stack>
                <Row label={t('auth.phone')} value={d.userProfile?.phoneNumber} />
                <Row label="Licence" value={d.licenseNumber} />
                <Row label="Rating" value={num(d.rating as number, 2)} />
                <Row label="Trips" value={d.totalRides} />
                <Row label="Last location" value={fromNow(d.currentLocationUpdatedAt)} />
                <Row label="Joined" value={dateOnly(d.createdAt)} />
              </CardContent>
            </Card>
            {d.last30Days && (
              <Card>
                <CardHeader title="Offers, last 30 days" slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }} sx={{ pb: 0 }} />
                <CardContent>
                  <Row label="Accept rate" value={d.last30Days.acceptRate === null ? '—' : `${Math.round(d.last30Days.acceptRate * 100)}%`} />
                  {d.last30Days.offers.map((o) => <Row key={o.outcome} label={o.outcome} value={o.count} />)}
                </CardContent>
              </Card>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ mb: 2 }}>
              <CardHeader title="Vehicles" slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }} sx={{ pb: 0 }} />
              <CardContent>
                {(d.vehicles ?? []).length === 0 && <Typography color="text.secondary">{t('common.empty')}</Typography>}
                <Stack spacing={2}>
                  {(d.vehicles ?? []).map((v) => (
                    <Card key={v.id} variant="outlined">
                      <CardContent>
                        <Typography sx={{ fontWeight: 600 }}>
                          {vehicleLabel(t, v.vehicleType)} · {[v.make, v.model, v.year].filter(Boolean).join(' ')}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>{[v.licensePlate, v.color].filter(Boolean).join(' · ')}</Typography>
                        <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2 }}>
                          {(['isVerified', 'isActive', 'servesRide', 'servesRental'] as const).map((k) => (
                            <FormControlLabel
                              key={k}
                              control={
                                <Switch
                                  checked={Boolean(v[k])}
                                  disabled={!can('vehicles.verify') || vehicle.isPending}
                                  onChange={(e) => vehicle.mutate({ id: v.id, patch: { [k]: e.target.checked } })}
                                />
                              }
                              label={{ isVerified: 'Verified', isActive: t('common.active'), servesRide: t('service.ride'), servesRental: t('service.rental') }[k]}
                            />
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title={t('nav.trips')} slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }} sx={{ pb: 0 }} />
              <CardContent sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('trips.number')}</TableCell>
                      <TableCell>{t('common.status')}</TableCell>
                      <TableCell>{t('trips.requested')}</TableCell>
                      <TableCell align="right">{t('trips.total')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(trips.data?.items ?? []).map((tr) => (
                      <TableRow key={tr.id} hover component={RouterLink} to={`/console/trips/${tr.id}`} sx={{ textDecoration: 'none' }}>
                        <TableCell>{tr.tripNumber}</TableCell>
                        <TableCell><StatusChip status={tr.status} /></TableCell>
                        <TableCell>{dateTime(tr.requestedAt)}</TableCell>
                        <TableCell align="right">{money(tr.totalFare)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      <ConfirmDialog
        open={dialog === 'suspend'}
        danger
        requireReason
        title={`Suspend ${name}?`}
        body="They go offline and get no offers until the suspension is lifted."
        busy={suspend.isPending}
        error={suspend.error}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => suspend.mutate(reason)}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        danger
        requireReason
        title={`Reject ${name}?`}
        busy={verify.isPending}
        error={verify.error}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => verify.mutate({ status: 'rejected', reason })}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" sx={{ py: 0.5, justifyContent: 'space-between' }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</Typography>
    </Stack>
  );
}
