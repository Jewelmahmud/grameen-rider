import { useState } from 'react';
import type { FormEvent } from 'react';
import { backendApi } from '../api/backendApi';

export const ApiPlaygroundPage = () => {
  const [tripId, setTripId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [response, setResponse] = useState<unknown>();
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      const data = await fn();
      setResponse(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'রিকুয়েস্ট ব্যর্থ হয়েছে');
    }
  };

  const onTripLookup = (e: FormEvent) => {
    e.preventDefault();
    if (!tripId) return;
    void run(() => backendApi.getTripById(tripId));
  };

  const onPaymentLookup = (e: FormEvent) => {
    e.preventDefault();
    if (!paymentId) return;
    void run(() => backendApi.getPaymentById(paymentId));
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>ট্রিপ API</h3>
        <form className="inline-form" onSubmit={onTripLookup}>
          <input
            placeholder="ট্রিপ আইডি"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
          />
          <button className="btn" type="submit">
            ট্রিপ দেখুন
          </button>
        </form>
      </section>

      <section className="card">
        <h3>পেমেন্ট API</h3>
        <form className="inline-form" onSubmit={onPaymentLookup}>
          <input
            placeholder="পেমেন্ট আইডি"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
          />
          <button className="btn" type="submit">
            পেমেন্ট দেখুন
          </button>
        </form>
      </section>

      {error && <div className="error">{error}</div>}

      {!!response && (
        <section className="card">
          <h3>রেসপন্স</h3>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </section>
      )}
    </div>
  );
};
