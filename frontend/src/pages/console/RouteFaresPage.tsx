import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { pricingApi, type RouteFareInput } from '../../api/api';
import type { RouteFare, Zone } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog, ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { moneyCol, SimpleGrid } from '../../components/grid';
import { MapView, PINS } from '../../components/map';
import { vehicleLabel } from '../../i18n';
import { dateOnly, fromLocalInput, toLocalInput } from '../../lib/format';

type Draft = Omit<RouteFareInput, 'fixedFare'> & { id?: string; fixedFare: number | '' };

export default function RouteFaresPage() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const canWrite = can('fares.write');
  const qc = useQueryClient();
  const notify = useNotify();
  const routes = useQuery({ queryKey: ['routes'], queryFn: pricingApi.routes });
  const zones = useQuery({ queryKey: ['zones'], queryFn: pricingApi.zones });
  const rates = useQuery({ queryKey: ['rates', 'ride'], queryFn: () => pricingApi.rates('ride') });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<RouteFare | null>(null);

  const zoneName = (z?: Zone | null) => (z ? (i18n.language === 'bn' ? z.nameBn : z.nameEn) : '—');
  const zoneById = new Map((zones.data ?? []).map((z) => [z.id, z]));
  const vehicleTypes = [...new Set((rates.data ?? []).map((r) => r.vehicleType))];

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body: RouteFareInput = {
        originZoneId: d.originZoneId,
        destinationZoneId: d.destinationZoneId,
        vehicleType: d.vehicleType,
        fixedFare: Number(d.fixedFare),
        bidirectional: d.bidirectional,
        priority: d.priority,
        isActive: d.isActive,
        validFrom: d.validFrom ?? null,
        validTo: d.validTo ?? null,
      };
      return d.id ? pricingApi.updateRoute(d.id, body) : pricingApi.createRoute(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routes'] });
      notify(t('common.saved'));
      setDraft(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => pricingApi.deleteRoute(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routes'] });
      setDeleting(null);
      notify(t('common.saved'));
    },
  });

  const columns: GridColDef<RouteFare>[] = [
    { field: 'origin', headerName: 'From zone', flex: 1, minWidth: 140, valueGetter: (_, r) => zoneName(r.originZone ?? zoneById.get(r.originZoneId)) },
    { field: 'dest', headerName: 'To zone', flex: 1, minWidth: 140, valueGetter: (_, r) => zoneName(r.destinationZone ?? zoneById.get(r.destinationZoneId)) },
    { field: 'vehicleType', headerName: t('trips.vehicle'), width: 130, valueFormatter: (v: string) => vehicleLabel(t, v) },
    moneyCol('fixedFare', 'Fixed fare'),
    { field: 'bidirectional', headerName: 'Both ways', width: 100, type: 'boolean' },
    { field: 'priority', headerName: 'Priority', width: 80, type: 'number' },
    { field: 'validity', headerName: 'Valid', width: 190, valueGetter: (_, r) => (r.validFrom || r.validTo ? `${dateOnly(r.validFrom)} – ${dateOnly(r.validTo)}` : 'Always') },
    { field: 'isActive', headerName: t('common.active'), width: 80, type: 'boolean' },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 100,
      sortable: false,
      renderCell: ({ row }) =>
        canWrite && (
          <Stack direction="row">
            <Tooltip title={t('common.edit')}>
              <IconButton size="small" aria-label={t('common.edit')} onClick={() => setDraft({ ...row, fixedFare: Number(row.fixedFare) })}>
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton size="small" aria-label={t('common.delete')} onClick={() => setDeleting(row)}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
    },
  ];

  const o = draft ? zoneById.get(draft.originZoneId) : undefined;
  const d = draft ? zoneById.get(draft.destinationZoneId) : undefined;

  return (
    <>
      <PageHeader
        title={t('nav.routeFares')}
        subtitle="Fixed ride prices between two zones. They beat the km rate; when several match, the highest priority wins."
        crumbs={[{ label: t('nav.pricing') }]}
        action={
          canWrite && (
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              disabled={(zones.data?.length ?? 0) < 2}
              onClick={() =>
                setDraft({ originZoneId: '', destinationZoneId: '', vehicleType: vehicleTypes[0] ?? 'car', fixedFare: '', bidirectional: true, priority: 0, isActive: true, validFrom: null, validTo: null })
              }
            >
              {t('common.add')}
            </Button>
          )
        }
      />
      <ErrorAlert error={routes.error ?? zones.error} onRetry={() => routes.refetch()} />
      <SimpleGrid rows={routes.data ?? []} columns={columns} loading={routes.isLoading} />

      <Drawer anchor="right" open={Boolean(draft)} onClose={() => setDraft(null)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}>
        {draft && (
          <Box component="form" sx={{ p: 3 }} onSubmit={(e) => { e.preventDefault(); save.mutate(draft); }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              {draft.id ? t('common.edit') : t('common.add')} — {t('nav.routeFares')}
            </Typography>
            <ErrorAlert error={save.error} />
            <Stack spacing={2}>
              <TextField select label="From zone" value={draft.originZoneId} onChange={(e) => setDraft({ ...draft, originZoneId: e.target.value })} required>
                {(zones.data ?? []).map((z) => <MenuItem key={z.id} value={z.id}>{zoneName(z)}</MenuItem>)}
              </TextField>
              <TextField select label="To zone" value={draft.destinationZoneId} onChange={(e) => setDraft({ ...draft, destinationZoneId: e.target.value })} required error={Boolean(draft.destinationZoneId) && draft.destinationZoneId === draft.originZoneId}>
                {(zones.data ?? []).map((z) => <MenuItem key={z.id} value={z.id}>{zoneName(z)}</MenuItem>)}
              </TextField>
              {o && d && (
                <MapView
                  height={200}
                  markers={[{ position: [o.centerLatitude, o.centerLongitude], icon: PINS.pickup }, { position: [d.centerLatitude, d.centerLongitude], icon: PINS.dropoff }]}
                  circles={[{ center: [o.centerLatitude, o.centerLongitude], radius: o.radiusM }, { center: [d.centerLatitude, d.centerLongitude], radius: d.radiusM }]}
                  line={[[o.centerLatitude, o.centerLongitude], [d.centerLatitude, d.centerLongitude]]}
                />
              )}
              <TextField select label={t('trips.vehicle')} value={draft.vehicleType} onChange={(e) => setDraft({ ...draft, vehicleType: e.target.value })} required>
                {vehicleTypes.map((v) => <MenuItem key={v} value={v}>{vehicleLabel(t, v)}</MenuItem>)}
              </TextField>
              <TextField
                label="Fixed fare"
                type="number"
                value={draft.fixedFare}
                onChange={(e) => setDraft({ ...draft, fixedFare: e.target.value === '' ? '' : Number(e.target.value) })}
                required
                slotProps={{ htmlInput: { min: 0, max: 100000 }, input: { startAdornment: <InputAdornment position="start">৳</InputAdornment> } }}
              />
              <TextField label="Priority" type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} helperText="-100 to 100. Higher wins when routes overlap." slotProps={{ htmlInput: { min: -100, max: 100 } }} />
              <Stack direction="row" spacing={1}>
                <TextField label="Valid from" type="datetime-local" value={toLocalInput(draft.validFrom)} onChange={(e) => setDraft({ ...draft, validFrom: fromLocalInput(e.target.value) ?? null })} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Valid to" type="datetime-local" value={toLocalInput(draft.validTo)} onChange={(e) => setDraft({ ...draft, validTo: fromLocalInput(e.target.value) ?? null })} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <FormControlLabel control={<Switch checked={draft.bidirectional} onChange={(e) => setDraft({ ...draft, bidirectional: e.target.checked })} />} label="Applies both ways" />
              <FormControlLabel control={<Switch checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />} label={t('common.active')} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={save.isPending || !draft.originZoneId || !draft.destinationZoneId || draft.originZoneId === draft.destinationZoneId || draft.fixedFare === ''}
              >
                {t('common.save')}
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        title={`${t('common.delete')}: ${deleting ? `${zoneName(deleting.originZone)} → ${zoneName(deleting.destinationZone)}` : ''}?`}
        body="Rides on this route go back to the km rate."
        busy={remove.isPending}
        error={remove.error}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
