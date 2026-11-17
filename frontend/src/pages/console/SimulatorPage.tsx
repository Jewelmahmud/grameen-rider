import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { pricingApi, type QuoteInput, type SimulationResult } from '../../api/api';
import type { Place, ServiceType } from '../../api/types';
import { ErrorAlert, PageHeader } from '../../components/common';
import { SimpleGrid } from '../../components/grid';
import { MapView, PINS, reverseGeocode } from '../../components/map';
import { vehicleLabel } from '../../i18n';
import { fromLocalInput, money, toLocalInput } from '../../lib/format';

/** What a trip would cost under the current rules, without a customer or a stored quote. */
export default function SimulatorPage() {
  const { t, i18n } = useTranslation();
  const [service, setService] = useState<ServiceType>('ride');
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [roundTrip, setRoundTrip] = useState(false);
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [passengers, setPassengers] = useState(1);

  const sim = useMutation({ mutationFn: (body: QuoteInput) => pricingApi.simulate(body) });

  const onMap = async (lat: number, lng: number) => {
    const place = { latitude: lat, longitude: lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    const setTarget = !pickup || dropoff ? setPickup : setDropoff;
    if (setTarget === setPickup) setDropoff(null);
    setTarget(place);
    const address = await reverseGeocode(lat, lng, i18n.language);
    setTarget((p) => (p && p.latitude === lat && p.longitude === lng ? { ...p, address } : p));
  };

  const run = () =>
    pickup &&
    dropoff &&
    sim.mutate({
      serviceType: service,
      pickup,
      dropoff,
      roundTrip: service === 'rental' ? roundTrip : undefined,
      scheduledAt: fromLocalInput(at),
      passengerCount: passengers,
    });

  const columns: GridColDef<SimulationResult & { id: string }>[] = [
    { field: 'vehicleType', headerName: t('trips.vehicle'), width: 140, valueFormatter: (v: string) => vehicleLabel(t, v) },
    {
      field: 'rule',
      headerName: 'Rule applied',
      width: 170,
      renderCell: ({ row }) =>
        !row.breakdown ? (
          <Chip size="small" color="error" label={row.reason ?? 'No rate'} />
        ) : row.breakdown.pricingMode === 'route' ? (
          <Chip size="small" color="info" label={`Route fare ${money(row.routeFare?.fixedFare)}`} />
        ) : (
          <Chip size="small" label={`Km rate v${row.rate?.version}`} />
        ),
    },
    { field: 'km', headerName: 'Charged km', width: 100, type: 'number', valueGetter: (_, r) => r.breakdown?.chargedKm ?? null },
    { field: 'base', headerName: 'Base', width: 90, type: 'number', valueGetter: (_, r) => r.breakdown?.baseFare ?? null, valueFormatter: (v) => money(v as number) },
    { field: 'dist', headerName: 'Distance', width: 100, type: 'number', valueGetter: (_, r) => r.breakdown?.distanceFare ?? null, valueFormatter: (v) => money(v as number) },
    { field: 'time', headerName: 'Time', width: 90, type: 'number', valueGetter: (_, r) => r.breakdown?.timeFare ?? null, valueFormatter: (v) => money(v as number) },
    { field: 'night', headerName: 'Night', width: 90, type: 'number', valueGetter: (_, r) => r.breakdown?.nightSurcharge ?? null, valueFormatter: (v) => money(v as number) },
    { field: 'fare', headerName: 'Fare', width: 100, type: 'number', valueGetter: (_, r) => r.breakdown?.fare ?? null, valueFormatter: (v) => money(v as number) },
    { field: 'comm', headerName: 'Commission', width: 120, type: 'number', valueGetter: (_, r) => r.breakdown?.grossCommission ?? null, valueFormatter: (v) => money(v as number) },
    { field: 'driver', headerName: 'Driver earns', width: 120, type: 'number', valueGetter: (_, r) => r.breakdown?.driverEarning ?? null, valueFormatter: (v) => money(v as number) },
  ];

  return (
    <>
      <PageHeader
        title={t('nav.simulator')}
        subtitle="Check what a trip would cost with today's rates, route fares and night settings. Discounts are not included."
        crumbs={[{ label: t('nav.pricing') }]}
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Tabs value={service} onChange={(_, v) => setService(v)} sx={{ mb: 2 }}>
                <Tab value="ride" label={t('service.ride')} />
                <Tab value="rental" label={t('service.rental')} />
              </Tabs>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Click the map: first the pickup, then the destination.
                </Typography>
                <TextField label={t('book.pickup')} value={pickup?.address ?? ''} slotProps={{ input: { readOnly: true } }} />
                <TextField label={t('book.dropoff')} value={dropoff?.address ?? ''} slotProps={{ input: { readOnly: true } }} />
                <TextField label={t('book.startAt')} type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} helperText="Night pricing depends on this time (Dhaka)" slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label={t('book.passengers')} type="number" value={passengers} onChange={(e) => setPassengers(Math.max(1, Number(e.target.value)))} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
                {service === 'rental' && (
                  <FormControlLabel control={<Switch checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />} label={t('book.roundTrip')} />
                )}
                <Button variant="contained" onClick={run} disabled={!pickup || !dropoff || sim.isPending}>
                  Calculate
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <MapView
            height={420}
            onClick={onMap}
            markers={[
              ...(pickup ? [{ position: [pickup.latitude, pickup.longitude] as [number, number], icon: PINS.pickup }] : []),
              ...(dropoff ? [{ position: [dropoff.latitude, dropoff.longitude] as [number, number], icon: PINS.dropoff }] : []),
            ]}
            line={pickup && dropoff ? [[pickup.latitude, pickup.longitude], [dropoff.latitude, dropoff.longitude]] : undefined}
          />
        </Grid>
        <Grid size={12}>
          <ErrorAlert error={sim.error} />
          {sim.data && <SimpleGrid rows={sim.data.map((r) => ({ ...r, id: r.vehicleType }))} columns={columns} hideFooter />}
        </Grid>
      </Grid>
    </>
  );
}
