import { useEffect, useMemo, useState } from 'react';
import { backendApi } from '../api/backendApi';
import { useAuth } from '../state/AuthContext';

type RentalUnit = 'any' | 'day' | 'hour';
type Transmission = 'any' | 'auto' | 'manual';
type VehicleType = 'Car' | 'Motorbike' | 'CNG' | 'Auto Riskaw' | 'Riskhaw' | 'Boat' | 'Speed boat';

interface FleetItem {
  id: string;
  vehicleType: VehicleType;
  name: string;
  spec: string;
  price: number;
  distLabel: string;
  rating: number;
  reviews: number;
  image: string;
  body: string;
  brand: string;
  transmission: 'auto' | 'manual';
  available: boolean;
}

const RENTAL_VEHICLE_TYPES: VehicleType[] = [
  'Car',
  'Motorbike',
  'CNG',
  'Auto Riskaw',
  'Riskhaw',
  'Boat',
  'Speed boat',
];

const VEHICLE_TYPE_BN_LABELS: Record<VehicleType, string> = {
  Car: 'কার',
  Motorbike: 'মোটরবাইক',
  CNG: 'সিএনজি',
  'Auto Riskaw': 'অটো রিকশা',
  Riskhaw: 'রিকশা',
  Boat: 'বোট',
  'Speed boat': 'স্পিড বোট',
};

const MOCK_FLEET: FleetItem[] = [
  { id: '1', vehicleType: 'Car', name: 'Audi A4', spec: '2.0 TFSI Sport', price: 24.59, distLabel: '120m (4 min)', rating: 4.7, reviews: 109, image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=240&fit=crop', body: 'sedan', brand: 'Audi', transmission: 'auto', available: true },
  { id: '2', vehicleType: 'Motorbike', name: 'Yamaha FZ', spec: '150cc street bike', price: 6.8, distLabel: '200m (6 min)', rating: 4.6, reviews: 84, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&h=240&fit=crop', body: 'sport', brand: 'Yamaha', transmission: 'manual', available: true },
  { id: '3', vehicleType: 'CNG', name: 'CNG Classic', spec: '3-seater city ride', price: 4.9, distLabel: '90m (3 min)', rating: 4.4, reviews: 56, image: 'https://images.unsplash.com/photo-1693716542403-0cec45ac5d3b?q=80&w=900&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', body: 'compact', brand: 'Bajaj', transmission: 'manual', available: true },
  { id: '4', vehicleType: 'Auto Riskaw', name: 'Auto Riskaw Pro', spec: '4-seater auto rickshaw', price: 5.4, distLabel: '350m (9 min)', rating: 4.5, reviews: 201, image: 'https://plus.unsplash.com/premium_photo-1682092829937-bb5b289be2c3?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', body: 'auto', brand: 'TVS', transmission: 'manual', available: true },
  { id: '5', vehicleType: 'Riskhaw', name: 'City Riskhaw', spec: 'Pedal rickshaw short trips', price: 3.5, distLabel: '410m (11 min)', rating: 4.2, reviews: 72, image: 'https://images.unsplash.com/photo-1614347338743-9580fedc06e1?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', body: 'cycle', brand: 'Local', transmission: 'manual', available: true },
  { id: '6', vehicleType: 'Boat', name: 'River Boat', spec: 'Covered local ferry boat', price: 11.5, distLabel: '800m (14 min)', rating: 4.6, reviews: 44, image: 'https://images.unsplash.com/photo-1618843808465-befb4ad4a183?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', body: 'water', brand: 'Marine', transmission: 'auto', available: true },
  { id: '7', vehicleType: 'Speed boat', name: 'Speed boat X', spec: 'Fast water taxi', price: 18.9, distLabel: '1.2km (18 min)', rating: 4.8, reviews: 38, image: 'https://images.unsplash.com/photo-1761624217287-fb6eea9f8177?q=80&w=2076&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', body: 'water', brand: 'Marine', transmission: 'auto', available: true },
];

const BODY_TYPES = ['Sedan', 'Wagon', 'Coupe', 'Hatchback', 'Pickup', 'Sport coupe', 'Crossover', 'Van'] as const;

export const DashboardPage = () => {
  const { selectedRole, user } = useAuth();
  const [health, setHealth] = useState<{ status?: string } | null>(null);
  const [devResult, setDevResult] = useState<unknown>(null);
  const [favourites, setFavourites] = useState<Set<string>>(() => new Set());

  const [rentalUnit, setRentalUnit] = useState<RentalUnit>('hour');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [priceFrom, setPriceFrom] = useState(0);
  const [priceTo, setPriceTo] = useState(100);
  const [transmission, setTransmission] = useState<Transmission>('any');
  const [bodySelected, setBodySelected] = useState<Set<string>>(() => new Set());
  const [vehicleTypeSelected, setVehicleTypeSelected] = useState<Set<VehicleType>>(() => new Set());

  useEffect(() => {
    void backendApi.health().then(setHealth).catch(() => setHealth({ status: '—' }));
  }, []);

  const filtered = useMemo(() => {
    return MOCK_FLEET.filter((v) => {
      if (onlyAvailable && !v.available) {
        return false;
      }
      if (v.price < priceFrom || v.price > priceTo) {
        return false;
      }
      if (vehicleTypeSelected.size > 0 && !vehicleTypeSelected.has(v.vehicleType)) {
        return false;
      }
      if (transmission === 'auto' && v.transmission !== 'auto') {
        return false;
      }
      if (transmission === 'manual' && v.transmission !== 'manual') {
        return false;
      }
      if (bodySelected.size > 0) {
        const bodyOk = [...bodySelected].some((b) => b.toLowerCase() === v.body.toLowerCase());
        if (!bodyOk) {
          return false;
        }
      }
      return true;
    });
  }, [onlyAvailable, priceFrom, priceTo, vehicleTypeSelected, transmission, bodySelected]);

  const toggleBody = (b: string) => {
    setBodySelected((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  };

  const resetFilters = () => {
    setRentalUnit('hour');
    setOnlyAvailable(true);
    setPriceFrom(0);
    setPriceTo(100);
    setVehicleTypeSelected(new Set());
    setTransmission('any');
    setBodySelected(new Set());
  };

  return (
    <div className="db-page">
      <div className="db-columns">
        <aside className="db-filters" aria-label="Filter vehicles">
          <div className="db-filters__head">
            <h2 className="db-filters__title">ফিল্টার</h2>
            <button type="button" className="db-link-btn" onClick={resetFilters}>
              সব রিসেট
            </button>
          </div>

          <div className="db-field">
            <span className="db-field__label">ভাড়ার ধরন</span>
            <div className="db-toggle-group">
              {(
                [
                  { id: 'any' as const, label: 'যেকোনো' },
                  { id: 'day' as const, label: 'প্রতি দিন' },
                  { id: 'hour' as const, label: 'প্রতি ঘন্টা' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`db-toggle ${rentalUnit === o.id ? 'db-toggle--on' : ''}`}
                  onClick={() => setRentalUnit(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="db-field">
            <span className="db-field__label">যানবাহনের ধরন</span>
            <div className="db-check-grid">
              {RENTAL_VEHICLE_TYPES.map((type) => (
                <label key={type} className="db-check">
                  <input
                    type="checkbox"
                    checked={vehicleTypeSelected.has(type)}
                    onChange={() =>
                      setVehicleTypeSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(type)) next.delete(type);
                        else next.add(type);
                        return next;
                      })
                    }
                  />
                  <span>{VEHICLE_TYPE_BN_LABELS[type]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="db-field db-field--row">
            <span className="db-field__label">অবস্থা</span>
            <label className="db-switch">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
              />
              <span>এখন পাওয়া যায় এমনগুলো</span>
            </label>
          </div>

          <div className="db-field">
            <span className="db-field__label">ভাড়া (প্রতি ঘন্টা)</span>
            <div className="db-price-inputs">
              <label>
                <span className="db-sr">From</span>
                <input
                  type="number"
                  min={0}
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(Number(e.target.value))}
                />
              </label>
              <span className="db-price-sep">—</span>
              <label>
                <span className="db-sr">To</span>
                <input
                  type="number"
                  min={0}
                  value={priceTo}
                  onChange={(e) => setPriceTo(Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          <details className="db-details">
            <summary>ব্র্যান্ড</summary>
            <p className="db-details__hint">পরবর্তী আপডেটে ব্র্যান্ডভিত্তিক ফিল্টার যোগ হবে।</p>
          </details>

          <div className="db-field">
            <span className="db-field__label">বডির ধরন</span>
            <div className="db-check-grid">
              {BODY_TYPES.map((b) => (
                <label key={b} className="db-check">
                  <input
                    type="checkbox"
                    checked={bodySelected.has(b)}
                    onChange={() => toggleBody(b)}
                  />
                  <span>{b}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="db-field">
            <span className="db-field__label">ট্রান্সমিশন</span>
            <div className="db-toggle-group">
              {(
                [
                  { id: 'any' as const, label: 'যেকোনো' },
                  { id: 'auto' as const, label: 'অটোমেটিক' },
                  { id: 'manual' as const, label: 'ম্যানুয়াল' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`db-toggle ${transmission === o.id ? 'db-toggle--on' : ''}`}
                  onClick={() => setTransmission(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="db-grid-wrap">
          <h2 className="db-grid-title">ভাড়ার জন্য {filtered.length}টি যানবাহন</h2>
          <div className="db-vehicle-grid">
            {filtered.map((v) => (
              <article key={v.id} className="db-vehicle-card">
                <div className="db-vehicle-card__top">
                  <span className="db-vehicle-card__meta">{v.distLabel}</span>
                  <span className="db-vehicle-card__rating">
                    <span className="db-vehicle-card__star" aria-hidden>
                      ★
                    </span>
                    {v.rating} ({v.reviews})
                  </span>
                  <button
                    type="button"
                    className={`db-vehicle-card__fav ${favourites.has(v.id) ? 'db-vehicle-card__fav--on' : ''}`}
                    onClick={() =>
                      setFavourites((prev) => {
                        const n = new Set(prev);
                        if (n.has(v.id)) n.delete(v.id);
                        else n.add(v.id);
                        return n;
                      })
                    }
                    aria-label="ফেভারিট"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>
                <div className="db-vehicle-card__image-wrap">
                  <img src={v.image} alt="" className="db-vehicle-card__image" loading="lazy" />
                </div>
                <div className="db-vehicle-card__foot">
                  <div>
                    <p className="db-vehicle-card__type">{v.vehicleType}</p>
                    <p className="db-vehicle-card__name">{v.name}</p>
                    <p className="db-vehicle-card__spec">{v.spec}</p>
                  </div>
                  <p className="db-vehicle-card__price">
                    ${v.price.toFixed(2)} <span className="db-vehicle-card__unit">/ ঘন্টা</span>
                  </p>
                </div>
              </article>
            ))}
          </div>

          {import.meta.env.DEV && (
            <div className="db-dev">
              <p className="db-dev__line">
                <strong>ডেভ</strong> · রোল: {selectedRole || '—'} · {user?.firstName || 'গেস্ট'} · API:{' '}
                {health?.status ?? '…'}
              </p>
              <div className="db-dev__actions">
                <button
                  type="button"
                  className="db-btn-ghost"
                  onClick={async () => {
                    const data = await backendApi.getTrips();
                    setDevResult(data);
                  }}
                >
                  ট্রিপ আনুন
                </button>
                <button
                  type="button"
                  className="db-btn-ghost"
                  onClick={async () => {
                    const data = await backendApi.getNotifications();
                    setDevResult(data);
                  }}
                >
                  নোটিফিকেশন আনুন
                </button>
              </div>
              {devResult != null && (
                <pre className="db-dev__pre">{JSON.stringify(devResult, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
