import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Link, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/api';
import { errorCode, errorMessage } from '../../api/http';
import { homeFor, useAuth } from '../../auth/AuthProvider';
import { AuthShell, BD_PHONE } from './AuthShell';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, sessionEnded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { from, notice } = (location.state as { from?: string; notice?: string } | null) ?? {};

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const isEmail = id.includes('@');
  const phoneValid = BD_PHONE.test(id.trim());

  const explain = (e: unknown) => {
    const code = errorCode(e);
    if (code === 'VERIFICATION_REQUIRED' && !isEmail) {
      navigate(`/verify-phone?phone=${encodeURIComponent(id.trim())}`, { state: { notice: t('auth.needsVerification') } });
      return;
    }
    if (code === 'AUTH_SERVICE_UNAVAILABLE') return setError(t('auth.serviceDown'));
    if (code === 'ACCOUNT_BLOCKED') return setError(t('auth.blocked'));
    if (code === 'AUTH_RATE_LIMIT_EXCEEDED') return setError(t('auth.rateLimited'));
    setError(errorMessage(e));
  };

  const sendOtp = async () => {
    setError(undefined);
    setBusy(true);
    try {
      await authApi.sendOtp(id.trim());
      setOtpSentTo(id.trim());
    } catch (e) {
      explain(e);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'otp' && !otpSentTo) return void sendOtp();
    setError(undefined);
    setBusy(true);
    try {
      const me = await login(
        mode === 'password'
          ? { ...(isEmail ? { email: id.trim() } : { phone: id.trim() }), password }
          : { phone: id.trim(), mfaCode: code.trim() },
      );
      navigate(from && from !== '/login' ? from : homeFor(me), { replace: true });
    } catch (err) {
      explain(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSub')}
      footer={
        <Typography color="text.secondary">
          {t('auth.noAccount')}{' '}
          <Link component={RouterLink} to="/register">
            {t('auth.register')}
          </Link>
        </Typography>
      }
    >
      {notice && !error && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}
      {sessionEnded && !error && !notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('auth.sessionEnded')}
        </Alert>
      )}
      <Tabs
        value={mode}
        onChange={(_, v) => {
          setMode(v);
          setError(undefined);
          setOtpSentTo(undefined);
        }}
        variant="fullWidth"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="password" label={t('auth.password')} />
        <Tab value="otp" label={t('auth.otp')} />
      </Tabs>
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label={mode === 'password' ? `${t('auth.phone')} / Email` : t('auth.phone')}
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setOtpSentTo(undefined);
          }}
          autoComplete="username"
          inputMode={mode === 'otp' ? 'tel' : undefined}
          helperText={t('auth.phoneHelp')}
          required
          autoFocus
          size="medium"
        />
        {mode === 'password' ? (
          <TextField
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            size="medium"
          />
        ) : (
          otpSentTo && (
            <>
              <Alert severity="success">{t('auth.codeSent', { phone: otpSentTo })}</Alert>
              <TextField
                label={t('auth.code')}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                size="medium"
                slotProps={{ htmlInput: { maxLength: 8 } }}
              />
              <Button onClick={sendOtp} disabled={busy} sx={{ alignSelf: 'flex-start' }}>
                {t('auth.resendCode')}
              </Button>
            </>
          )
        )}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={
            busy ||
            !id.trim() ||
            (mode === 'password' ? !password : !phoneValid || (Boolean(otpSentTo) && code.length < 4))
          }
        >
          {mode === 'otp' && !otpSentTo ? t('auth.sendCode') : t('auth.login')}
        </Button>
      </Stack>
    </AuthShell>
  );
}
