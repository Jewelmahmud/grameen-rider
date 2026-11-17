import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { opsApi } from '../../api/api';
import type { Trip } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { ErrorAlert, PageHeader, StatusChip } from '../../components/common';
import { moneyCol, SimpleGrid } from '../../components/grid';
import { vehicleLabel } from '../../i18n';
import { dateTime, dayjs, fromNow, fullName } from '../../lib/format';
import { AssignDriverDialog } from './AssignDriverDialog';

/** Rentals starting soon. Unassigned ones inside the ops alert window are highlighted. */
export default function RentalsPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [hours, setHours] = useState(24);
  const [assigning, setAssigning] = useState<Trip | null>(null);
  const q = useQuery({ queryKey: ['rentals-upcoming', hours], queryFn: () => opsApi.upcomingRentals(hours), refetchInterval: 30_000 });
  const rows = q.data ?? [];
  const urgent = rows.filter((r) => !r.driverId && r.scheduledDatetime && dayjs(r.scheduledDatetime).diff(dayjs(), 'minute') <= 30);

  const columns: GridColDef<Trip>[] = [
    { field: 'scheduledDatetime', headerName: t('trips.scheduled'), width: 170, valueFormatter: (v: string) => dateTime(v) },
    { field: 'startsIn', headerName: '', width: 120, valueGetter: (_, r) => fromNow(r.scheduledDatetime) },
    { field: 'tripNumber', headerName: t('trips.number'), width: 130 },
    { field: 'status', headerName: t('common.status'), width: 150, renderCell: ({ row }) => <StatusChip status={row.status} /> },
    { field: 'vehicleType', headerName: t('trips.vehicle'), width: 110, valueFormatter: (v: string) => vehicleLabel(t, v) },
    { field: 'passenger', headerName: t('trips.passenger'), flex: 1, minWidth: 150, valueGetter: (_, r) => `${fullName(r.passenger)} ${r.passenger?.phoneNumber ?? ''}` },
    { field: 'driver', headerName: t('trips.driver'), flex: 1, minWidth: 140, valueGetter: (_, r) => (r.driver ? fullName(r.driver.userProfile) : t('trips.unassigned')) },
    { field: 'pickupAddress', headerName: t('book.pickup'), flex: 1.2, minWidth: 160 },
    moneyCol('totalFare', t('trips.total')),
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      renderCell: ({ row }) =>
        !row.driverId && can('trips.intervene') ? (
          <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setAssigning(row); }}>
            {t('trips.assign')}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('nav.rentals')}
        subtitle="Drivers are matched about an hour before the start. Operations is alerted 30 minutes before if nobody accepted."
        crumbs={[{ label: t('nav.operations') }]}
        action={
          <Stack direction="row" spacing={1}>
            <TextField select label="Window" value={hours} onChange={(e) => setHours(Number(e.target.value))} sx={{ width: 140 }}>
              {[6, 24, 72, 168].map((h) => <MenuItem key={h} value={h}>{h < 48 ? `${h} h` : `${h / 24} days`}</MenuItem>)}
            </TextField>
          </Stack>
        }
      />
      <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      {urgent.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {urgent.length} rental(s) start within 30 minutes with no driver. Assign one or call the customer.
        </Alert>
      )}
      <SimpleGrid
        rows={rows}
        columns={columns}
        loading={q.isLoading}
        onRowClick={({ row }) => navigate(`/console/trips/${row.id}`)}
        getRowClassName={({ row }) => (urgent.includes(row) ? 'urgent' : '')}
        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' }, '& .urgent': { bgcolor: 'rgba(198,40,40,0.08)' } }}
      />
      <AssignDriverDialog trip={assigning} onClose={() => setAssigning(null)} />
    </>
  );
}
