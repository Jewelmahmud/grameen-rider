import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingApi, customerApi } from '../../api/api';
import type { SupportTicket } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { CardSkeleton, EmptyState, ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { dateTime } from '../../lib/format';

const CATEGORIES = ['trip_issue', 'payment_issue', 'driver_complaint', 'technical_issue', 'account_issue', 'other'] as const;
const STATUS_COLOR = { open: 'info', in_progress: 'warning', resolved: 'success', closed: 'default' } as const;

/** Customer support: open a request (optionally about a trip) and follow the conversation. */
export default function CustomerHelpPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const tickets = useQuery({ queryKey: ['my-tickets'], queryFn: customerApi.tickets });
  const [creating, setCreating] = useState(Boolean(params.get('trip')));
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  return (
    <>
      <PageHeader
        title={t('support.title')}
        subtitle={t('support.sub')}
        action={
          <>
            <Button component={RouterLink} to="/help">{t('support.faq')}</Button>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setCreating(true)}>{t('support.new')}</Button>
          </>
        }
      />
      <ErrorAlert error={tickets.error} onRetry={() => tickets.refetch()} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: selected ? 5 : 12 }}>
          {tickets.isLoading && <CardSkeleton />}
          {!tickets.isLoading && (tickets.data ?? []).length === 0 && <EmptyState title={t('support.empty')} />}
          <Stack spacing={1}>
            {(tickets.data ?? []).map((tk) => (
              <Card key={tk.id} sx={{ borderColor: selected?.id === tk.id ? 'primary.main' : undefined }}>
                <CardActionArea onClick={() => setSelected(tk)}>
                  <CardContent>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }} noWrap>{tk.subject}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t(`support.categories.${tk.category}`, { defaultValue: tk.category })} · {dateTime(tk.createdAt)}
                        </Typography>
                      </Box>
                      <Chip size="small" color={STATUS_COLOR[tk.status]} label={t(`support.status.${tk.status}`)} />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        </Grid>
        {selected && (
          <Grid size={{ xs: 12, md: 7 }}>
            <Conversation ticket={selected} />
          </Grid>
        )}
      </Grid>
      <NewTicketDialog
        open={creating}
        tripId={params.get('trip') ?? undefined}
        onClose={() => {
          setCreating(false);
          if (params.get('trip')) setParams({}, { replace: true });
        }}
        onCreated={(tk) => {
          void qc.invalidateQueries({ queryKey: ['my-tickets'] });
          setSelected(tk);
          notify(t('support.sent'));
        }}
      />
    </>
  );
}

function Conversation({ ticket }: { ticket: SupportTicket }) {
  const { t } = useTranslation();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const messages = useQuery({ queryKey: ['ticket-messages', ticket.id], queryFn: () => customerApi.messages(ticket.id), refetchInterval: 30_000 });
  const send = useMutation({
    mutationFn: () => customerApi.addMessage(ticket.id, text.trim()),
    onSuccess: () => {
      setText('');
      void qc.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] });
    },
  });
  const closed = ticket.status === 'closed';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h2">{ticket.subject}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{dateTime(ticket.createdAt)}</Typography>
        <Stack spacing={1.5}>
          <Bubble mine author={t('support.you')} text={ticket.description} />
          {(messages.data ?? []).map((m) => (
            <Bubble key={m.id} mine={m.senderAuthUserId === me?.authUserId} author={m.senderAuthUserId === me?.authUserId ? t('support.you') : t('support.team')} text={m.message} at={m.createdAt} />
          ))}
          {ticket.resolution && (
            <Alert severity="success" icon={false}>
              <Typography sx={{ fontWeight: 600 }}>{t('support.resolution')}</Typography>
              {ticket.resolution}
            </Alert>
          )}
        </Stack>
        <ErrorAlert error={messages.error ?? send.error} />
        {!closed && (
          <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'flex-end' }} component="form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}>
            <TextField label={t('support.reply')} value={text} onChange={(e) => setText(e.target.value)} multiline maxRows={6} slotProps={{ htmlInput: { maxLength: 2000 } }} />
            <Button type="submit" variant="contained" disabled={!text.trim() || send.isPending} sx={{ minHeight: 40 }}>{t('support.send')}</Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function Bubble({ mine, author, text, at }: { mine?: boolean; author: string; text: string; at?: string }) {
  return (
    <Box sx={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
      <Typography variant="caption" color="text.secondary">{author}{at && ` · ${dateTime(at)}`}</Typography>
      <Box sx={{ mt: 0.5, p: 1.5, borderRadius: 1, bgcolor: mine ? 'rgba(27,194,102,0.12)' : 'action.hover', whiteSpace: 'pre-wrap' }}>
        <Typography>{text}</Typography>
      </Box>
    </Box>
  );
}

function NewTicketDialog({ open, tripId, onClose, onCreated }: { open: boolean; tripId?: string; onClose: () => void; onCreated: (t: SupportTicket) => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ subject: '', description: '', category: tripId ? 'trip_issue' : 'other', tripId: tripId ?? '' });
  const trips = useQuery({ queryKey: ['my-trips'], queryFn: bookingApi.myTrips, enabled: open });
  const create = useMutation({
    mutationFn: () =>
      customerApi.createTicket({ subject: form.subject.trim(), description: form.description.trim(), category: form.category, tripId: form.tripId || undefined }),
    onSuccess: (tk) => {
      setForm({ subject: '', description: '', category: 'other', tripId: '' });
      onCreated(tk);
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('support.new')}</DialogTitle>
      <DialogContent>
        <ErrorAlert error={create.error} />
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label={t('support.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} size="medium">
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{t(`support.categories.${c}`)}</MenuItem>)}
          </TextField>
          <TextField select label={t('support.trip')} value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })} size="medium">
            <MenuItem value="">—</MenuItem>
            {(trips.data ?? []).slice(0, 20).map((tr) => (
              <MenuItem key={tr.id} value={tr.id}>{tr.tripNumber} · {dateTime(tr.requestedAt)}</MenuItem>
            ))}
          </TextField>
          <TextField label={t('support.subject')} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required size="medium" slotProps={{ htmlInput: { maxLength: 255 } }} />
          <TextField label={t('support.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required multiline minRows={4} size="medium" slotProps={{ htmlInput: { maxLength: 4000 } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={() => create.mutate()} disabled={create.isPending || !form.subject.trim() || !form.description.trim()}>
          {t('support.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
