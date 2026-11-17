import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Chip, Drawer, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { growthApi } from '../../api/api';
import type { SupportTicket } from '../../api/types';
import { ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { SimpleGrid } from '../../components/grid';
import { dateTime, fullName } from '../../lib/format';

const PRIORITY_COLOR = { low: 'default', medium: 'info', high: 'warning', urgent: 'error' } as const;
const STATUSES: SupportTicket['status'][] = ['open', 'in_progress', 'resolved', 'closed'];

export default function SupportPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const notify = useNotify();
  const [status, setStatus] = useState<string>('open');
  const [open, setOpen] = useState<SupportTicket | null>(null);
  const [next, setNext] = useState<SupportTicket['status']>('in_progress');
  const [resolution, setResolution] = useState('');
  const tickets = useQuery({ queryKey: ['tickets', status], queryFn: () => growthApi.tickets(status || undefined) });

  const update = useMutation({
    mutationFn: () => growthApi.updateTicket(open!.id, next, resolution.trim() || undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      notify(t('common.saved'));
      setOpen(null);
    },
  });

  const columns: GridColDef<SupportTicket>[] = [
    { field: 'createdAt', headerName: 'Opened', width: 170, valueFormatter: (v: string) => dateTime(v) },
    { field: 'priority', headerName: 'Priority', width: 100, renderCell: ({ value }) => <Chip size="small" color={PRIORITY_COLOR[value as SupportTicket['priority']]} label={value} /> },
    { field: 'category', headerName: 'Category', width: 150, valueFormatter: (v: string) => v.replace(/_/g, ' ') },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 200 },
    { field: 'user', headerName: 'From', width: 180, valueGetter: (_, r) => `${fullName(r.userProfile)} ${r.userProfile?.phoneNumber ?? ''}` },
    { field: 'status', headerName: t('common.status'), width: 120, valueFormatter: (v: string) => v.replace(/_/g, ' ') },
  ];

  return (
    <>
      <PageHeader title={t('nav.support')} crumbs={[{ label: t('nav.growth') }]} />
      <Tabs value={status} onChange={(_, v) => setStatus(v)} sx={{ mb: 2 }}>
        {STATUSES.map((s) => <Tab key={s} value={s} label={s.replace(/_/g, ' ')} />)}
        <Tab value="" label={t('common.all')} />
      </Tabs>
      <ErrorAlert error={tickets.error} onRetry={() => tickets.refetch()} />
      <SimpleGrid
        rows={tickets.data ?? []}
        columns={columns}
        loading={tickets.isLoading}
        onRowClick={({ row }) => {
          setOpen(row);
          setNext(row.status === 'open' ? 'in_progress' : row.status);
          setResolution(row.resolution ?? '');
        }}
        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
      />
      <Drawer anchor="right" open={Boolean(open)} onClose={() => setOpen(null)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}>
        {open && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" component="h2">{open.subject}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {fullName(open.userProfile)} · {open.userProfile?.phoneNumber} · {dateTime(open.createdAt)}
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{open.description}</Typography>
            <ErrorAlert error={update.error} />
            <Stack spacing={2}>
              <TextField select label={t('common.status')} value={next} onChange={(e) => setNext(e.target.value as SupportTicket['status'])}>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="Resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} multiline minRows={3} helperText="Shown to the customer" />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
              <Button onClick={() => setOpen(null)}>{t('common.cancel')}</Button>
              <Button variant="contained" onClick={() => update.mutate()} disabled={update.isPending}>{t('common.save')}</Button>
            </Stack>
          </Box>
        )}
      </Drawer>
    </>
  );
}
