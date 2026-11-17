import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Grid, Stack, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import { useTranslation } from 'react-i18next';
import { reportsApi, type SummaryRow } from '../../api/api';
import { useAuth } from '../../auth/AuthProvider';
import { ErrorAlert, PageHeader, StatCard } from '../../components/common';
import { moneyCol, SimpleGrid } from '../../components/grid';
import { vehicleLabel } from '../../i18n';
import { dayjs, DHAKA, money } from '../../lib/format';

export default function ReportsPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [from, setFrom] = useState(dayjs().tz(DHAKA).subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().tz(DHAKA).format('YYYY-MM-DD'));
  // Whole Dhaka days: from 00:00 on `from` to 00:00 after `to`.
  const range = { from: dayjs.tz(from, DHAKA).toISOString(), to: dayjs.tz(to, DHAKA).add(1, 'day').toISOString() };
  const q = useQuery({ queryKey: ['summary', range], queryFn: () => reportsApi.summary(range.from, range.to), enabled: from <= to });

  const csv = useMutation({
    mutationFn: () => reportsApi.tripsCsv(range.from, range.to),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trips-${from}-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const rows = (q.data ?? []).map((r, i) => ({ ...r, id: `${r.day}-${r.service_type}-${r.vehicle_type}-${i}` }));
  const sum = (k: keyof SummaryRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  const columns: GridColDef<SummaryRow & { id: string }>[] = [
    { field: 'day', headerName: t('common.date'), width: 120, valueFormatter: (v: string) => dayjs(v).format('D MMM YYYY') },
    { field: 'service_type', headerName: 'Service', width: 90, valueFormatter: (v: string) => t(`service.${v}`) },
    { field: 'vehicle_type', headerName: t('trips.vehicle'), width: 120, valueFormatter: (v: string) => vehicleLabel(t, v) },
    { field: 'trips', headerName: 'Trips', width: 80, type: 'number' },
    { field: 'completed', headerName: t('status.completed'), width: 100, type: 'number' },
    { field: 'cancelled', headerName: t('status.cancelled'), width: 100, type: 'number' },
    { field: 'no_driver', headerName: t('status.no_driver_found'), width: 130, type: 'number' },
    moneyCol('revenue', 'Revenue'),
    moneyCol('platform_net', 'Platform net'),
    moneyCol('discounts', 'Discounts'),
    { field: 'employee_trips', headerName: 'Employee trips', width: 120, type: 'number' },
  ];

  return (
    <>
      <PageHeader
        title={t('nav.reports')}
        subtitle="Per Dhaka day, service and vehicle type. Money counts completed trips only."
        action={
          can('reports.export') && (
            <Button variant="outlined" startIcon={<DownloadOutlined />} onClick={() => csv.mutate()} disabled={csv.isPending || from > to}>
              {t('common.export')}
            </Button>
          )
        }
      />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ maxWidth: 520 }}>
            <TextField label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} error={from > to} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
        </CardContent>
      </Card>
      <ErrorAlert error={q.error ?? csv.error} onRetry={q.error ? () => q.refetch() : undefined} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}><StatCard label="Trips" value={sum('trips')} hint={`${sum('completed')} ${t('status.completed').toLowerCase()}`} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard label="Revenue" value={money(sum('revenue'))} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard label="Platform net" value={money(sum('platform_net'))} hint={`Discounts ${money(sum('discounts'))}`} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard label={t('status.no_driver_found')} value={sum('no_driver')} hint={`${sum('cancelled')} ${t('status.cancelled').toLowerCase()}`} /></Grid>
      </Grid>
      <SimpleGrid rows={rows} columns={columns} loading={q.isLoading} />
    </>
  );
}
