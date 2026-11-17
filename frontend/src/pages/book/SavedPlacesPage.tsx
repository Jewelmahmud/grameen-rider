import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import WorkOutline from '@mui/icons-material/WorkOutline';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { useTranslation } from 'react-i18next';
import { customerApi, type SavedPlace, type SavedPlaceInput } from '../../api/api';
import type { Place } from '../../api/types';
import { CardSkeleton, ConfirmDialog, EmptyState, ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { MapView, PINS, PlaceSearch, reverseGeocode } from '../../components/map';

export const PLACE_ICON = { home: <HomeOutlined />, work: <WorkOutline />, other: <PlaceOutlined /> } as const;

export default function SavedPlacesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const notify = useNotify();
  const places = useQuery({ queryKey: ['places'], queryFn: customerApi.places });
  const [draft, setDraft] = useState<(Partial<SavedPlaceInput> & { id?: string }) | null>(null);
  const [deleting, setDeleting] = useState<SavedPlace | null>(null);
  const taken = new Set((places.data ?? []).filter((p) => p.id !== draft?.id).map((p) => p.locationType));

  const remove = useMutation({
    mutationFn: (id: string) => customerApi.deletePlace(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['places'] });
      setDeleting(null);
      notify(t('common.saved'));
    },
  });

  return (
    <>
      <PageHeader
        title={t('places.title')}
        subtitle={t('places.sub')}
        action={
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => {
              const type = taken.has('home') ? (taken.has('work') ? 'other' : 'work') : 'home';
              setDraft({ locationType: type, name: type === 'other' ? '' : t(`places.${type}`) });
            }}
          >
            {t('places.add')}
          </Button>
        }
      />
      <ErrorAlert error={places.error} onRetry={() => places.refetch()} />
      <Card>
        <CardContent>
          {places.isLoading && <CardSkeleton />}
          {!places.isLoading && (places.data ?? []).length === 0 && <EmptyState title={t('places.empty')} />}
          <List>
            {(places.data ?? []).map((p) => (
              <ListItem
                key={p.id}
                divider
                secondaryAction={
                  <Stack direction="row">
                    <Tooltip title={t('common.edit')}>
                      <IconButton aria-label={`${t('common.edit')}: ${p.name}`} onClick={() => setDraft({ ...p, latitude: Number(p.latitude), longitude: Number(p.longitude) })}>
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                      <IconButton aria-label={`${t('common.delete')}: ${p.name}`} onClick={() => setDeleting(p)}>
                        <DeleteOutline />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              >
                <ListItemIcon sx={{ color: 'primary.main' }}>{PLACE_ICON[p.locationType] ?? PLACE_ICON.other}</ListItemIcon>
                <ListItemText primary={p.name} secondary={p.address} slotProps={{ secondary: { noWrap: true } }} sx={{ pr: 10 }} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
      <PlaceDialog draft={draft} taken={taken} onClose={() => setDraft(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        title={`${t('common.delete')}: ${deleting?.name ?? ''}?`}
        busy={remove.isPending}
        error={remove.error}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}

function PlaceDialog({ draft, taken, onClose }: { draft: (Partial<SavedPlaceInput> & { id?: string }) | null; taken: Set<string>; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const notify = useNotify();
  const [state, setState] = useState<typeof draft>(null);
  const d = state ?? draft;
  const set = (patch: Partial<SavedPlaceInput>) => setState({ ...(d ?? {}), ...patch });
  const place: Place | null = d?.latitude != null && d.longitude != null ? { address: d.address ?? '', latitude: d.latitude, longitude: d.longitude } : null;

  const save = useMutation({
    mutationFn: () => {
      const body: SavedPlaceInput = {
        name: (d!.name ?? '').trim(),
        address: d!.address ?? '',
        latitude: Number(d!.latitude),
        longitude: Number(d!.longitude),
        locationType: d!.locationType ?? 'other',
      };
      return d!.id ? customerApi.updatePlace(d!.id, body) : customerApi.addPlace(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['places'] });
      notify(t('common.saved'));
      close();
    },
  });
  const close = () => {
    setState(null);
    save.reset();
    onClose();
  };
  const typeName = (k: 'home' | 'work' | 'other') => t(`places.${k}`);

  return (
    <Dialog open={Boolean(draft)} onClose={close} maxWidth="md">
      <DialogTitle>{d?.id ? t('common.edit') : t('places.add')}</DialogTitle>
      <DialogContent>
        <ErrorAlert error={save.error} />
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup exclusive value={d?.locationType ?? 'other'} onChange={(_, v) => v && set({ locationType: v, name: d?.name || (v === 'other' ? '' : typeName(v)) })} aria-label={t('places.type')}>
            {(['home', 'work', 'other'] as const).map((k) => (
              <ToggleButton key={k} value={k} disabled={k !== 'other' && taken.has(k)} sx={{ gap: 1, minHeight: 44 }}>
                {PLACE_ICON[k]} {typeName(k)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField label={t('places.name')} value={d?.name ?? ''} onChange={(e) => set({ name: e.target.value })} required size="medium" slotProps={{ htmlInput: { maxLength: 100 } }} />
          <PlaceSearch label={t('places.pickOnMap')} value={place} onSelect={(p) => set({ address: p.address, latitude: p.latitude, longitude: p.longitude })} required />
          <MapView
            height={280}
            markers={place ? [{ position: [place.latitude, place.longitude], icon: PINS.pickup }] : []}
            onClick={async (lat, lng) => {
              set({ latitude: lat, longitude: lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
              const address = await reverseGeocode(lat, lng, i18n.language);
              setState((s) => (s && s.latitude === lat ? { ...s, address } : s));
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending || !d?.name?.trim() || !place}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
