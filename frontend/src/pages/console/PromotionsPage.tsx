import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { useTranslation } from 'react-i18next';
import { growthApi, pricingApi, type PromotionInput } from '../../api/api';
import type { Promotion } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { ErrorAlert, PageHeader, useNotify } from '../../components/common';
import { SimpleGrid } from '../../components/grid';
import { vehicleLabel } from '../../i18n';
import { dateOnly, fromLocalInput, money, toLocalInput } from '../../lib/format';

type Draft = Partial<PromotionInput> & { id?: string };

const AUDIENCE = { all: 'Everyone', employees: 'GiLab employees', new_users: 'New customers (no trip yet)' } as const;

/** Fields the update endpoint accepts (the rest are fixed after creation). */
const UPDATABLE = ['usageLimit', 'userUsageLimit', 'applicableVehicleTypes', 'isActive', 'audience', 'minTripAmount', 'validFrom', 'validUntil'] as const;

export default function PromotionsPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const canWrite = can('promotions.write');
  const qc = useQueryClient();
  const notify = useNotify();
  const promos = useQuery({ queryKey: ['promotions'], queryFn: growthApi.promotions });
  const rides = useQuery({ queryKey: ['rates', 'ride'], queryFn: () => pricingApi.rates('ride'), enabled: canWrite });
  const vehicleTypes = [...new Set((rides.data ?? []).map((r) => r.vehicleType))];
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const num = (v: unknown) => (v === '' || v === undefined || v === null ? undefined : Number(v));
      if (d.id) {
        const body = Object.fromEntries(UPDATABLE.map((k) => [k, d[k]]).filter(([, v]) => v !== undefined && v !== '')) as Partial<PromotionInput>;
        return growthApi.updatePromotion(d.id, { ...body, usageLimit: num(d.usageLimit) as number, userUsageLimit: num(d.userUsageLimit) as number, minTripAmount: num(d.minTripAmount) });
      }
      return growthApi.createPromotion({
        code: d.code?.trim().toUpperCase(),
        title: d.title?.trim(),
        description: d.description || undefined,
        discountType: d.discountType,
        discountValue: Number(d.discountValue),
        maxDiscountAmount: num(d.maxDiscountAmount),
        minTripAmount: num(d.minTripAmount),
        validFrom: d.validFrom,
        validUntil: d.validUntil,
        usageLimit: num(d.usageLimit) as number,
        userUsageLimit: num(d.userUsageLimit) as number,
        applicableVehicleTypes: d.applicableVehicleTypes?.length ? d.applicableVehicleTypes : undefined,
        isActive: d.isActive,
        audience: d.audience,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['promotions'] });
      notify(t('common.saved'));
      setDraft(null);
    },
  });
  const toggle = useMutation({
    mutationFn: (id: string) => growthApi.togglePromotion(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['promotions'] }),
  });

  const columns: GridColDef<Promotion>[] = [
    { field: 'code', headerName: 'Code', width: 130, renderCell: ({ value }) => <Box component="code" sx={{ fontWeight: 600 }}>{value}</Box> },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 160 },
    {
      field: 'discount',
      headerName: 'Discount',
      width: 150,
      valueGetter: (_, r) =>
        r.discountType === 'percentage'
          ? `${Number(r.discountValue)}%${r.maxDiscountAmount ? ` (max ${money(r.maxDiscountAmount)})` : ''}`
          : money(r.discountValue),
    },
    { field: 'audience', headerName: 'Audience', width: 170, renderCell: ({ value }) => <Chip size="small" color={value === 'employees' ? 'primary' : 'default'} variant="outlined" label={AUDIENCE[value as Promotion['audience']] ?? value} /> },
    { field: 'valid', headerName: 'Valid', width: 200, valueGetter: (_, r) => `${dateOnly(r.validFrom)} – ${dateOnly(r.validUntil)}` },
    { field: 'usage', headerName: 'Used', width: 100, valueGetter: (_, r) => `${r.usageCount ?? 0}${r.usageLimit ? ` / ${r.usageLimit}` : ''}` },
    {
      field: 'isActive',
      headerName: t('common.active'),
      width: 90,
      renderCell: ({ row }) => (
        <Switch
          size="small"
          checked={row.isActive}
          disabled={!canWrite || toggle.isPending}
          onChange={() => toggle.mutate(row.id)}
          slotProps={{ input: { 'aria-label': `${t('common.active')}: ${row.code}` } }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: ({ row }) =>
        canWrite && (
          <Tooltip title={t('common.edit')}>
            <IconButton size="small" aria-label={`${t('common.edit')}: ${row.code}`} onClick={() => setDraft({ ...row, discountValue: Number(row.discountValue) } as Draft)}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
    },
  ];

  const isNew = !draft?.id;
  const valid =
    draft &&
    (isNew
      ? Boolean(draft.code?.trim() && draft.title?.trim() && Number(draft.discountValue) > 0 && draft.validFrom && draft.validUntil && draft.validFrom < draft.validUntil && (draft.discountType !== 'percentage' || Number(draft.discountValue) <= 100))
      : true);

  return (
    <>
      <PageHeader
        title={t('nav.promotions')}
        subtitle="Promo codes customers type at booking. When a GiLab employee also has an employee discount, the larger one applies — they never stack."
        crumbs={[{ label: t('nav.growth') }]}
        action={
          canWrite && (
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={() =>
                setDraft({ discountType: 'percentage', audience: 'all', isActive: true, validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString() })
              }
            >
              {t('common.add')}
            </Button>
          )
        }
      />
      <ErrorAlert error={promos.error ?? toggle.error} onRetry={() => promos.refetch()} />
      <SimpleGrid rows={promos.data ?? []} columns={columns} loading={promos.isLoading} />

      <Drawer anchor="right" open={Boolean(draft)} onClose={() => setDraft(null)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}>
        {draft && (
          <Box component="form" sx={{ p: 3 }} onSubmit={(e) => { e.preventDefault(); save.mutate(draft); }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              {isNew ? t('common.add') : `${t('common.edit')}: ${draft.code}`}
            </Typography>
            <ErrorAlert error={save.error} />
            <Stack spacing={2}>
              <TextField label="Code" value={draft.code ?? ''} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} disabled={!isNew} required slotProps={{ htmlInput: { maxLength: 50 } }} />
              <TextField label="Title" value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} disabled={!isNew} required />
              <TextField label="Description" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} disabled={!isNew} multiline minRows={2} />
              <Stack direction="row" spacing={1}>
                <TextField select label="Type" value={draft.discountType} onChange={(e) => setDraft({ ...draft, discountType: e.target.value as Promotion['discountType'] })} disabled={!isNew}>
                  <MenuItem value="percentage">Percentage</MenuItem>
                  <MenuItem value="fixed">Fixed amount</MenuItem>
                </TextField>
                <TextField
                  label="Value"
                  type="number"
                  value={draft.discountValue ?? ''}
                  onChange={(e) => setDraft({ ...draft, discountValue: e.target.value })}
                  disabled={!isNew}
                  required
                  slotProps={{ htmlInput: { min: 0 }, input: { endAdornment: <InputAdornment position="end">{draft.discountType === 'percentage' ? '%' : '৳'}</InputAdornment> } }}
                />
              </Stack>
              {draft.discountType === 'percentage' && (
                <TextField label="Maximum discount" type="number" value={draft.maxDiscountAmount ?? ''} onChange={(e) => setDraft({ ...draft, maxDiscountAmount: e.target.value })} disabled={!isNew} slotProps={{ input: { startAdornment: <InputAdornment position="start">৳</InputAdornment> } }} />
              )}
              <TextField label="Minimum trip fare" type="number" value={draft.minTripAmount ?? ''} onChange={(e) => setDraft({ ...draft, minTripAmount: e.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">৳</InputAdornment> } }} />
              <TextField select label="Audience" value={draft.audience ?? 'all'} onChange={(e) => setDraft({ ...draft, audience: e.target.value as Promotion['audience'] })}>
                {Object.entries(AUDIENCE).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1}>
                <TextField label="Valid from" type="datetime-local" value={toLocalInput(draft.validFrom)} onChange={(e) => setDraft({ ...draft, validFrom: fromLocalInput(e.target.value) })} required slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Valid until" type="datetime-local" value={toLocalInput(draft.validUntil)} onChange={(e) => setDraft({ ...draft, validUntil: fromLocalInput(e.target.value) })} required slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField label="Total uses" type="number" value={draft.usageLimit ?? ''} onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value === '' ? null : Number(e.target.value) })} helperText="Empty = unlimited" />
                <TextField label="Uses per customer" type="number" value={draft.userUsageLimit ?? ''} onChange={(e) => setDraft({ ...draft, userUsageLimit: e.target.value === '' ? null : Number(e.target.value) })} helperText="Empty = unlimited" />
              </Stack>
              <Autocomplete
                multiple
                options={vehicleTypes}
                value={draft.applicableVehicleTypes ?? []}
                onChange={(_, v) => setDraft({ ...draft, applicableVehicleTypes: v })}
                getOptionLabel={(v) => vehicleLabel(t, v)}
                renderInput={(params) => <TextField {...params} label="Vehicle types" helperText="Empty = all vehicle types" />}
              />
              <FormControlLabel control={<Switch checked={draft.isActive ?? true} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />} label={t('common.active')} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="contained" disabled={save.isPending || !valid}>{t('common.save')}</Button>
            </Stack>
          </Box>
        )}
      </Drawer>
    </>
  );
}
