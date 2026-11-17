import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Collapse,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import AddLocationAltOutlined from '@mui/icons-material/AddLocationAltOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingApi, type QuoteInput } from '../../api/api';
import { usePublicConfig } from '../../api/hooks';
import { errorCode, errorMessage } from '../../api/http';
import type { Place, QuoteItem, QuoteResponse, ServiceType } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { EmployeeBadge, ErrorAlert } from '../../components/common';
import { MapView, PINS, PlaceSearch, reverseGeocode } from '../../components/map';
import { vehicleLabel } from '../../i18n';
import { dayjs, DHAKA, fromLocalInput, money, num, toLocalInput } from '../../lib/format';

type Field = 'pickup' | 'dropoff' | 'stop';

export default function BookPage() {
  const { t, i18n } = useTranslation();
  const { me } = useAuth();
  const navigate = useNavigate();
  const config = usePublicConfig();
  const cfg = (k: string) => config.data?.[k];

  const [service, setService] = useState<ServiceType>('ride');
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [stops, setStops] = useState<Place[]>([]);
  const [active, setActive] = useState<Field>('pickup');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [startAt, setStartAt] = useState('');
  const [roundTrip, setRoundTrip] = useState(false);
  const [passengers, setPassengers] = useState(1);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [selected, setSelected] = useState<QuoteItem | null>(null);
  const [payment, setPayment] = useState('cash');
  const [promo, setPromo] = useState('');
  const [note, setNote] = useState('');
  const [now, setNow] = useState(Date.now());

  const isRental = service === 'rental';
  const scheduled = isRental || when === 'later';
  const minLead = Number(cfg(isRental ? 'service.rental.minLeadMinutes' : 'service.ride.scheduledMinLeadMinutes') ?? (isRental ? 120 : 30));
  const minStart = dayjs().add(minLead + 1, 'minute');
  const methods = (cfg('payments.methods') as string[] | undefined) ?? ['cash'];

  // Reset the quote whenever the trip changes.
  useEffect(() => {
    setQuote(null);
    setSelected(null);
  }, [service, pickup, dropoff, stops, when, startAt, roundTrip, passengers]);

  useEffect(() => {
    if (scheduled && !startAt) setStartAt(toLocalInput(minStart.add(isRental ? 60 : 0, 'minute').startOf('hour').add(1, 'hour').toDate()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduled]);

  useEffect(() => {
    if (!quote) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [quote]);

  const setPlace = (field: Field, p: Place) => {
    if (field === 'pickup') {
      setPickup(p);
      if (!dropoff) setActive('dropoff');
    } else if (field === 'dropoff') setDropoff(p);
    else {
      setStops((s) => [...s, p].slice(0, 10));
      setActive('dropoff');
    }
  };

  const onMapClick = async (lat: number, lng: number) => {
    const field = active;
    const rough = { latitude: lat, longitude: lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    setPlace(field, rough);
    const address = await reverseGeocode(lat, lng, i18n.language);
    const named = { ...rough, address };
    if (field === 'pickup') setPickup((p) => (p?.latitude === lat ? named : p));
    else if (field === 'dropoff') setDropoff((p) => (p?.latitude === lat ? named : p));
    else setStops((s) => s.map((x) => (x.latitude === lat && x.longitude === lng ? named : x)));
  };

  const quoteInput = (): QuoteInput | null =>
    pickup && dropoff
      ? {
          serviceType: service,
          pickup,
          dropoff,
          ...(isRental ? { stops, roundTrip } : {}),
          ...(scheduled && startAt ? { scheduledAt: fromLocalInput(startAt) } : {}),
          passengerCount: passengers,
        }
      : null;

  const getQuote = useMutation({
    mutationFn: (body: QuoteInput) => bookingApi.quote(body),
    onSuccess: (q) => {
      setQuote(q);
      setSelected(q.quotes.length === 1 ? q.quotes[0] : null);
      setNow(Date.now());
    },
  });

  const book = useMutation({
    mutationFn: () =>
      bookingApi.createTrip({
        quoteId: selected!.quoteId,
        paymentMethod: payment,
        promotionCode: promo.trim() || undefined,
        specialInstructions: note.trim() || undefined,
      }),
    onSuccess: (trip) => navigate(`/book/trips/${trip.id}`),
    onError: (e) => {
      if (errorCode(e) === 'QUOTE_EXPIRED') {
        const body = quoteInput();
        if (body) getQuote.mutate(body);
      }
    },
  });

  const secondsLeft = quote ? Math.max(0, Math.round((new Date(quote.expiresAt).getTime() - now) / 1000)) : 0;
  const expired = Boolean(quote) && secondsLeft === 0;
  const startValid = !scheduled || (startAt && dayjs.tz(startAt, DHAKA).isAfter(minStart.subtract(1, 'minute')));
  const canQuote = Boolean(pickup && dropoff) && startValid;
  const bookCode = errorCode(book.error);

  const markers = [
    ...(pickup ? [{ position: [pickup.latitude, pickup.longitude] as [number, number], icon: PINS.pickup, draggable: true, onDrag: (la: number, ln: number) => setPickup({ latitude: la, longitude: ln, address: `${la.toFixed(5)}, ${ln.toFixed(5)}` }) }] : []),
    ...stops.map((s) => ({ position: [s.latitude, s.longitude] as [number, number], icon: PINS.stop })),
    ...(dropoff ? [{ position: [dropoff.latitude, dropoff.longitude] as [number, number], icon: PINS.dropoff, draggable: true, onDrag: (la: number, ln: number) => setDropoff({ latitude: la, longitude: ln, address: `${la.toFixed(5)}, ${ln.toFixed(5)}` }) }] : []),
  ];
  const line = [pickup, ...stops, dropoff, ...(isRental && roundTrip && pickup ? [pickup] : [])].filter(Boolean).map((p) => [p!.latitude, p!.longitude] as [number, number]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }} spacing={1}>
        <Box>
          <Typography variant="h5" component="h1">{t('book.title')}</Typography>
          {me?.sparks.greetingName && <Typography color="text.secondary">{t('sparks.hello', { name: me.sparks.greetingName })}</Typography>}
        </Box>
        {me?.sparks.isEmployee && <EmployeeBadge designation={me.sparks.designation} size="medium" />}
      </Stack>

      {me?.sparks.isEmployee && me.sparks.discountPct > 0 && (
        <Alert icon={<AutoAwesomeOutlined />} severity="success">
          {t('sparks.discount', { pct: me.sparks.discountPct })} · {t('sparks.remaining', { amount: money(me.sparks.remainingThisMonthBdt) })}
          {me.sparks.priorityDispatch && ` · ${t('sparks.priority')}`}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <Tabs value={service} onChange={(_, v) => setService(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab value="ride" label={t('service.ride')} sx={{ minHeight: 52 }} />
              <Tab value="rental" label={t('service.rental')} sx={{ minHeight: 52 }} />
            </Tabs>
            <CardContent>
              <Stack spacing={2}>
                {isRental && <Alert severity="info">{t('book.rentalHelp')}</Alert>}
                <Box onFocus={() => setActive('pickup')}>
                  <PlaceSearch label={t('book.pickup')} value={pickup} onSelect={(p) => setPlace('pickup', p)} required />
                </Box>
                {isRental &&
                  stops.map((s, i) => (
                    <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <TextField label={`${t('book.stops')} ${i + 1}`} value={s.address} slotProps={{ input: { readOnly: true } }} size="small" />
                      <IconButton aria-label={`${t('common.delete')} ${t('book.stops')} ${i + 1}`} onClick={() => setStops((x) => x.filter((_, j) => j !== i))}>
                        <CloseOutlined />
                      </IconButton>
                    </Stack>
                  ))}
                {isRental && (
                  <Button startIcon={<AddLocationAltOutlined />} onClick={() => setActive('stop')} variant={active === 'stop' ? 'outlined' : 'text'} sx={{ alignSelf: 'flex-start' }} disabled={stops.length >= 10}>
                    {t('book.addStop')}
                  </Button>
                )}
                <Box onFocus={() => setActive('dropoff')}>
                  <PlaceSearch label={t('book.dropoff')} value={dropoff} onSelect={(p) => setPlace('dropoff', p)} required />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {t('book.mapHint', { field: active === 'pickup' ? t('book.pickup') : active === 'dropoff' ? t('book.dropoff') : t('book.stops') })}
                </Typography>

                {isRental ? (
                  <FormControlLabel control={<Switch checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />} label={t('book.roundTrip')} />
                ) : (
                  <ToggleButtonGroup exclusive value={when} onChange={(_, v) => v && setWhen(v)} aria-label={t('book.when')} fullWidth>
                    <ToggleButton value="now" sx={{ minHeight: 44 }}>{t('book.now')}</ToggleButton>
                    <ToggleButton value="later" sx={{ minHeight: 44 }}>{t('book.later')}</ToggleButton>
                  </ToggleButtonGroup>
                )}
                {scheduled && (
                  <TextField
                    label={t('book.startAt')}
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    error={!startValid}
                    helperText={`≥ ${toLocalInput(minStart.toDate()).replace('T', ' ')}`}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: toLocalInput(minStart.toDate()) } }}
                  />
                )}
                <TextField select label={t('book.passengers')} value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
                  {Array.from({ length: isRental ? 12 : 4 }, (_, i) => i + 1).map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </TextField>
                <Button variant="contained" size="large" disabled={!canQuote || getQuote.isPending} onClick={() => { const b = quoteInput(); if (b) getQuote.mutate(b); }}>
                  {t('book.getPrices')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            <MapView height={360} markers={markers} line={line} onClick={onMapClick} />
            <ErrorAlert error={getQuote.error} />

            <Collapse in={Boolean(quote)} unmountOnExit>
              {quote && (
                <Card>
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" component="h2">{t('book.choose')}</Typography>
                      <Chip
                        color={expired ? 'error' : secondsLeft < 60 ? 'warning' : 'default'}
                        label={expired ? t('book.expired') : t('book.expiresIn', { time: `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` })}
                        aria-live="polite"
                      />
                    </Stack>
                    <Stack spacing={1} role="radiogroup" aria-label={t('book.choose')}>
                      {quote.quotes.map((q) => {
                        const isSel = selected?.quoteId === q.quoteId;
                        return (
                          <Card key={q.quoteId} variant="outlined" sx={{ borderColor: isSel ? 'primary.main' : undefined, borderWidth: isSel ? 2 : 1 }}>
                            <CardActionArea role="radio" aria-checked={isSel} onClick={() => setSelected(q)} disabled={expired} sx={{ p: 2 }}>
                              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography sx={{ fontWeight: 600 }}>{vehicleLabel(t, q.vehicleType)}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {t('book.distance', { km: num(q.chargedKm, 1) })} · {t('book.minutes', { min: q.durationMinutes })}
                                    {q.pricingMode === 'route' && ` · ${t('book.fixedRoute')}`}
                                  </Typography>
                                  {q.discount > 0 && (
                                    <Typography variant="body2" color="success.main">
                                      {q.discountSource === 'employee' ? t('book.employeeDiscount') : t('book.promoDiscount')}: − {money(q.discount)}
                                    </Typography>
                                  )}
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                  {q.discount > 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                      {money(q.fare)}
                                    </Typography>
                                  )}
                                  <Typography variant="h6" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(q.total)}</Typography>
                                </Box>
                              </Stack>
                            </CardActionArea>
                          </Card>
                        );
                      })}
                    </Stack>

                    {selected && !expired && (
                      <Stack spacing={2} sx={{ mt: 3 }}>
                        <Breakdown q={selected} />
                        <TextField select label={t('book.payment')} value={payment} onChange={(e) => setPayment(e.target.value)}>
                          {methods.map((m) => <MenuItem key={m} value={m}>{t(`book.${m}`, { defaultValue: m })}</MenuItem>)}
                        </TextField>
                        <TextField label={t('book.promo')} value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} helperText={me?.sparks.isEmployee ? 'The larger of your employee discount and the promo applies.' : undefined} />
                        <TextField label={t('book.note')} value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} />
                        {book.error && (
                          <Alert
                            severity="error"
                            action={bookCode === 'ACTIVE_TRIP_EXISTS' ? <Button color="inherit" size="small" component={RouterLink} to="/book/trips">{t('book.viewTrip')}</Button> : undefined}
                          >
                            {bookCode === 'ACTIVE_TRIP_EXISTS' ? t('book.activeTrip') : bookCode === 'QUOTE_EXPIRED' ? t('book.expired') : errorMessage(book.error)}
                          </Alert>
                        )}
                        <Button variant="contained" size="large" onClick={() => book.mutate()} disabled={book.isPending}>
                          {t('book.confirm')} · {money(selected.total)}
                        </Button>
                      </Stack>
                    )}
                    {expired && (
                      <Button sx={{ mt: 2 }} variant="outlined" onClick={() => { const b = quoteInput(); if (b) getQuote.mutate(b); }}>
                        {t('book.getPrices')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </Collapse>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

function Breakdown({ q }: { q: QuoteItem }) {
  const { t } = useTranslation();
  const rows = (Object.keys(q.breakdown) as (keyof QuoteItem['breakdown'])[]).filter((k) => q.breakdown[k] > 0);
  return (
    <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
      {q.pricingMode === 'route' ? (
        <Row label={t('book.fixedRoute')} value={money(q.fare)} />
      ) : (
        rows.map((k) => <Row key={k} label={t(`book.breakdown.${k}`)} value={money(q.breakdown[k])} />)
      )}
      {q.discount > 0 && <Row label={q.discountSource === 'employee' ? t('book.employeeDiscount') : t('book.promoDiscount')} value={`− ${money(q.discount)}`} />}
      <Row label={t('book.youPay')} value={money(q.total)} strong />
    </Box>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : undefined }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : undefined, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Stack>
  );
}
