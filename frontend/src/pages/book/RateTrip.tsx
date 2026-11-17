import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Rating, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { customerApi } from '../../api/api';
import { errorMessage } from '../../api/http';

const doneKey = (id: string) => `gr.rated.${id}`;
const wasRated = (id: string) => {
  try {
    return localStorage.getItem(doneKey(id)) === '1';
  } catch {
    return false;
  }
};

/** Shown on a completed trip: the passenger rates the driver once. */
export function RateTrip({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const [value, setValue] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [done, setDone] = useState(() => wasRated(tripId));
  const markDone = () => {
    setDone(true);
    try {
      localStorage.setItem(doneKey(tripId), '1');
    } catch {
      /* the server still refuses a second rating */
    }
  };
  const rate = useMutation({
    mutationFn: () => customerApi.rateTrip(tripId, value!, review.trim()),
    onSuccess: markDone,
    onError: (e) => {
      // The server refuses a second rating; treat that as already done.
      if (/already rated/i.test(errorMessage(e))) markDone();
    },
  });

  if (done) return <Alert severity="success" sx={{ mt: 2 }}>{t('rate.thanks')}</Alert>;

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Typography sx={{ fontWeight: 600 }}>{t('rate.title')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('rate.sub')}</Typography>
        <Box sx={{ my: 1.5 }}>
          <Rating
            value={value}
            onChange={(_, v) => setValue(v)}
            size="large"
            getLabelText={(n) => t('rate.stars', { n })}
          />
        </Box>
        {value !== null && (
          <Stack spacing={1.5}>
            <TextField label={t('rate.review')} value={review} onChange={(e) => setReview(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 1000 } }} />
            {rate.error && !/already rated/i.test(errorMessage(rate.error)) && <Alert severity="error">{errorMessage(rate.error)}</Alert>}
            <Button variant="contained" onClick={() => rate.mutate()} disabled={rate.isPending} sx={{ alignSelf: 'flex-start' }}>
              {t('rate.submit')}
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
