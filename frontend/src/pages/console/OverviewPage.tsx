import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, CardContent, CardHeader, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import LocalTaxiOutlined from '@mui/icons-material/LocalTaxiOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import SupportAgentOutlined from '@mui/icons-material/SupportAgentOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { opsApi } from '../../api/api';
import type { ServiceType, TripStatus } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { CardSkeleton, ErrorAlert, PageHeader, StatCard, StatusChip } from '../../components/common';
import { dateTime, money } from '../../lib/format';

export default function OverviewPage() {
  const { t } = useTranslation();
  const { me } = useAuth();
  const q = useQuery({ queryKey: ['overview'], queryFn: opsApi.overview, refetchInterval: 30_000 });
  const d = q.data;

  const byStatus = new Map<TripStatus, Record<ServiceType, number>>();
  for (const r of d?.tripsToday ?? []) {
    const row = byStatus.get(r.status) ?? { ride: 0, rental: 0 };
    row[r.service_type] = r.count;
    byStatus.set(r.status, row);
  }
  const total = (d?.tripsToday ?? []).reduce((s, r) => s + r.count, 0);

  return (
    <>
      <PageHeader
        title={t('nav.overview')}
        subtitle={me?.sparks.greetingName ? t('sparks.hello', { name: me.sparks.greetingName }) : undefined}
        action={<Button onClick={() => q.refetch()}>{t('common.refresh')}</Button>}
      />
      <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      {q.isLoading && <CardSkeleton rows={4} />}
      {d && (
        <>
          {d.rentalsNext24h.unassigned > 0 && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={<Button color="inherit" size="small" component={RouterLink} to="/console/rentals">{t('nav.rentals')}</Button>}
            >
              {d.rentalsNext24h.unassigned} {t('overview.rentals24h').toLowerCase()} — {t('overview.unassigned')}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard label={t('overview.tripsToday')} value={total} hint={`${d.money.completed} ${t('status.completed').toLowerCase()}`} icon={<LocalTaxiOutlined />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                label={t('overview.revenue')}
                value={money(d.money.revenue)}
                hint={`${t('overview.platformNet')} ${money(d.money.platform_net)} · ${t('overview.discounts')} ${money(d.money.discounts)}`}
                icon={<PaymentsOutlined />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                label={t('overview.driversOnline')}
                value={d.drivers.online}
                hint={`${d.drivers.available} ${t('overview.available')} · ${d.drivers.pending_verification} ${t('overview.pendingDrivers').toLowerCase()}`}
                icon={<BadgeOutlined />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                label={t('overview.rentals24h')}
                value={d.rentalsNext24h.total}
                hint={`${d.rentalsNext24h.unassigned} ${t('overview.unassigned')} · ${t('overview.openTickets')}: ${d.support.open}`}
                icon={d.support.open ? <SupportAgentOutlined /> : <EventOutlined />}
              />
            </Grid>
          </Grid>
          <Card>
            <CardHeader
              title={t('overview.byStatus')}
              subheader={t('overview.since', { time: dateTime(d.since) })}
              slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Table size="small" aria-label={t('overview.byStatus')}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.status')}</TableCell>
                    <TableCell align="right">{t('service.ride')}</TableCell>
                    <TableCell align="right">{t('service.rental')}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...byStatus.entries()].map(([status, c]) => (
                    <TableRow key={status} hover>
                      <TableCell><StatusChip status={status} /></TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{c.ride}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{c.rental}</TableCell>
                      <TableCell align="right">
                        <Button size="small" component={RouterLink} to={`/console/trips?status=${status}`}>{t('common.details')}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {byStatus.size === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Stack sx={{ py: 2, alignItems: 'center', color: 'text.secondary' }}>{t('common.empty')}</Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
