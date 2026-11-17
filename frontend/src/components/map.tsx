import { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, IconButton, InputAdornment, List, ListItemButton, ListItemText, Paper, TextField, Tooltip } from '@mui/material';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import MyLocationOutlined from '@mui/icons-material/MyLocationOutlined';
import { useTranslation } from 'react-i18next';
import type { Place } from '../api/types';

export const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL?.trim() || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const GEOCODER_URL = import.meta.env.VITE_GEOCODER_URL?.trim() || 'https://nominatim.openstreetmap.org';

/** Coloured SVG pins (Leaflet's default icons need bundler workarounds). */
const pin = (color: string, label: string) =>
  L.divIcon({
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    html: `<svg width="28" height="36" viewBox="0 0 28 36" aria-label="${label}"><path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 36 14 36s14-12 14-22.3C28 6.1 21.7 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="5" fill="#fff"/></svg>`,
  });

export const PINS = {
  pickup: pin('#0f7a3f', 'pickup'),
  dropoff: pin('#c62828', 'dropoff'),
  stop: pin('#b26a00', 'stop'),
  zone: pin('#0277bd', 'zone'),
};

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FitTo({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], Math.max(map.getZoom(), 14));
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export interface MapMarker {
  position: [number, number];
  icon?: L.DivIcon;
  draggable?: boolean;
  onDrag?: (lat: number, lng: number) => void;
}

export function MapView({
  markers = [],
  circles = [],
  line,
  onClick,
  height = 360,
  fit = true,
}: {
  markers?: MapMarker[];
  circles?: { center: [number, number]; radius: number; color?: string; label?: string }[];
  line?: [number, number][];
  onClick?: (lat: number, lng: number) => void;
  height?: number | string;
  fit?: boolean;
}) {
  const fitPoints = useMemo(() => markers.map((m) => m.position), [markers]);
  return (
    <Box sx={{ height, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider', '& .leaflet-container': { height: '100%', fontFamily: 'inherit' } }}>
      <MapContainer center={DHAKA_CENTER} zoom={12} scrollWheelZoom>
        <TileLayer url={TILE_URL} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        {onClick && <ClickHandler onClick={onClick} />}
        {fit && <FitTo points={fitPoints} />}
        {circles.map((c, i) => (
          <Circle key={i} center={c.center} radius={c.radius} pathOptions={{ color: c.color ?? '#0277bd', weight: 2, fillOpacity: 0.12 }} />
        ))}
        {line && line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#0f7a3f', weight: 3, dashArray: '6 6' }} />}
        {markers.map((m, i) => (
          <Marker
            key={i}
            position={m.position}
            icon={m.icon ?? PINS.pickup}
            draggable={m.draggable}
            eventHandlers={
              m.onDrag
                ? { dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); m.onDrag!(ll.lat, ll.lng); } }
                : undefined
            }
          />
        ))}
      </MapContainer>
    </Box>
  );
}

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export async function reverseGeocode(lat: number, lng: number, lang: string): Promise<string> {
  try {
    const r = await fetch(`${GEOCODER_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&accept-language=${lang}`);
    const data = (await r.json()) as { display_name?: string };
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/** Address search (on submit only — public Nominatim allows ~1 request per second, no autocomplete). */
export function PlaceSearch({
  label,
  value,
  onSelect,
  required,
}: {
  label: string;
  value?: Place | null;
  onSelect: (p: Place) => void;
  required?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [q, setQ] = useState(value?.address ?? '');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => setQ(value?.address ?? ''), [value?.address]);

  const search = async () => {
    if (q.trim().length < 3) return;
    setBusy(true);
    try {
      const r = await fetch(
        `${GEOCODER_URL}/search?format=json&countrycodes=bd&limit=5&accept-language=${i18n.language}&q=${encodeURIComponent(q.trim())}`,
      );
      setResults((await r.json()) as GeoResult[]);
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      onSelect({ latitude, longitude, address: await reverseGeocode(latitude, longitude, i18n.language) });
    });
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        label={label}
        value={q}
        required={required}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void search();
          }
        }}
        placeholder={t('book.searchPlace')}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={t('common.search')}>
                  <span>
                    <IconButton onClick={() => void search()} disabled={busy} aria-label={`${t('common.search')}: ${label}`} edge="end">
                      <SearchOutlined />
                    </IconButton>
                  </span>
                </Tooltip>
                {'geolocation' in navigator && (
                  <Tooltip title={t('book.useMyLocation')}>
                    <IconButton onClick={locate} aria-label={t('book.useMyLocation')} edge="end">
                      <MyLocationOutlined />
                    </IconButton>
                  </Tooltip>
                )}
              </InputAdornment>
            ),
          },
        }}
      />
      {results.length > 0 && (
        <Paper elevation={4} sx={{ position: 'absolute', zIndex: 1300, left: 0, right: 0, mt: 0.5, maxHeight: 280, overflow: 'auto' }}>
          <List dense role="listbox" aria-label={label}>
            {results.map((r) => (
              <ListItemButton
                key={`${r.lat},${r.lon}`}
                onClick={() => {
                  onSelect({ address: r.display_name, latitude: Number(r.lat), longitude: Number(r.lon) });
                  setResults([]);
                }}
              >
                <ListItemText primary={r.display_name} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}
