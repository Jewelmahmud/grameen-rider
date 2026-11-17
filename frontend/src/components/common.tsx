import { createContext, useCallback, useContext, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useColorScheme,
  type ChipProps,
} from '@mui/material';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlined from '@mui/icons-material/SettingsBrightnessOutlined';
import TranslateOutlined from '@mui/icons-material/TranslateOutlined';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TripStatus } from '../api/types';
import { errorMessage } from '../api/http';
import { meApi } from '../api/api';
import { setLanguage } from '../i18n';
import { useAuth } from '../auth/AuthProvider';

// ─── Page header ────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  crumbs,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: { label: string; to?: string }[];
  action?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-end' } }}
    >
      <Box sx={{ minWidth: 0 }}>
        {crumbs && crumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 0.5, fontSize: 13 }}>
            {crumbs.map((c) =>
              c.to ? (
                <Link key={c.label} component={RouterLink} to={c.to} underline="hover" color="inherit">
                  {c.label}
                </Link>
              ) : (
                <Typography key={c.label} color="text.secondary" sx={{ fontSize: 13 }}>
                  {c.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>{action}</Stack>}
    </Stack>
  );
}

// ─── Status chip: one fixed colour per status, always with a text label ───────

const STATUS_COLOR: Record<TripStatus, ChipProps['color']> = {
  pending: 'default',
  scheduled: 'info',
  searching_driver: 'warning',
  accepted: 'primary',
  driver_assigned: 'primary',
  driver_arriving: 'primary',
  driver_arrived: 'primary',
  in_progress: 'secondary',
  completed: 'success',
  cancelled: 'default',
  no_driver_found: 'error',
  disputed: 'error',
};

export function StatusChip({ status, size = 'small' }: { status: TripStatus; size?: ChipProps['size'] }) {
  const { t } = useTranslation();
  return (
    <Chip
      size={size}
      color={STATUS_COLOR[status] ?? 'default'}
      variant={status === 'cancelled' ? 'outlined' : 'filled'}
      label={t(`status.${status}`, { defaultValue: status })}
    />
  );
}

export const ACTIVE_STATUSES: TripStatus[] = [
  'pending', 'searching_driver', 'accepted', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress',
];

// ─── Feedback ───────────────────────────────────────────────────────────────

export function ErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <Alert
      severity="error"
      sx={{ mb: 2 }}
      action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>{t('common.retry')}</Button> : undefined}
    >
      {errorMessage(error)}
    </Alert>
  );
}

export function EmptyState({ title, action }: { title?: ReactNode; action?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} sx={{ py: 6, alignItems: 'center', color: 'text.secondary', textAlign: 'center' }}>
      <InboxOutlined fontSize="large" aria-hidden />
      <Typography>{title ?? t('common.empty')}</Typography>
      {action}
    </Stack>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={56} />
      ))}
    </Stack>
  );
}

type Notify = (message: string, severity?: 'success' | 'error' | 'info' | 'warning') => void;
const NotifyContext = createContext<Notify>(() => undefined);

export function NotifyProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<{ message: string; severity: 'success' | 'error' | 'info' | 'warning'; key: number }>();
  const notify = useCallback<Notify>((message, severity = 'success') => setState({ message, severity, key: Date.now() }), []);
  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={state?.key}
        open={Boolean(state)}
        autoHideDuration={4000}
        onClose={(_, reason) => reason !== 'clickaway' && setState(undefined)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={state?.severity} variant="filled" onClose={() => setState(undefined)} sx={{ width: '100%' }}>
          {state?.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
}

export const useNotify = () => useContext(NotifyContext);

// ─── Confirm dialog (destructive actions name the target and ask for a reason) ──

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  requireReason,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireReason?: boolean;
  busy?: boolean;
  error?: unknown;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const close = () => {
    setReason('');
    onClose();
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : close} aria-labelledby="confirm-title">
      <DialogTitle id="confirm-title">{title}</DialogTitle>
      <DialogContent>
        {body && <DialogContentText sx={{ mb: requireReason ? 2 : 0 }}>{body}</DialogContentText>}
        <ErrorAlert error={error} />
        {requireReason && (
          <TextField
            autoFocus
            label={t('common.reason')}
            helperText={t('common.reasonHelp')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
            required
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          disabled={busy || (requireReason && !reason.trim())}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
          {icon && <Box sx={{ color: 'primary.main' }} aria-hidden>{icon}</Box>}
        </Stack>
        <Typography variant="h5" component="p" sx={{ mt: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ─── App bar controls ───────────────────────────────────────────────────────

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const { status } = useAuth();
  const next = i18n.language === 'bn' ? 'en' : 'bn';
  return (
    <Tooltip title={t('common.language')}>
      <Button
        color="inherit"
        startIcon={<TranslateOutlined />}
        onClick={() => {
          setLanguage(next);
          if (status === 'authenticated') void meApi.setLanguage(next).catch(() => undefined);
        }}
        aria-label={`${t('common.language')}: ${next === 'en' ? 'English' : 'বাংলা'}`}
      >
        {next === 'en' ? 'EN' : 'বাং'}
      </Button>
    </Tooltip>
  );
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const icon = mode === 'dark' ? <DarkModeOutlined /> : mode === 'light' ? <LightModeOutlined /> : <SettingsBrightnessOutlined />;
  return (
    <>
      <Tooltip title={t('common.theme')}>
        <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)} aria-label={t('common.theme')}>
          {icon}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {(['light', 'dark', 'system'] as const).map((m) => (
          <MenuItem
            key={m}
            selected={mode === m}
            onClick={() => {
              setMode(m);
              setAnchor(null);
            }}
          >
            {t(`common.${m}`)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** "GiLab কর্মী · Administrative Assistant" */
export function EmployeeBadge({ designation, size = 'small' }: { designation?: string | null; size?: ChipProps['size'] }) {
  const { t } = useTranslation();
  return (
    <Chip
      size={size}
      color="primary"
      variant="outlined"
      label={designation ? `${t('sparks.badge')} · ${designation}` : t('sparks.badge')}
    />
  );
}
