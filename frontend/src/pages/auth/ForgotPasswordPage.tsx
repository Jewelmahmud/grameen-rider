import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/api';
import { errorMessage } from '../../api/http';
import { homeFor, useAuth } from '../../auth/AuthProvider';
import { useSiteCopy } from '../../content/site';
import { AuthShell, BD_PHONE } from './AuthShell';

/** Optional link to GiLab's own account page (password change), when GiLab provides one. */
const GILAB_ACCOUNT_URL = import.meta.env.VITE_GILAB_ACCOUNT_URL?.trim();

/**
 * GiLab has no password-reset endpoint for apps, so a forgotten password is recovered by logging in with a
 * one-time code; the password itself is changed in the GiLab account.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const c = useSiteCopy().forgot;
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (!sent) {
        await authApi.sendOtp(phone.trim());
        setSent(true);
      } else {
        const me = await login({ phone: phone.trim(), mfaCode: code.trim() });
        navigate(homeFor(me), { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={c.title}
      subtitle={c.body}
      footer={
        <Link component={RouterLink} to="/login">
          {c.back}
        </Link>
      }
    >
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        {sent && !error && <Alert severity="success">{t('auth.codeSent', { phone })}</Alert>}
        <TextField
          label={t('auth.phone')}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setSent(false);
          }}
          inputMode="tel"
          autoComplete="tel"
          helperText={t('auth.phoneHelp')}
          required
          autoFocus
          size="medium"
        />
        {sent && (
          <TextField
            label={t('auth.code')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            size="medium"
            slotProps={{ htmlInput: { maxLength: 8 } }}
          />
        )}
        <Button type="submit" variant="contained" size="large" disabled={busy || !BD_PHONE.test(phone.trim()) || (sent && code.length < 4)}>
          {sent ? t('auth.login') : t('auth.sendCode')}
        </Button>
        <Typography variant="body2" color="text.secondary">{c.note}</Typography>
        {GILAB_ACCOUNT_URL && (
          <Link href={GILAB_ACCOUNT_URL} target="_blank" rel="noopener">
            {c.manage}
          </Link>
        )}
      </Stack>
    </AuthShell>
  );
}
