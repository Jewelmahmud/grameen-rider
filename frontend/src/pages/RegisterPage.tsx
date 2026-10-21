import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [form, setForm] = useState({
    roleName: 'customer' as 'grameen_ride_driver' | 'customer',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      await register({
        ...form,
        email: form.email || undefined,
      });
      setMessage('রেজিস্ট্রেশন সফল হয়েছে। এখন লগইন করতে পারেন।');
      setTimeout(() => navigate('/login', { state: location.state }), 900);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h2>নতুন অ্যাকাউন্ট তৈরি করুন</h2>
        <p className="muted">অথ মাইক্রোসার্ভিসের মাধ্যমে রেজিস্ট্রেশন করুন</p>

        <label>
          ভূমিকা
          <select
            value={form.roleName}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                roleName: e.target.value as 'grameen_ride_driver' | 'customer',
              }))
            }
          >
            <option value="customer">customer</option>
            <option value="grameen_ride_driver">grameen_ride_driver</option>
          </select>
        </label>

        <label>
          ফোন
          <input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            required
          />
        </label>
        <label>
          নাম
          <input
            value={form.firstName}
            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </label>
        <label>
          পদবি
          <input
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </label>
        <label>
          ইমেইল (ঐচ্ছিক)
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </label>
        <label>
          পাসওয়ার্ড
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </label>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'রেজিস্টার'}
        </button>

        <p className="muted">
          আগে থেকেই অ্যাকাউন্ট আছে? <Link to="/login" state={location.state}>লগইন করুন</Link>
        </p>
      </form>
    </div>
  );
};
