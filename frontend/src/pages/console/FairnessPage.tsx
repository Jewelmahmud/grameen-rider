import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Grid, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { reportsApi, type FairnessRow } from '../../api/api';
import { ErrorAlert, PageHeader, StatCard } from '../../components/common';
import { moneyCol, SimpleGrid } from '../../components/grid';
import { dateTime, dayjs, DHAKA, money } from '../../lib/format';

/** How evenly trips and earnings were shared between drivers on one work day. */
export default function FairnessPage() {
  const { t } = useTranslation();
  const [day, setDay] = useState(dayjs().tz(DHAKA).format('YYYY-MM-DD'));
  // Noon Dhaka is inside the work day whatever the reset hour.
  const q = useQuery({ queryKey: ['fairness', day], queryFn: () => reportsApi.fairness(dayjs.tz(`${day}T12:00`, DHAKA).toISOString()) });
  const d = q.data;
  const rows = (d?.drivers ?? []).map((r) => ({ ...r, id: r.driver_id }));
  const maxCompleted = Math.max(1, ...rows.map((r) => Number(r.completed)));

  const columns: GridColDef<FairnessRow & { id: string }>[] = [
    { field: 'name', headerName: 'Driver', flex: 1, minWidth: 160, valueGetter: (_, r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.phone_number || '—' },
    { field: 'offers', headerName: 'Offers', width: 80, type: 'number' },
    { field: 'accepted', headerName: 'Accepted', width: 90, type: 'number' },
    { field: 'declined', headerName: 'Declined', width: 90, type: 'number' },
    { field: 'timeouts', headerName: 'Missed', width: 80, type: 'number' },
    {
      field: 'completed',
      headerName: t('status.completed'),
      width: 180,
      renderCell: ({ value }) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <Box sx={{ width: 90 }}>
            <LinearProgress variant="determinate" value={(Number(value) / maxCompleted) * 100} aria-hidden />
          </Box>
          <span>{value}</span>
        </Stack>
      ),
    },
    moneyCol('earnings', 'Earnings'),
  ];

  return (
    <>
      <PageHeader
        title={t('nav.fairness')}
        subtitle="Each work day, the fair-share ranking favours drivers with fewer trips. A narrow spread means work was shared evenly."
        crumbs={[{ label: t('nav.reports'), to: '/console/reports' }]}
      />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <TextField label={t('common.date')} type="date" value={day} onChange={(e) => setDay(e.target.value)} sx={{ maxWidth: 220 }} slotProps={{ inputLabel: { shrink: true } }} />
            {d && <Typography color="text.secondary">{dateTime(d.from)} – {dateTime(d.to)}</Typography>}
          </Stack>
        </CardContent>
      </Card>
      <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      {d && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 4 }}><StatCard label="Drivers with work" value={rows.length} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard label="Completed trips per driver" value={`${d.spread.completed.min} – ${d.spread.completed.max}`} hint={`Median ${d.spread.completed.median}`} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard label="Earnings per driver" value={`${money(d.spread.earnings.min)} – ${money(d.spread.earnings.max)}`} hint={`Median ${money(d.spread.earnings.median)}`} />
          </Grid>
        </Grid>
      )}
      <SimpleGrid rows={rows} columns={columns} loading={q.isLoading} />
    </>
  );
}
