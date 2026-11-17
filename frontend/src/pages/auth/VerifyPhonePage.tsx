import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Link, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/api';
import { errorMessage } from '../../api/http';
import { AuthShell, BD_PHONE } from './AuthShell';

export function VerifyPhonePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [phone, setPhone] = useState(params.get('phone') ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string | undefined>(notice);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await authApi.verifyPhone(phone.trim(), code.trim());
      navigate('/login', { replace: true, state: { notice: t('auth.verified') } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await authApi.resendVerification(phone.trim());
      setInfo(t('auth.codeSent', { phone: phone.trim() }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.verifyTitle')}
      subtitle={phone ? t('auth.verifySub', { phone }) : undefined}
      footer={
        <Link component={RouterLink} to="/login">
          {t('auth.login')}
        </Link>
      }
    >
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {info && !error && <Alert severity="info">{info}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label={t('auth.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required size="medium" />
        <TextField
          label={t('auth.code')}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          autoComplete="one-time-code"
          inputMode="numeric"
          required
          autoFocus
          size="medium"
          slotProps={{ htmlInput: { maxLength: 8 } }}
        />
        <Button type="submit" variant="contained" size="large" disabled={busy || !BD_PHONE.test(phone.trim()) || code.length < 4}>
          {t('auth.verify')}
        </Button>
        <Button onClick={resend} disabled={busy || !BD_PHONE.test(phone.trim())}>
          {t('auth.resendCode')}
        </Button>
      </Stack>
    </AuthShell>
  );
}
