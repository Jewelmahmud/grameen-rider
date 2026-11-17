import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { peopleApi } from '../../api/api';
import type { UserRow } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog, EmployeeBadge, ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { ServerGrid, usePaging } from '../../components/grid';
import { dateOnly, fromNow, fullName } from '../../lib/format';

/** Everyone with a Grameen Ride profile (customers, drivers and staff), filterable by platform role. */
export default function CustomersPage() {
  const { t } = useTranslation();
  const { can, me } = useAuth();
  const qc = useQueryClient();
  const notify = useNotify();
  const paging = usePaging();
  const [qInput, setQInput] = useState('');
  const [f, setF] = useState({ q: '', role: '', employee: '', status: '' });
  const [blocking, setBlocking] = useState<UserRow | null>(null);
  const update = (patch: Partial<typeof f>) => {
    setF((x) => ({ ...x, ...patch }));
    paging.reset();
  };
  const query = { ...f, page: paging.page, pageSize: paging.pageSize };
  const users = useQuery({ queryKey: ['admin-users', query], queryFn: () => peopleApi.users(query), placeholderData: keepPreviousData });

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['admin-users'] });
    setBlocking(null);
    notify(t('common.saved'));
  };
  const block = useMutation({ mutationFn: (v: { id: string; reason: string }) => peopleApi.block(v.id, v.reason), onSuccess: done });
  const unblock = useMutation({ mutationFn: (id: string) => peopleApi.unblock(id), onSuccess: done });

  const columns: GridColDef<UserRow>[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      valueGetter: (_, r) => fullName(r),
      renderCell: ({ row, value }) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          <span>{value}</span>
          {row.isEmployee && <EmployeeBadge designation={row.designation} />}
        </Stack>
      ),
    },
    { field: 'phoneNumber', headerName: t('auth.phone'), width: 140 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'platformRoles', headerName: 'Roles', width: 180, valueGetter: (_, r) => (r.platformRoles ?? []).map((x) => t(`roles.${x}`)).join(', ') },
    {
      field: 'status',
      headerName: t('common.status'),
      width: 110,
      renderCell: ({ row }) => <Chip size="small" color={row.status === 'blocked' ? 'error' : 'success'} variant={row.status === 'blocked' ? 'filled' : 'outlined'} label={row.status} />,
    },
    { field: 'lastActiveAt', headerName: 'Last active', width: 120, valueFormatter: (v: string) => fromNow(v) },
    { field: 'createdAt', headerName: 'Joined', width: 110, valueFormatter: (v: string) => dateOnly(v) },
    ...(can('users.block')
      ? [
          {
            field: 'actions',
            headerName: '',
            width: 110,
            sortable: false,
            renderCell: ({ row }) =>
              row.id === me?.id ? null : row.status === 'blocked' ? (
                <Button size="small" onClick={() => unblock.mutate(row.id)} disabled={unblock.isPending}>Unblock</Button>
              ) : (
                <Button size="small" color="error" onClick={() => setBlocking(row)}>Block</Button>
              ),
          } as GridColDef<UserRow>,
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title={t('nav.customers')} subtitle="Everyone who has used Grameen Ride. Blocking stops them using this platform only, not other GiLab services." crumbs={[{ label: t('nav.people') }]} />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={t('common.search')}
                placeholder="Name, phone or email"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onBlur={() => update({ q: qInput })}
                onKeyDown={(e) => e.key === 'Enter' && update({ q: qInput })}
              />
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <TextField select label="Role" value={f.role} onChange={(e) => update({ role: e.target.value })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                {(['customer', 'driver', 'operations', 'ride_admin', 'super_admin'] as const).map((r) => <MenuItem key={r} value={r}>{t(`roles.${r}`)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <TextField select label={t('trips.employee')} value={f.employee} onChange={(e) => update({ employee: e.target.value })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="true">{t('common.yes')}</MenuItem>
                <MenuItem value="false">{t('common.no')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <TextField select label={t('common.status')} value={f.status} onChange={(e) => update({ status: e.target.value })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <ErrorAlert error={users.error ?? unblock.error} onRetry={users.error ? () => users.refetch() : undefined} />
      <ServerGrid
        rows={users.data?.items ?? []}
        total={users.data?.total ?? 0}
        loading={users.isFetching && !users.data}
        page={paging.page}
        pageSize={paging.pageSize}
        onPage={paging.onPage}
        columns={columns}
      />
      <ConfirmDialog
        open={Boolean(blocking)}
        danger
        requireReason
        title={`Block ${fullName(blocking)}?`}
        body="They can't book or drive on Grameen Ride until unblocked."
        busy={block.isPending}
        error={block.error}
        onClose={() => setBlocking(null)}
        onConfirm={(reason) => blocking && block.mutate({ id: blocking.id, reason })}
      />
    </>
  );
}
