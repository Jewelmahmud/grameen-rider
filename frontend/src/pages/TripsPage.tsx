import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { backendApi } from '../api/backendApi';

interface TripRecord {
  id: string;
  pickupLocation?: string;
  destinationLocation?: string;
  status?: string;
  fare?: number;
  createdAt?: string;
}

export const TripsPage = () => {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTrips = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await backendApi.getTrips();
      setTrips(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'ট্রিপ লোড করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTrips();
  }, []);

  const onCreateTrip = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await backendApi.createTrip({
        pickupLocation,
        destinationLocation,
      });
      setSuccess('নতুন ট্রিপ সফলভাবে তৈরি হয়েছে।');
      setPickupLocation('');
      setDestinationLocation('');
      await loadTrips();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'ট্রিপ তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = async (tripId: string) => {
    setError('');
    setSuccess('');
    try {
      await backendApi.cancelTrip(tripId);
      setSuccess('ট্রিপ বাতিল করা হয়েছে।');
      await loadTrips();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'ট্রিপ বাতিল করা যায়নি');
    }
  };

  const summary = useMemo(() => {
    const pending = trips.filter((t) => (t.status || '').toLowerCase().includes('pend')).length;
    const active = trips.filter((t) => ['accepted', 'ongoing', 'in_progress'].includes((t.status || '').toLowerCase()))
      .length;
    const cancelled = trips.filter((t) => (t.status || '').toLowerCase().includes('cancel')).length;
    return { total: trips.length, pending, active, cancelled };
  }, [trips]);

  return (
    <div className="stack">
      <section className="card">
        <h3>ট্রিপ ড্যাশবোর্ড</h3>
        <div className="stats-grid">
          <div>
            <span className="muted">মোট ট্রিপ</span>
            <p>{summary.total}</p>
          </div>
          <div>
            <span className="muted">পেন্ডিং</span>
            <p>{summary.pending}</p>
          </div>
          <div>
            <span className="muted">চলমান</span>
            <p>{summary.active}</p>
          </div>
          <div>
            <span className="muted">বাতিল</span>
            <p>{summary.cancelled}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>নতুন ট্রিপ তৈরি করুন</h3>
        <form className="inline-form trips-create-form" onSubmit={onCreateTrip}>
          <input
            placeholder="পিকআপ লোকেশন"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            required
          />
          <input
            placeholder="গন্তব্য লোকেশন"
            value={destinationLocation}
            onChange={(e) => setDestinationLocation(e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'তৈরি হচ্ছে...' : 'ট্রিপ তৈরি করুন'}
          </button>
        </form>
      </section>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <section className="card">
        <div className="trips-head">
          <h3>আপনার ট্রিপসমূহ</h3>
          <button type="button" className="db-btn-ghost" onClick={() => void loadTrips()}>
            রিফ্রেশ
          </button>
        </div>

        {isLoading ? (
          <p className="muted">ট্রিপ লোড হচ্ছে...</p>
        ) : trips.length === 0 ? (
          <p className="muted">এখনও কোনো ট্রিপ নেই।</p>
        ) : (
          <div className="trips-list">
            {trips.map((trip) => (
              <article key={trip.id} className="trips-item">
                <div>
                  <p className="trips-route">
                    {trip.pickupLocation || '—'} → {trip.destinationLocation || '—'}
                  </p>
                  <p className="muted trips-meta">
                    স্ট্যাটাস: {trip.status || 'unknown'} | ভাড়া: {trip.fare ? `$${trip.fare}` : 'N/A'}
                  </p>
                </div>
                <div className="trips-actions">
                  <button type="button" className="db-btn-ghost" onClick={() => void onCancel(trip.id)}>
                    বাতিল
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
