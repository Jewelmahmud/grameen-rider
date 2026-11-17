import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Card, CardContent, Chip, Grid, MenuItem, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { opsApi, type TripFilters } from '../../api/api';
import type { Trip, TripStatus } from '../../api/types';
import { ErrorAlert, PageHeader, StatusChip } from '../../components/common';
import { moneyCol, ServerGrid, usePaging } from '../../components/grid';
import { vehicleLabel } from '../../i18n';
import { dateTime, fromLocalInput, fullName } from '../../lib/format';

const STATUSES: TripStatus[] = [
  'scheduled', 'searching_driver', 'accepted', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress',
  'completed', 'cancelled', 'no_driver_found', 'disputed',
];

export default function TripsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const paging = usePaging();
  const [filters, setFilters] = useState<TripFilters>({
    status: params.get('status') ?? '',
    service: (params.get('service') as TripFilters['service']) ?? '',
    q: params.get('q') ?? '',
    employee: '',
    from: '',
    to: '',
  });
  const [qInput, setQInput] = useState(filters.q ?? '');

  const update = (patch: Partial<TripFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    paging.reset();
    setParams(Object.fromEntries(Object.entries({ status: next.status, service: next.service, q: next.q }).filter(([, v]) => v)) as Record<string, string>, { replace: true });
  };

  const query = { ...filters, page: paging.page, pageSize: paging.pageSize, from: fromLocalInput(filters.from ?? ''), to: fromLocalInput(filters.to ?? '') };
  const trips = useQuery({ queryKey: ['admin-trips', query], queryFn: () => opsApi.trips(query), placeholderData: keepPreviousData, refetchInterval: 20_000 });

  const columns: GridColDef<Trip>[] = [
    { field: 'tripNumber', headerName: t('trips.number'), width: 130 },
    { field: 'status', headerName: t('common.status'), width: 150, renderCell: ({ row }) => <StatusChip status={row.status} /> },
    { field: 'serviceType', headerName: 'Service', width: 90, valueFormatter: (v: string) => t(`service.${v}`) },
    { field: 'vehicleType', headerName: t('trips.vehicle'), width: 120, valueFormatter: (v: string) => vehicleLabel(t, v) },
    {
      field: 'passenger',
      headerName: t('trips.passenger'),
      flex: 1,
      minWidth: 160,
      valueGetter: (_, r) => fullName(r.passenger),
      renderCell: ({ row, value }) => (
        <>
          {value}
          {row.isEmployeeBooking && <Chip size="small" variant="outlined" color="primary" label={t('trips.employee')} sx={{ ml: 1 }} />}
        </>
      ),
    },
    { field: 'driver', headerName: t('trips.driver'), flex: 1, minWidth: 140, valueGetter: (_, r) => (r.driver ? fullName(r.driver.userProfile) : t('trips.unassigned')) },
    { field: 'pickupAddress', headerName: t('book.pickup'), flex: 1.4, minWidth: 180 },
    moneyCol('totalFare', t('trips.total')),
    { field: 'when', headerName: t('trips.requested'), width: 170, valueGetter: (_, r) => r.scheduledDatetime ?? r.requestedAt, valueFormatter: (v: string) => dateTime(v) },
  ];

  return (
    <>
      <PageHeader title={t('nav.trips')} crumbs={[{ label: t('nav.operations') }]} />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label={t('common.search')}
                placeholder="Trip number, name or phone"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onBlur={() => qInput !== filters.q && update({ q: qInput })}
                onKeyDown={(e) => e.key === 'Enter' && update({ q: qInput })}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField select label={t('common.status')} value={filters.status} onChange={(e) => update({ status: e.target.value })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{t(`status.${s}`)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField select label="Service" value={filters.service} onChange={(e) => update({ service: e.target.value as TripFilters['service'] })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="ride">{t('service.ride')}</MenuItem>
                <MenuItem value="rental">{t('service.rental')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 1 }}>
              <TextField select label={t('trips.employee')} value={filters.employee} onChange={(e) => update({ employee: e.target.value as TripFilters['employee'] })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="true">{t('common.yes')}</MenuItem>
                <MenuItem value="false">{t('common.no')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField label={t('common.from')} type="datetime-local" value={filters.from} onChange={(e) => update({ from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField label={t('common.to')} type="datetime-local" value={filters.to} onChange={(e) => update({ to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <ErrorAlert error={trips.error} onRetry={() => trips.refetch()} />
      <ServerGrid
        rows={trips.data?.items ?? []}
        total={trips.data?.total ?? 0}
        loading={trips.isFetching && !trips.data}
        page={paging.page}
        pageSize={paging.pageSize}
        onPage={paging.onPage}
        columns={columns}
        onRowClick={({ row }) => navigate(`/console/trips/${row.id}`)}
        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
      />
    </>
  );
}
