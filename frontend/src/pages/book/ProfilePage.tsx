import { Card, CardContent, CardHeader, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthProvider';
import { EmployeeBadge } from '../../components/common';
import { vehicleLabel } from '../../i18n';
import { fullName, money } from '../../lib/format';
import { usePublicConfig } from '../../api/hooks';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { me } = useAuth();
  const config = usePublicConfig();
  if (!me) return null;
  const s = me.sparks;
  const usedPct = s.monthlyCapBdt ? Math.min(100, (s.usedThisMonthBdt / s.monthlyCapBdt) * 100) : 0;
  const supportPhone = config.data?.['support.phone'] as string | undefined;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="h1">{s.greetingName ?? fullName(me)}</Typography>
            <Stack direction="row" spacing={1} sx={{ my: 1.5, flexWrap: 'wrap' }}>
              {me.platformRoles.map((r) => <Chip key={r} size="small" label={t(`roles.${r}`)} />)}
              {s.isEmployee && <EmployeeBadge designation={s.designation} />}
            </Stack>
            <Typography color="text.secondary">{me.phoneNumber}</Typography>
            {me.email && <Typography color="text.secondary">{me.email}</Typography>}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Your name, phone and password are managed by your GiLab account.
              {supportPhone && ` ${t('nav.support')}: ${supportPhone}`}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      {s.isEmployee && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              avatar={<AutoAwesomeOutlined color="primary" aria-hidden />}
              title={t('sparks.title')}
              slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={1.5}>
                {s.discountPct > 0 && (
                  <>
                    <Typography>{t('sparks.discount', { pct: s.discountPct })}</Typography>
                    <LinearProgress variant="determinate" value={usedPct} aria-label={`${money(s.usedThisMonthBdt)} / ${money(s.monthlyCapBdt)}`} />
                    <Typography variant="body2" color="text.secondary">
                      {money(s.usedThisMonthBdt)} / {money(s.monthlyCapBdt)} · {t('sparks.remaining', { amount: money(s.remainingThisMonthBdt) })}
                    </Typography>
                    {s.vehicleTypes.length > 0 && (
                      <Typography variant="body2" color="text.secondary">{s.vehicleTypes.map((v) => vehicleLabel(t, v)).join(', ')}</Typography>
                    )}
                  </>
                )}
                {s.priorityDispatch && <Chip color="primary" variant="outlined" label={t('sparks.priority')} sx={{ alignSelf: 'flex-start' }} />}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}
