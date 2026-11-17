import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '../../api/api';
import type { SettingView } from '../../api/types';
import { CardSkeleton, ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { dateTime } from '../../lib/format';

type Group = 'matching' | 'perks' | 'general';

const GROUPS: Record<Group, { title: string; subtitle: string; match: (key: string) => boolean }> = {
  matching: {
    title: 'nav.matching',
    subtitle:
      'How trips are offered to drivers: one driver at a time, ranked by closeness, fewer trips today and idle time. Weights should add up to 1.',
    match: (k) => k.startsWith('matching.'),
  },
  perks: {
    title: 'nav.sparks',
    subtitle:
      'What GiLab employees get: a platform-funded discount with a monthly cap, their designation shown, a badge for the driver and priority matching.',
    match: (k) => k.startsWith('perks.') || k === 'matching.employeePriority',
  },
  general: {
    title: 'nav.settings',
    subtitle: 'Services, booking windows, payments, commission, night pricing and support contacts.',
    match: (k) => !k.startsWith('matching.') && !k.startsWith('perks.'),
  },
};

const SECTION_TITLES: Record<string, string> = {
  'service.ride': 'Rides',
  'service.rental': 'Rentals',
  support: 'Support contact',
  payments: 'Payments',
  commission: 'Commission',
  maintenance: 'Maintenance',
  pricing: 'Pricing',
  'pricing.night': 'Night pricing',
  'matching.weights': 'Ranking weights',
  'matching.ride': 'Rides',
  'matching.rental': 'Rentals',
  matching: 'Search, ratings and pauses',
  'perks.employee': 'GiLab employees',
};

/** "matching.weights.fairness" → "matching.weights"; falls back to the first segment. */
const sectionOf = (key: string) => {
  const parts = key.split('.');
  const two = parts.slice(0, 2).join('.');
  return parts.length > 2 ? two : parts[0];
};

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function SettingsPage({ group }: { group: Group }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const notify = useNotify();
  const settings = useQuery({ queryKey: ['settings'], queryFn: settingsApi.list });
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const conf = GROUPS[group];

  const rows = useMemo(() => (settings.data ?? []).filter((s) => conf.match(s.key)), [settings.data, conf]);
  const sections = useMemo(() => {
    const m = new Map<string, SettingView[]>();
    for (const s of rows) {
      const sec = sectionOf(s.key);
      m.set(sec, [...(m.get(sec) ?? []), s]);
    }
    return [...m.entries()];
  }, [rows]);

  const changed = Object.entries(draft).filter(([k, v]) => {
    const s = rows.find((r) => r.key === k);
    return s && !sameValue(s.value, v);
  });

  const save = useMutation({
    mutationFn: () => settingsApi.update(Object.fromEntries(changed)),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data);
      void qc.invalidateQueries({ queryKey: ['public-config'] });
      setDraft({});
      notify(t('common.saved'));
    },
  });

  const weights = group === 'matching' ? ['proximity', 'fairness', 'idle'].map((w) => `matching.weights.${w}`) : [];
  const weightSum = weights.reduce((sum, k) => {
    const s = rows.find((r) => r.key === k);
    return s ? sum + Number(k in draft ? draft[k] : s.value) : sum;
  }, 0);
  const weightsPresent = weights.some((k) => rows.some((r) => r.key === k));

  return (
    <>
      <PageHeader
        title={t(conf.title)}
        subtitle={conf.subtitle}
        action={
          <>
            {changed.length > 0 && (
              <Button onClick={() => setDraft({})} disabled={save.isPending}>
                {t('common.cancel')}
              </Button>
            )}
            <Button variant="contained" onClick={() => save.mutate()} disabled={!changed.length || save.isPending}>
              {t('common.save')}
              {changed.length > 0 && ` (${changed.length})`}
            </Button>
          </>
        }
      />
      <ErrorAlert error={settings.error ?? save.error} onRetry={settings.error ? () => settings.refetch() : undefined} />
      {weightsPresent && Math.abs(weightSum - 1) > 0.001 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Ranking weights add up to {weightSum.toFixed(2)}. They are used as given, but 1.00 keeps scores easy to read.
        </Alert>
      )}
      {settings.isLoading && <CardSkeleton rows={6} />}
      <Stack spacing={2}>
        {sections.map(([section, items]) => (
          <Card key={section}>
            <CardHeader title={SECTION_TITLES[section] ?? section} slotProps={{ title: { variant: 'subtitle1', component: 'h2', fontWeight: 600 } }} sx={{ pb: 0 }} />
            <CardContent>
              <Stack divider={<Divider flexItem />} spacing={2}>
                {items.map((s) => (
                  <SettingRow
                    key={s.key}
                    setting={s}
                    value={s.key in draft ? draft[s.key] : s.value}
                    dirty={s.key in draft && !sameValue(draft[s.key], s.value)}
                    onChange={(v) => setDraft((d) => ({ ...d, [s.key]: v }))}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </>
  );
}

function SettingRow({ setting: s, value, dirty, onChange }: { setting: SettingView; value: unknown; dirty: boolean; onChange: (v: unknown) => void }) {
  const { t } = useTranslation();
  const id = `setting-${s.key.replace(/\./g, '-')}`;
  const isDefault = sameValue(value, s.default);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component="label" htmlFor={id} sx={{ fontWeight: 500 }}>
            {s.description}
          </Typography>
          {dirty && <Chip size="small" color="warning" label={t('common.unsaved')} />}
          {!s.editable && (
            <Tooltip title={t('common.notAllowed')}>
              <LockOutlined fontSize="small" color="disabled" aria-label={t('common.notAllowed')} />
            </Tooltip>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
          {s.key}
          {' · '}
          {t('common.default')}: {formatValue(s.default)}
          {s.updatedAt && ` · ${t('common.changedAt')} ${dateTime(s.updatedAt)}`}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: { xs: '100%', md: 360 }, flexShrink: 0 }}>
        <Box sx={{ flex: 1 }}>
          <Editor id={id} setting={s} value={value} onChange={onChange} />
        </Box>
        <Tooltip title={t('common.reset')}>
          <span>
            <IconButton size="small" disabled={!s.editable || isDefault} onClick={() => onChange(s.default)} aria-label={`${t('common.reset')}: ${s.description}`}>
              <RestartAltOutlined fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

const formatValue = (v: unknown) => (Array.isArray(v) ? v.join(', ') || '—' : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));

function Editor({ id, setting: s, value, onChange }: { id: string; setting: SettingView; value: unknown; onChange: (v: unknown) => void }) {
  const [jsonText, setJsonText] = useState<string>();
  const disabled = !s.editable;

  if (s.type === 'boolean') {
    return <Switch id={id} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />;
  }
  if (s.type === 'number') {
    return (
      <TextField
        id={id}
        type="number"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        disabled={disabled}
        slotProps={{ htmlInput: { step: 'any', inputMode: 'decimal' } }}
      />
    );
  }
  if (s.type === 'json' && Array.isArray(s.default) && (s.default as unknown[]).every((x) => typeof x === 'string' || typeof x === 'number')) {
    const numeric = (s.default as unknown[]).some((x) => typeof x === 'number');
    return (
      <Autocomplete
        id={id}
        multiple
        freeSolo
        options={(s.default as unknown[]).map(String)}
        value={((value as unknown[]) ?? []).map(String)}
        onChange={(_, v) => onChange(numeric ? v.map(Number).filter((n) => !Number.isNaN(n)) : v.map((x) => x.trim()).filter(Boolean))}
        disabled={disabled}
        renderValue={(vals, getItemProps) => vals.map((v, i) => <Chip size="small" label={v} {...getItemProps({ index: i })} key={v} />)}
        renderInput={(params) => <TextField {...params} placeholder="Type and press Enter" />}
      />
    );
  }
  if (s.type === 'json') {
    const text = jsonText ?? JSON.stringify(value, null, 2);
    let invalid = false;
    try {
      JSON.parse(text);
    } catch {
      invalid = true;
    }
    return (
      <TextField
        id={id}
        multiline
        minRows={2}
        value={text}
        error={invalid}
        helperText={invalid ? 'Not valid JSON' : undefined}
        onChange={(e) => {
          setJsonText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            /* keep editing */
          }
        }}
        disabled={disabled}
        sx={{ fontFamily: 'monospace' }}
      />
    );
  }
  return <TextField id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
}
