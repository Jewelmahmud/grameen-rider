import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Dialog, DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '../../api/api';
import type { AuditLog } from '../../api/types';
import { ErrorAlert, PageHeader } from '../../components/common';
import { ServerGrid, usePaging } from '../../components/grid';
import { dateTime, fromLocalInput } from '../../lib/format';

const ENTITIES = ['settings', 'fare_rate', 'zone', 'route_fare', 'trip', 'user', 'driver', 'vehicle', 'promotion', 'support_ticket'];

export default function AuditPage() {
  const { t } = useTranslation();
  const paging = usePaging(50);
  const [f, setF] = useState({ entity: '', entityId: '', from: '', to: '' });
  const [open, setOpen] = useState<AuditLog | null>(null);
  const update = (patch: Partial<typeof f>) => {
    setF((x) => ({ ...x, ...patch }));
    paging.reset();
  };
  const query = { entity: f.entity, entityId: f.entityId.trim(), from: fromLocalInput(f.from), to: fromLocalInput(f.to), page: paging.page, pageSize: paging.pageSize };
  const logs = useQuery({ queryKey: ['audit', query], queryFn: () => settingsApi.audit(query), placeholderData: keepPreviousData });

  const columns: GridColDef<AuditLog>[] = [
    { field: 'createdAt', headerName: t('common.changedAt'), width: 170, valueFormatter: (v: string) => dateTime(v) },
    { field: 'actor', headerName: t('common.changedBy'), width: 200, valueGetter: (_, r) => `${r.actorName ?? r.actorAuthUserId}${r.actorRole ? ` (${r.actorRole})` : ''}` },
    { field: 'action', headerName: 'Action', width: 170 },
    { field: 'entity', headerName: 'Entity', width: 120 },
    { field: 'entityId', headerName: 'Target', flex: 1, minWidth: 200 },
    { field: 'ip', headerName: 'IP', width: 130 },
  ];

  return (
    <>
      <PageHeader title={t('nav.audit')} subtitle="Every change made in the console, with the values before and after." crumbs={[{ label: t('nav.settings') }]} />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField select label="Entity" value={f.entity} onChange={(e) => update({ entity: e.target.value })}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                {ENTITIES.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField label="Target id" value={f.entityId} onChange={(e) => update({ entityId: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField label={t('common.from')} type="datetime-local" value={f.from} onChange={(e) => update({ from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField label={t('common.to')} type="datetime-local" value={f.to} onChange={(e) => update({ to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <ErrorAlert error={logs.error} onRetry={() => logs.refetch()} />
      <ServerGrid
        rows={logs.data?.items ?? []}
        total={logs.data?.total ?? 0}
        loading={logs.isFetching && !logs.data}
        page={paging.page}
        pageSize={paging.pageSize}
        onPage={paging.onPage}
        columns={columns}
        onRowClick={({ row }) => setOpen(row)}
        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
      />
      <Dialog open={Boolean(open)} onClose={() => setOpen(null)} maxWidth="md">
        <DialogTitle>
          {open?.action} · {open && dateTime(open.createdAt)}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {(['before', 'after'] as const).map((k) => (
              <Grid key={k} size={{ xs: 12, md: 6 }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{k}</Typography>
                  <Box component="pre" sx={{ m: 0, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontSize: 12, overflow: 'auto', maxHeight: 420 }}>
                    {open?.[k] === undefined || open?.[k] === null ? '—' : JSON.stringify(open[k], null, 2)}
                  </Box>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
}
