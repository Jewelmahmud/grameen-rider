import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Checkbox, FormControlLabel, FormLabel, Link, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { authApi, type RegisterInput } from '../../api/api';
import { errorMessage } from '../../api/http';
import { AuthShell, BD_PHONE } from './AuthShell';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState<RegisterInput>({ roleName: params.get('role') === 'driver' ? 'grameen_ride_driver' : 'customer', phone: '', password: '', firstName: '', lastName: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const set = (k: keyof RegisterInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const phoneOk = BD_PHONE.test(form.phone.trim());
  const valid = phoneOk && form.password.length >= 8 && form.firstName.trim() && form.lastName.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await authApi.register({
        ...form,
        phone: form.phone.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email?.trim() || undefined,
      });
      navigate(`/verify-phone?phone=${encodeURIComponent(form.phone.trim())}`, { state: { notice: t('auth.registered') } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.registerTitle')}
      subtitle={t('auth.loginSub')}
      footer={
        <Typography color="text.secondary">
          {t('auth.haveAccount')}{' '}
          <Link component={RouterLink} to="/login">
            {t('auth.login')}
          </Link>
        </Typography>
      }
    >
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <div>
          <FormLabel id="role-label">{t('auth.iAm')}</FormLabel>
          <RadioGroup aria-labelledby="role-label" value={form.roleName} onChange={set('roleName')}>
            <FormControlLabel value="customer" control={<Radio />} label={t('auth.asCustomer')} />
            <FormControlLabel value="grameen_ride_driver" control={<Radio />} label={t('auth.asDriver')} />
          </RadioGroup>
        </div>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label={t('auth.firstName')} value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required size="medium" />
          <TextField label={t('auth.lastName')} value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required size="medium" />
        </Stack>
        <TextField
          label={t('auth.phone')}
          value={form.phone}
          onChange={set('phone')}
          autoComplete="tel"
          inputMode="tel"
          helperText={t('auth.phoneHelp')}
          error={Boolean(form.phone) && !phoneOk}
          required
          size="medium"
        />
        <TextField label={t('auth.email')} type="email" value={form.email} onChange={set('email')} autoComplete="email" size="medium" />
        <TextField
          label={t('auth.password')}
          type="password"
          value={form.password}
          onChange={set('password')}
          autoComplete="new-password"
          helperText={t('auth.passwordHelp')}
          error={Boolean(form.password) && form.password.length < 8}
          required
          size="medium"
        />
        <FormControlLabel
          control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
          label={
            <Typography variant="body2">
              {t('auth.agreePrefix')}{' '}
              <Link component={RouterLink} to="/terms" target="_blank">{t('auth.terms')}</Link>
              {' '}{t('auth.and')}{' '}
              <Link component={RouterLink} to="/privacy" target="_blank">{t('auth.privacy')}</Link>
              {t('auth.agreeSuffix')}
            </Typography>
          }
        />
        <Button type="submit" variant="contained" size="large" disabled={busy || !valid || !agreed}>
          {t('auth.register')}
        </Button>
      </Stack>
    </AuthShell>
  );
}
