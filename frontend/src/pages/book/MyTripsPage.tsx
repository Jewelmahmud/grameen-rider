import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardActionArea, CardContent, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingApi } from '../../api/api';
import type { Trip } from '../../api/types';
import { ACTIVE_STATUSES, CardSkeleton, EmptyState, ErrorAlert, StatusChip } from '../../components/common';
import { vehicleLabel } from '../../i18n';
import { dateTime, money } from '../../lib/format';

export default function MyTripsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'active' | 'upcoming' | 'past'>('active');
  const q = useQuery({ queryKey: ['my-trips'], queryFn: bookingApi.myTrips, refetchInterval: 15_000 });
  const trips = q.data ?? [];
  const groups: Record<typeof tab, Trip[]> = {
    active: trips.filter((x) => ACTIVE_STATUSES.includes(x.status)),
    upcoming: trips.filter((x) => x.status === 'scheduled'),
    past: trips.filter((x) => !ACTIVE_STATUSES.includes(x.status) && x.status !== 'scheduled'),
  };
  const list = groups[tab];

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">{t('nav.myTrips')}</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="active" label={`${t('trips.active')} (${groups.active.length})`} />
        <Tab value="upcoming" label={`${t('trips.upcoming')} (${groups.upcoming.length})`} />
        <Tab value="past" label={t('trips.past')} />
      </Tabs>
      <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      {q.isLoading && <CardSkeleton />}
      {!q.isLoading && list.length === 0 && (
        <EmptyState title={t('trips.none')} action={<Button variant="contained" component={RouterLink} to="/book">{t('nav.bookRide')}</Button>} />
      )}
      {list.map((trip) => (
        <Card key={trip.id}>
          <CardActionArea component={RouterLink} to={`/book/trips/${trip.id}`}>
            <CardContent>
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <StatusChip status={trip.status} />
                    <Typography variant="body2" color="text.secondary">
                      {t(`service.${trip.serviceType}`)} · {vehicleLabel(t, trip.vehicleType)}
                    </Typography>
                  </Stack>
                  <Typography noWrap>{trip.pickupAddress}</Typography>
                  <Typography noWrap color="text.secondary">→ {trip.dropoffAddress}</Typography>
                  <Typography variant="body2" color="text.secondary">{dateTime(trip.scheduledDatetime ?? trip.requestedAt)}</Typography>
                </Stack>
                <Typography variant="h6" component="p" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{money(trip.totalFare)}</Typography>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}
