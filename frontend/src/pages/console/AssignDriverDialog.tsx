import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { opsApi, peopleApi } from '../../api/api';
import type { DriverRow, Trip } from '../../api/types';
import { ErrorAlert, useNotify } from '../../components/common';
import { vehicleLabel } from '../../i18n';
import { fullName } from '../../lib/format';

/** Manual assignment by operations (e.g. a rental nobody accepted by T − 30). */
export function AssignDriverDialog({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [vehicleId, setVehicleId] = useState('');

  const drivers = useQuery({
    queryKey: ['assign-drivers', search],
    queryFn: () => peopleApi.drivers({ q: search || undefined, verification: 'approved', suspended: 'false', pageSize: 20 }),
    enabled: Boolean(trip),
  });

  const assign = useMutation({
    mutationFn: () => opsApi.assign(trip!.id, driver!.id, vehicleId || undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-trip', trip!.id] });
      void qc.invalidateQueries({ queryKey: ['admin-trips'] });
      void qc.invalidateQueries({ queryKey: ['rentals-upcoming'] });
      notify(t('common.saved'));
      close();
    },
  });

  const close = () => {
    setDriver(null);
    setVehicleId('');
    setSearch('');
    assign.reset();
    onClose();
  };

  const vehicles = (driver?.vehicles ?? []).filter((v) => v.isActive && v.vehicleType === trip?.vehicleType);

  return (
    <Dialog open={Boolean(trip)} onClose={close}>
      <DialogTitle>
        {t('trips.assign')} — {trip?.tripNumber}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {trip && `${vehicleLabel(t, trip.vehicleType)} · ${t(`service.${trip.serviceType}`)}`}. Only approved, active drivers are listed.
        </Typography>
        <ErrorAlert error={assign.error ?? drivers.error} />
        <Stack spacing={2}>
          <Autocomplete
            options={drivers.data?.items ?? []}
            loading={drivers.isFetching}
            value={driver}
            onChange={(_, v) => {
              setDriver(v);
              setVehicleId('');
            }}
            onInputChange={(_, v, reason) => reason === 'input' && setSearch(v)}
            filterOptions={(x) => x}
            getOptionLabel={(d) => `${fullName(d.userProfile)} · ${d.userProfile?.phoneNumber ?? ''}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderOption={(props, d) => (
              <li {...props} key={d.id}>
                <Stack>
                  <span>{fullName(d.userProfile)}</span>
                  <Typography variant="body2" color="text.secondary">
                    {d.userProfile?.phoneNumber} · {d.isOnline ? (d.isAvailable ? 'Online, free' : 'Online, busy') : 'Offline'} ·{' '}
                    {(d.vehicles ?? []).map((v) => vehicleLabel(t, v.vehicleType)).join(', ')}
                  </Typography>
                </Stack>
              </li>
            )}
            renderInput={(params) => <TextField {...params} label={t('trips.driverId')} placeholder="Name or phone" />}
          />
          {driver && (
            <TextField select label={t('trips.vehicleId')} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} helperText={vehicles.length ? undefined : `No active ${vehicleLabel(t, trip?.vehicleType ?? '')} on this driver; the server will pick or refuse.`}>
              <MenuItem value="">Automatic</MenuItem>
              {vehicles.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {[v.make, v.model, v.licensePlate].filter(Boolean).join(' · ') || v.id}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!driver || assign.isPending} onClick={() => assign.mutate()}>
          {t('trips.assign')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
