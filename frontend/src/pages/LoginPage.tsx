import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const isEmail = identifier.includes('@');
      await login({
        email: isEmail ? identifier : undefined,
        phone: isEmail ? undefined : identifier,
        password,
        mfaCode: mfaCode || undefined,
      });
      const redirectTo =
        (location.state as { redirectTo?: string } | null)?.redirectTo || '/dashboard';
      navigate(redirectTo, { state: location.state });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'লগইন ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h2>আবার স্বাগতম</h2>
        <p className="muted">ফোন বা ইমেইল দিয়ে সাইন ইন করুন</p>

        <label>
          ফোন বা ইমেইল
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </label>

        <label>
          পাসওয়ার্ড
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label>
          MFA কোড (ঐচ্ছিক)
          <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />
        </label>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? 'সাইন ইন হচ্ছে...' : 'লগইন'}
        </button>

        <p className="muted">
          ডেভেলপমেন্ট এক্সেস: <Link to="/dashboard">ড্যাশবোর্ডে যান</Link>
        </p>

        <p className="muted">
          নতুন অ্যাকাউন্ট? <Link to="/register" state={location.state}>রেজিস্টার করুন</Link>
        </p>
      </form>
    </div>
  );
};
