import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { pricingApi, type ZoneInput } from '../../api/api';
import type { Zone } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { CardSkeleton, ConfirmDialog, EmptyState, ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { DHAKA_CENTER, MapView, PINS } from '../../components/map';

type Draft = ZoneInput & { id?: string };

const blank = (lat = DHAKA_CENTER[0], lng = DHAKA_CENTER[1]): Draft => ({
  nameBn: '',
  nameEn: '',
  centerLatitude: lat,
  centerLongitude: lng,
  radiusM: 1500,
  isActive: true,
});

export default function ZonesPage() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const canWrite = can('fares.write');
  const qc = useQueryClient();
  const notify = useNotify();
  const zones = useQuery({ queryKey: ['zones'], queryFn: pricingApi.zones });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Zone | null>(null);

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body: ZoneInput = {
        nameBn: d.nameBn.trim(),
        nameEn: d.nameEn.trim(),
        centerLatitude: Number(d.centerLatitude),
        centerLongitude: Number(d.centerLongitude),
        radiusM: Math.round(d.radiusM),
        isActive: d.isActive,
      };
      return d.id ? pricingApi.updateZone(d.id, body) : pricingApi.createZone(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['zones'] });
      notify(t('common.saved'));
      setDraft(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => pricingApi.deleteZone(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['zones'] });
      void qc.invalidateQueries({ queryKey: ['routes'] });
      setDeleting(null);
      notify(t('common.saved'));
    },
  });

  const name = (z: Zone) => (i18n.language === 'bn' ? z.nameBn : z.nameEn) || z.nameEn || z.nameBn;
  const list = zones.data ?? [];

  return (
    <>
      <PageHeader
        title={t('nav.zones')}
        subtitle="Circular areas used by route fares. A trip gets a route fare when its pickup is in one zone and its destination in the other."
        crumbs={[{ label: t('nav.pricing') }]}
        action={canWrite && <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setDraft(blank())}>{t('common.add')}</Button>}
      />
      <ErrorAlert error={zones.error} onRetry={() => zones.refetch()} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            {zones.isLoading ? (
              <CardContent><CardSkeleton /></CardContent>
            ) : list.length === 0 ? (
              <EmptyState />
            ) : (
              <List dense>
                {list.map((z) => (
                  <ListItemButton key={z.id} onClick={() => setDraft({ ...z })} selected={draft?.id === z.id}>
                    <ListItemText
                      primary={name(z)}
                      secondary={`${(z.radiusM / 1000).toFixed(1)} km radius`}
                    />
                    {!z.isActive && <Chip size="small" label={t('common.inactive')} sx={{ mr: 1 }} />}
                    {canWrite && (
                      <Tooltip title={t('common.delete')}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(z);
                          }}
                          aria-label={`${t('common.delete')}: ${name(z)}`}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemButton>
                ))}
              </List>
            )}
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <MapView
            height={520}
            fit={false}
            circles={[
              ...list.filter((z) => z.id !== draft?.id).map((z) => ({ center: [z.centerLatitude, z.centerLongitude] as [number, number], radius: z.radiusM, color: z.isActive ? '#0277bd' : '#9e9e9e' })),
              ...(draft ? [{ center: [draft.centerLatitude, draft.centerLongitude] as [number, number], radius: draft.radiusM, color: '#0f7a3f' }] : []),
            ]}
            markers={draft ? [{ position: [draft.centerLatitude, draft.centerLongitude], icon: PINS.zone, draggable: canWrite, onDrag: (lat, lng) => setDraft((d) => d && { ...d, centerLatitude: lat, centerLongitude: lng }) }] : []}
            onClick={canWrite ? (lat, lng) => setDraft((d) => (d ? { ...d, centerLatitude: lat, centerLongitude: lng } : blank(lat, lng))) : undefined}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click the map to place a new zone, or drag the pin to move the selected one.
          </Typography>
        </Grid>
      </Grid>

      <Drawer anchor="right" open={Boolean(draft)} onClose={() => setDraft(null)} variant="persistent" slotProps={{ paper: { sx: { width: { xs: '100%', sm: 360 }, top: 64, height: 'calc(100% - 64px)' } } }}>
        {draft && (
          <Box component="form" sx={{ p: 3 }} onSubmit={(e) => { e.preventDefault(); save.mutate(draft); }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              {draft.id ? t('common.edit') : t('common.add')} — {t('nav.zones')}
            </Typography>
            <ErrorAlert error={save.error} />
            <Stack spacing={2}>
              <TextField label="Name (Bangla)" value={draft.nameBn} onChange={(e) => setDraft({ ...draft, nameBn: e.target.value })} required disabled={!canWrite} />
              <TextField label="Name (English)" value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} required disabled={!canWrite} />
              <Stack direction="row" spacing={1}>
                <TextField label="Latitude" type="number" value={draft.centerLatitude} onChange={(e) => setDraft({ ...draft, centerLatitude: Number(e.target.value) })} disabled={!canWrite} slotProps={{ htmlInput: { step: 0.0001 } }} />
                <TextField label="Longitude" type="number" value={draft.centerLongitude} onChange={(e) => setDraft({ ...draft, centerLongitude: Number(e.target.value) })} disabled={!canWrite} slotProps={{ htmlInput: { step: 0.0001 } }} />
              </Stack>
              <TextField
                label="Radius"
                type="number"
                value={draft.radiusM}
                onChange={(e) => setDraft({ ...draft, radiusM: Number(e.target.value) })}
                disabled={!canWrite}
                helperText="50 – 50,000 m"
                slotProps={{ htmlInput: { min: 50, max: 50000, step: 50 }, input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }}
              />
              <FormControlLabel control={<Switch checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} disabled={!canWrite} />} label={t('common.active')} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDraft(null)}>{t('common.close')}</Button>
              {canWrite && (
                <Button type="submit" variant="contained" disabled={save.isPending || !draft.nameBn.trim() || !draft.nameEn.trim() || draft.radiusM < 50 || draft.radiusM > 50000}>
                  {t('common.save')}
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        title={`${t('common.delete')}: ${deleting ? name(deleting) : ''}?`}
        body="Route fares that use this zone stop applying. Trips already booked keep their price."
        busy={remove.isPending}
        error={remove.error}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
