import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import { useTranslation } from 'react-i18next';
import { pricingApi, type FareRateInput } from '../../api/api';
import type { FareRate, ServiceType } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { moneyCol, SimpleGrid } from '../../components/grid';
import { vehicleLabel } from '../../i18n';
import { dateTime, money, num } from '../../lib/format';

const FIELDS: { key: keyof FareRateInput; label: string; unit: string; help?: string; rentalOnly?: boolean; optional?: boolean; max: number; step?: number }[] = [
  { key: 'baseFare', label: 'Base fare', unit: '৳', max: 100000, help: 'Charged on every trip; covers the first base km' },
  { key: 'baseKm', label: 'Km included in base', unit: 'km', max: 500, step: 0.1 },
  { key: 'perKm', label: 'Per km (after base)', unit: '৳/km', max: 10000, step: 0.5 },
  { key: 'perMinute', label: 'Per minute', unit: '৳/min', max: 1000, step: 0.5 },
  { key: 'minimumFare', label: 'Minimum fare', unit: '৳', max: 100000 },
  { key: 'waitingPerMinute', label: 'Waiting per minute', unit: '৳/min', max: 1000, step: 0.5 },
  { key: 'extraPassengerFare', label: 'Each extra passenger', unit: '৳', max: 10000 },
  { key: 'returnLegFactor', label: 'Return leg charged', unit: '× (0–1)', max: 1, step: 0.05, rentalOnly: true, optional: true, help: 'Round trips: share of the return distance charged. 1 = full price, 0.5 = half.' },
  { key: 'commissionPct', label: 'Commission', unit: '%', max: 100, optional: true, help: 'Leave empty to use the global commission from Settings' },
];

const emptyRate = (service: ServiceType): FareRateInput => ({
  baseFare: 0,
  baseKm: 0,
  perKm: 0,
  perMinute: 0,
  minimumFare: 0,
  waitingPerMinute: 0,
  extraPassengerFare: 0,
  returnLegFactor: service === 'rental' ? 0.5 : null,
  commissionPct: null,
});

export default function RatesPage({ service }: { service: ServiceType }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const canWrite = can('fares.write');
  const [editing, setEditing] = useState<{ vehicleType: string; rate: FareRateInput; isNew: boolean } | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const rates = useQuery({ queryKey: ['rates', service], queryFn: () => pricingApi.rates(service) });

  const columns: GridColDef<FareRate>[] = [
    { field: 'vehicleType', headerName: t('trips.vehicle'), flex: 1, minWidth: 140, valueFormatter: (v: string) => vehicleLabel(t, v) },
    moneyCol('baseFare', 'Base'),
    { field: 'baseKm', headerName: 'Base km', width: 90, type: 'number' },
    moneyCol('perKm', 'Per km', 100),
    moneyCol('perMinute', 'Per min', 100),
    moneyCol('minimumFare', 'Minimum'),
    ...(service === 'rental'
      ? [{ field: 'returnLegFactor', headerName: 'Return leg', width: 100, type: 'number', valueFormatter: (v: number | null) => (v === null ? '—' : `× ${num(v)}`) } as GridColDef<FareRate>]
      : []),
    { field: 'commissionPct', headerName: 'Commission', width: 110, type: 'number', valueFormatter: (v: number | null) => (v === null ? 'Global' : `${num(v)}%`) },
    { field: 'version', headerName: t('common.version'), width: 80, type: 'number', valueFormatter: (v: number) => `v${v}` },
    { field: 'createdAt', headerName: t('common.changedAt'), width: 170, valueFormatter: (v: string) => dateTime(v) },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row">
          <Tooltip title={t('common.history')}>
            <IconButton size="small" onClick={() => setHistoryFor(row.vehicleType)} aria-label={`${t('common.history')}: ${row.vehicleType}`}>
              <HistoryOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          {canWrite && (
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                onClick={() => setEditing({ vehicleType: row.vehicleType, rate: pick(row), isNew: false })}
                aria-label={`${t('common.edit')}: ${row.vehicleType}`}
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={service === 'ride' ? t('nav.rideRates') : t('nav.rentalRates')}
        subtitle={
          service === 'ride'
            ? 'Km-based fares per vehicle type. A route fare between two zones takes priority over these.'
            : 'Km-based rental fares, booked ahead. Round trips charge the return leg by the factor you set.'
        }
        crumbs={[{ label: t('nav.pricing') }]}
        action={
          canWrite && (
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setEditing({ vehicleType: '', rate: emptyRate(service), isNew: true })}>
              Add vehicle type
            </Button>
          )
        }
      />
      <ErrorAlert error={rates.error} onRetry={() => rates.refetch()} />
      <Alert severity="info" sx={{ mb: 2 }}>
        Every save creates a new version; trips already booked keep the price they were quoted. Customers only see vehicle
        types enabled in Settings → service.{service}.vehicleTypes.
      </Alert>
      <SimpleGrid rows={rates.data ?? []} columns={columns} loading={rates.isLoading} getRowId={(r) => r.id} />

      <RateEditor service={service} editing={editing} onClose={() => setEditing(null)} />
      <RateHistory service={service} vehicleType={historyFor} onClose={() => setHistoryFor(null)} />
    </>
  );
}

const pick = (r: FareRate): FareRateInput => ({
  baseFare: Number(r.baseFare),
  baseKm: Number(r.baseKm),
  perKm: Number(r.perKm),
  perMinute: Number(r.perMinute),
  minimumFare: Number(r.minimumFare),
  waitingPerMinute: Number(r.waitingPerMinute ?? 0),
  extraPassengerFare: Number(r.extraPassengerFare ?? 0),
  returnLegFactor: r.returnLegFactor === null ? null : Number(r.returnLegFactor),
  commissionPct: r.commissionPct === null ? null : Number(r.commissionPct),
});

function RateEditor({
  service,
  editing,
  onClose,
}: {
  service: ServiceType;
  editing: { vehicleType: string; rate: FareRateInput; isNew: boolean } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const notify = useNotify();
  const [vehicleType, setVehicleType] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editing) return;
    setVehicleType(editing.vehicleType);
    setValues(Object.fromEntries(Object.entries(editing.rate).map(([k, v]) => [k, v === null ? '' : String(v)])));
  }, [editing]);

  const save = useMutation({
    mutationFn: () => {
      const body = Object.fromEntries(
        FIELDS.filter((f) => !f.rentalOnly || service === 'rental').map((f) => [
          f.key,
          values[f.key] === '' || values[f.key] === undefined ? (f.optional ? null : 0) : Number(values[f.key]),
        ]),
      ) as unknown as FareRateInput;
      return pricingApi.saveRate(service, vehicleType.trim(), body);
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['rates', service] });
      void qc.invalidateQueries({ queryKey: ['rate-history', service, r.vehicleType] });
      notify(`${vehicleLabel(t, r.vehicleType)} saved as v${r.version}`);
      onClose();
    },
  });

  const typeValid = /^[a-z][a-z0-9_]{1,19}$/.test(vehicleType.trim());
  const invalid = FIELDS.some((f) => {
    const v = values[f.key];
    if (f.rentalOnly && service !== 'rental') return false;
    if (v === '' || v === undefined) return !f.optional;
    const n = Number(v);
    return Number.isNaN(n) || n < 0 || n > f.max;
  });

  // Live example: 10 km, 25 min.
  const n = (k: string) => Number(values[k] || 0);
  const exampleKm = 10;
  const example = Math.max(n('minimumFare'), n('baseFare') + Math.max(0, exampleKm - n('baseKm')) * n('perKm') + 25 * n('perMinute'));

  return (
    <Drawer anchor="right" open={Boolean(editing)} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 } } } }}>
      <Box sx={{ p: 3 }} component="form" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Typography variant="h6" component="h2">
          {editing?.isNew ? 'New vehicle type' : `${vehicleLabel(t, vehicleType)} — ${t(`service.${service}`)}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Saving creates the next version. The current version stays in history.
        </Typography>
        <ErrorAlert error={save.error} />
        <Stack spacing={2}>
          {editing?.isNew && (
            <TextField
              label="Vehicle type key"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value.toLowerCase())}
              helperText="Lowercase letters, digits or _ (e.g. pickup_van). Enable it for customers in Settings."
              error={Boolean(vehicleType) && !typeValid}
              required
            />
          )}
          {FIELDS.filter((f) => !f.rentalOnly || service === 'rental').map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              type="number"
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              helperText={f.help}
              placeholder={f.optional ? 'Empty = default' : undefined}
              required={!f.optional}
              slotProps={{
                htmlInput: { min: 0, max: f.max, step: f.step ?? 1, inputMode: 'decimal' },
                input: { endAdornment: <InputAdornment position="end">{f.unit}</InputAdornment> },
              }}
            />
          ))}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Example: {exampleKm} km, 25 min (day, one passenger) ≈ <strong>{money(Math.round(example))}</strong>
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={save.isPending || invalid || !typeValid}>
            {t('common.save')}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}

function RateHistory({ service, vehicleType, onClose }: { service: ServiceType; vehicleType: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const history = useQuery({
    queryKey: ['rate-history', service, vehicleType],
    queryFn: () => pricingApi.history(service, vehicleType!),
    enabled: Boolean(vehicleType),
  });
  const columns: GridColDef<FareRate>[] = [
    { field: 'version', headerName: t('common.version'), width: 80, valueFormatter: (v: number) => `v${v}` },
    moneyCol('baseFare', 'Base', 90),
    { field: 'baseKm', headerName: 'Base km', width: 80 },
    moneyCol('perKm', 'Per km', 90),
    moneyCol('perMinute', 'Per min', 90),
    moneyCol('minimumFare', 'Min', 90),
    { field: 'isCurrent', headerName: 'Current', width: 80, type: 'boolean' },
    { field: 'createdAt', headerName: t('common.changedAt'), width: 170, valueFormatter: (v: string) => dateTime(v) },
  ];
  return (
    <Dialog open={Boolean(vehicleType)} onClose={onClose} maxWidth="md">
      <DialogTitle>
        {t('common.history')}: {vehicleType && vehicleLabel(t, vehicleType)} ({t(`service.${service}`)})
      </DialogTitle>
      <DialogContent>
        <ErrorAlert error={history.error} />
        <SimpleGrid rows={history.data ?? []} columns={columns} loading={history.isLoading} />
      </DialogContent>
    </Dialog>
  );
}
