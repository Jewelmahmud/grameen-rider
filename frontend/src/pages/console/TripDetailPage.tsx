import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { opsApi } from '../../api/api';
import type { TripOffer } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { ACTIVE_STATUSES, CardSkeleton, ConfirmDialog, EmployeeBadge, ErrorAlert, PageHeader, StatusChip, useNotify } from '../../components/common';
import { MapView, PINS } from '../../components/map';
import { vehicleLabel } from '../../i18n';
import { dateTime, fullName, money, num } from '../../lib/format';
import { AssignDriverDialog } from './AssignDriverDialog';

const OUTCOME_COLOR: Record<TripOffer['outcome'], 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  pending: 'info',
  accepted: 'success',
  declined: 'error',
  timeout: 'warning',
  cancelled: 'default',
};

export default function TripDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { can } = useAuth();
  const qc = useQueryClient();
  const notify = useNotify();
  const q = useQuery({ queryKey: ['admin-trip', id], queryFn: () => opsApi.trip(id), refetchInterval: 10_000 });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-trip', id] });
    void qc.invalidateQueries({ queryKey: ['admin-trips'] });
  };
  const cancel = useMutation({
    mutationFn: (reason: string) => opsApi.cancelTrip(id, reason),
    onSuccess: () => {
      refresh();
      setCancelOpen(false);
      notify(t('common.saved'));
    },
  });
  const redispatch = useMutation({
    mutationFn: () => opsApi.redispatch(id),
    onSuccess: () => {
      refresh();
      notify(t('common.saved'));
    },
  });

  const trip = q.data?.trip;
  const offers = q.data?.offers ?? [];
  const open = trip && (ACTIVE_STATUSES.includes(trip.status) || trip.status === 'scheduled' || trip.status === 'no_driver_found');
  const intervene = can('trips.intervene') && open;

  return (
    <>
      <PageHeader
        title={trip ? `${t('trips.number')} ${trip.tripNumber}` : t('trips.number')}
        crumbs={[{ label: t('nav.operations') }, { label: t('nav.trips'), to: '/console/trips' }]}
        action={
          intervene && (
            <>
              <Button onClick={() => redispatch.mutate()} disabled={redispatch.isPending}>{t('trips.redispatch')}</Button>
              <Button onClick={() => setAssignOpen(true)}>{t('trips.assign')}</Button>
              <Button color="error" variant="outlined" onClick={() => setCancelOpen(true)}>{t('trips.cancel')}</Button>
            </>
          )
        }
      />
      <ErrorAlert error={q.error ?? redispatch.error} onRetry={q.error ? () => q.refetch() : undefined} />
      {q.isLoading && <CardSkeleton rows={4} />}
      {trip && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <StatusChip status={trip.status} size="medium" />
                  <Chip label={t(`service.${trip.serviceType}`)} />
                  <Chip label={vehicleLabel(t, trip.vehicleType)} />
                  {trip.pricingMode === 'route' && <Chip color="info" label={t('book.fixedRoute')} />}
                  {trip.roundTrip && <Chip label={t('book.roundTrip')} />}
                </Stack>
                <Detail label={t('book.pickup')} value={trip.pickupAddress} />
                {(trip.stops ?? []).map((s, i) => <Detail key={i} label={`${t('book.stops')} ${i + 1}`} value={s.address} />)}
                <Detail label={t('book.dropoff')} value={trip.dropoffAddress} />
                <Detail label={t('trips.requested')} value={dateTime(trip.requestedAt)} />
                {trip.scheduledDatetime && <Detail label={t('trips.scheduled')} value={dateTime(trip.scheduledDatetime)} />}
                <Detail label="Distance" value={`${num(trip.distanceKm)} km · ~${trip.estimatedDurationMinutes ?? '—'} min`} />
                {trip.cancellationReason && <Detail label={t('common.reason')} value={`${trip.cancellationReason} (${trip.cancelledBy ?? ''})`} />}
                {trip.specialInstructions && <Detail label={t('book.note')} value={trip.specialInstructions} />}
              </CardContent>
            </Card>
            <MapView
              height={300}
              markers={[
                { position: [Number(trip.pickupLatitude), Number(trip.pickupLongitude)], icon: PINS.pickup },
                ...(trip.stops ?? []).map((s) => ({ position: [s.latitude, s.longitude] as [number, number], icon: PINS.stop })),
                { position: [Number(trip.dropoffLatitude), Number(trip.dropoffLongitude)], icon: PINS.dropoff },
              ]}
              line={[
                [Number(trip.pickupLatitude), Number(trip.pickupLongitude)],
                ...(trip.stops ?? []).map((s) => [s.latitude, s.longitude] as [number, number]),
                [Number(trip.dropoffLatitude), Number(trip.dropoffLongitude)],
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ mb: 2 }}>
              <CardHeader title={t('trips.passenger')} slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }} sx={{ pb: 0 }} />
              <CardContent>
                <Typography>{fullName(trip.passenger)}</Typography>
                <Typography color="text.secondary">{trip.passenger?.phoneNumber}</Typography>
                {trip.isEmployeeBooking && <Box sx={{ mt: 1 }}><EmployeeBadge designation={trip.passenger?.designation} /></Box>}
              </CardContent>
            </Card>
            <Card sx={{ mb: 2 }}>
              <CardHeader title={t('trips.driver')} slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }} sx={{ pb: 0 }} />
              <CardContent>
                {trip.driver ? (
                  <>
                    <Typography>{fullName(trip.driver.userProfile)}</Typography>
                    <Typography color="text.secondary">{trip.driver.userProfile?.phoneNumber}</Typography>
                    {trip.vehicle && (
                      <Typography color="text.secondary">
                        {[trip.vehicle.make, trip.vehicle.model, trip.vehicle.licensePlate].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography color="text.secondary">{t('trips.unassigned')}</Typography>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title={t('book.fare')} slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }} sx={{ pb: 0 }} />
              <CardContent>
                <Detail label={t('book.breakdown.baseFare')} value={money(trip.baseFare)} money />
                <Detail label={t('book.breakdown.distanceFare')} value={money(trip.distanceFare)} money />
                <Detail label={t('book.breakdown.timeFare')} value={money(trip.timeFare)} money />
                <Detail label={trip.employeeDiscountAmount && Number(trip.employeeDiscountAmount) > 0 ? t('book.employeeDiscount') : t('book.promoDiscount')} value={`− ${money(trip.discountAmount)}`} money />
                <Detail label={t('trips.total')} value={money(trip.totalFare)} money strong />
                <Detail label={t('trips.commission')} value={money(trip.commissionAmount)} money />
                <Detail label={t('trips.paymentMethod')} value={trip.paymentMethod} />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={12}>
            <Card>
              <CardHeader
                title={t('trips.offers')}
                subheader={trip.dispatchWave ? `${t('trips.wave', { n: trip.dispatchWave })} · ${num(trip.dispatchRadiusKm)} km` : undefined}
                slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }}
              />
              <CardContent sx={{ pt: 0, overflowX: 'auto' }}>
                {offers.length === 0 ? (
                  <Typography color="text.secondary">{t('common.empty')}</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Offered</TableCell>
                        <TableCell>{t('trips.driver')}</TableCell>
                        <TableCell align="right">Wave</TableCell>
                        <TableCell align="right">Km away</TableCell>
                        <TableCell align="right">{t('trips.score')}</TableCell>
                        <TableCell>Outcome</TableCell>
                        <TableCell>Responded</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {offers.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>{dateTime(o.offeredAt)}</TableCell>
                          <TableCell>{fullName(o.driver?.userProfile)}</TableCell>
                          <TableCell align="right">{o.wave}</TableCell>
                          <TableCell align="right">{num(o.distanceKm)}</TableCell>
                          <TableCell align="right">{num(o.score, 3)}</TableCell>
                          <TableCell><Chip size="small" color={OUTCOME_COLOR[o.outcome]} label={o.outcome} /></TableCell>
                          <TableCell>{dateTime(o.respondedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <ConfirmDialog
        open={cancelOpen}
        danger
        requireReason
        title={`${t('trips.cancel')}: ${trip?.tripNumber ?? ''}?`}
        body="The passenger and driver are notified. This can't be undone."
        busy={cancel.isPending}
        error={cancel.error}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => cancel.mutate(reason)}
      />
      <AssignDriverDialog trip={assignOpen ? trip ?? null : null} onClose={() => setAssignOpen(false)} />
    </>
  );
}

function Detail({ label, value, money: isMoney, strong }: { label: string; value: React.ReactNode; money?: boolean; strong?: boolean }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.5, justifyContent: 'space-between' }}>
      <Typography color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ textAlign: 'right', fontWeight: strong ? 700 : undefined, fontVariantNumeric: isMoney ? 'tabular-nums' : undefined }}>{value}</Typography>
    </Stack>
  );
}
