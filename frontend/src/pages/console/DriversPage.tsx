import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Card, CardContent, Chip, Grid, MenuItem, Stack, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { peopleApi } from '../../api/api';
import type { DriverRow } from '../../api/types';
import { ErrorAlert, PageHeader } from '../../components/common';
import { ServerGrid, usePaging } from '../../components/grid';
import { vehicleLabel } from '../../i18n';
import { dateOnly, fromNow, fullName, num } from '../../lib/format';

export const VERIFY_COLOR = { pending: 'warning', approved: 'success', rejected: 'error' } as const;

export default function DriversPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const paging = usePaging();
  const [qInput, setQInput] = useState('');
  const [f, setF] = useState({ q: '', verification: '', suspended: '', online: '' });
  const update = (patch: Partial<typeof f>) => {
    setF((x) => ({ ...x, ...patch }));
    paging.reset();
  };
  const query = { ...f, page: paging.page, pageSize: paging.pageSize };
  const drivers = useQuery({ queryKey: ['admin-drivers', query], queryFn: () => peopleApi.drivers(query), placeholderData: keepPreviousData });

  const columns: GridColDef<DriverRow>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160, valueGetter: (_, r) => fullName(r.userProfile) },
    { field: 'phone', headerName: t('auth.phone'), width: 140, valueGetter: (_, r) => r.userProfile?.phoneNumber ?? '—' },
    {
      field: 'verificationStatus',
      headerName: 'Verification',
      width: 120,
      renderCell: ({ value }) => <Chip size="small" color={VERIFY_COLOR[value as DriverRow['verificationStatus']]} label={value} />,
    },
    {
      field: 'state',
      headerName: t('common.status'),
      width: 150,
      renderCell: ({ row }) =>
        row.isSuspended ? (
          <Chip size="small" color="error" label="Suspended" />
        ) : row.isOnline ? (
          <Chip size="small" color={row.isAvailable ? 'success' : 'info'} label={row.isAvailable ? 'Online · free' : 'Online · on trip'} />
        ) : (
          <Chip size="small" variant="outlined" label="Offline" />
        ),
    },
    { field: 'vehicles', headerName: t('trips.vehicle'), flex: 1, minWidth: 140, valueGetter: (_, r) => (r.vehicles ?? []).map((v) => vehicleLabel(t, v.vehicleType)).join(', ') || '—' },
    { field: 'rating', headerName: 'Rating', width: 80, type: 'number', valueFormatter: (v) => num(v as number, 2) },
    { field: 'totalRides', headerName: 'Trips', width: 80, type: 'number' },
    { field: 'currentLocationUpdatedAt', headerName: 'Last location', width: 130, valueFormatter: (v: string) => fromNow(v) },
    { field: 'createdAt', headerName: 'Joined', width: 120, valueFormatter: (v: string) => dateOnly(v) },
  ];

  return (
    <>
      <PageHeader title={t('nav.drivers')} crumbs={[{ label: t('nav.people') }]} />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={t('common.search')}
                placeholder="Name, phone or licence"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onBlur={() => update({ q: qInput })}
                onKeyDown={(e) => e.key === 'Enter' && update({ q: qInput })}
              />
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <TextField select label="Verification" value={f.verification} onChange={(e) => update({ verification: e.target.value })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <TextField select label="Suspended" value={f.suspended} onChange={(e) => update({ suspended: e.target.value })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="true">{t('common.yes')}</MenuItem>
                <MenuItem value="false">{t('common.no')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <TextField select label="Online" value={f.online} onChange={(e) => update({ online: e.target.value })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="true">{t('common.yes')}</MenuItem>
                <MenuItem value="false">{t('common.no')}</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <ErrorAlert error={drivers.error} onRetry={() => drivers.refetch()} />
      <Stack>
        <ServerGrid
          rows={drivers.data?.items ?? []}
          total={drivers.data?.total ?? 0}
          loading={drivers.isFetching && !drivers.data}
          page={paging.page}
          pageSize={paging.pageSize}
          onPage={paging.onPage}
          columns={columns}
          onRowClick={({ row }) => navigate(`/console/drivers/${row.id}`)}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Stack>
    </>
  );
}
