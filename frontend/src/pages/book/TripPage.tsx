import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingApi } from '../../api/api';
import type { TripStatus } from '../../api/types';
import { CardSkeleton, ConfirmDialog, ErrorAlert, StatusChip, useNotify } from '../../components/common';
import { MapView, PINS } from '../../components/map';
import { vehicleLabel } from '../../i18n';
import { dateTime, fullName, money, num } from '../../lib/format';

const CANCELLABLE: TripStatus[] = ['pending', 'scheduled', 'searching_driver', 'accepted', 'driver_assigned', 'driver_arriving', 'driver_arrived'];
const LIVE: TripStatus[] = ['pending', 'searching_driver', 'accepted', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress', 'scheduled'];

/** Live trip status. Polls while the trip is in progress (the socket feed is a follow-up for the web). */
export default function TripPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const notify = useNotify();
  const [cancelOpen, setCancelOpen] = useState(false);
  const q = useQuery({
    queryKey: ['trip', id],
    queryFn: () => bookingApi.trip(id),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (!s || !LIVE.includes(s)) return false;
      return s === 'scheduled' ? 60_000 : 4_000;
    },
  });
  const cancel = useMutation({
    mutationFn: (reason: string) => bookingApi.cancel(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trip', id] });
      void qc.invalidateQueries({ queryKey: ['my-trips'] });
      setCancelOpen(false);
      notify(t('common.saved'));
    },
  });

  const trip = q.data;
  if (q.isLoading) return <CardSkeleton rows={4} />;
  if (!trip) return <ErrorAlert error={q.error} onRetry={() => q.refetch()} />;

  const s = trip.status;
  const driverName = trip.driver ? fullName(trip.driver.userProfile) : null;
  const points: [number, number][] = [
    [Number(trip.pickupLatitude), Number(trip.pickupLongitude)],
    ...(trip.stops ?? []).map((p) => [p.latitude, p.longitude] as [number, number]),
    [Number(trip.dropoffLatitude), Number(trip.dropoffLongitude)],
  ];

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h1">
                {t('trips.number')} {trip.tripNumber}
              </Typography>
              <StatusChip status={s} size="medium" />
            </Stack>

            <Box aria-live="polite">
              {(s === 'searching_driver' || s === 'pending') && (
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 600 }}>{t('book.finding')}</Typography>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary">{t('book.findingSub')}</Typography>
                </Stack>
              )}
              {s === 'scheduled' && <Alert severity="info" sx={{ mb: 2 }}>{t('book.scheduledFor', { time: dateTime(trip.scheduledDatetime) })}</Alert>}
              {s === 'no_driver_found' && (
                <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" component={RouterLink} to="/book">{t('book.tryAgain')}</Button>}>
                  {t('book.noDriver')}
                </Alert>
              )}
              {['accepted', 'driver_assigned', 'driver_arriving'].includes(s) && <Alert severity="success" sx={{ mb: 2 }}>{t('book.driverOnWay')}</Alert>}
              {s === 'completed' && <Alert severity="success" sx={{ mb: 2 }}>{t('book.tripDone')}</Alert>}
            </Box>

            {driverName && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">{t('trips.driver')}</Typography>
                <Typography sx={{ fontWeight: 600 }}>{driverName}</Typography>
                {trip.driver?.userProfile?.phoneNumber && (
                  <Typography>
                    <a href={`tel:${trip.driver.userProfile.phoneNumber}`}>{trip.driver.userProfile.phoneNumber}</a>
                  </Typography>
                )}
                {trip.vehicle && (
                  <Typography variant="body2" color="text.secondary">
                    {[vehicleLabel(t, trip.vehicle.vehicleType), trip.vehicle.make, trip.vehicle.model, trip.vehicle.color, trip.vehicle.licensePlate].filter(Boolean).join(' · ')}
                  </Typography>
                )}
              </Box>
            )}

            <Line label={t('book.pickup')} value={trip.pickupAddress} />
            {(trip.stops ?? []).map((p, i) => <Line key={i} label={`${t('book.stops')} ${i + 1}`} value={p.address} />)}
            <Line label={t('book.dropoff')} value={trip.dropoffAddress} />
            {trip.scheduledDatetime && <Line label={t('trips.scheduled')} value={dateTime(trip.scheduledDatetime)} />}
            <Line label={`${t('service.' + trip.serviceType)} · ${vehicleLabel(t, trip.vehicleType)}`} value={`${num(trip.distanceKm, 1)} km`} />
            {Number(trip.discountAmount ?? 0) > 0 && <Line label={Number(trip.employeeDiscountAmount ?? 0) > 0 ? t('book.employeeDiscount') : t('book.promoDiscount')} value={`− ${money(trip.discountAmount)}`} />}
            <Line label={t('book.total')} value={money(trip.totalFare)} strong />
            <Line label={t('book.payment')} value={t(`book.${trip.paymentMethod}`, { defaultValue: trip.paymentMethod })} />

            <ErrorAlert error={q.error} />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button component={RouterLink} to="/book/trips">{t('nav.myTrips')}</Button>
              {CANCELLABLE.includes(s) && (
                <Button color="error" variant="outlined" onClick={() => setCancelOpen(true)}>{t('book.cancelTrip')}</Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <MapView
          height={420}
          markers={points.map((p, i) => ({ position: p, icon: i === 0 ? PINS.pickup : i === points.length - 1 ? PINS.dropoff : PINS.stop }))}
          line={trip.roundTrip ? [...points, points[0]] : points}
        />
      </Grid>
      <ConfirmDialog
        open={cancelOpen}
        danger
        requireReason
        title={`${t('book.cancelTrip')}?`}
        body={t('book.cancelReason')}
        busy={cancel.isPending}
        error={cancel.error}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => cancel.mutate(reason)}
      />
    </Grid>
  );
}

function Line({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.5, justifyContent: 'space-between' }}>
      <Typography color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ textAlign: 'right', fontWeight: strong ? 700 : undefined, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Stack>
  );
}
