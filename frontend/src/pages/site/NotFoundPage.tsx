import { Link as RouterLink } from 'react-router-dom';
import { Button, Container, Stack, Typography } from '@mui/material';
import { useSiteCopy } from '../../content/site';

export default function NotFoundPage() {
  const c = useSiteCopy().notFound;
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 10, md: 16 }, textAlign: 'center' }}>
      <Typography sx={{ color: 'primary.main', fontWeight: 700, fontSize: 64, lineHeight: 1 }} aria-hidden>
        404
      </Typography>
      <Typography component="h1" variant="h4" sx={{ mt: 2, fontWeight: 700 }}>{c.title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5 }}>{c.body}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
        <Button variant="contained" component={RouterLink} to="/" sx={{ minHeight: 44 }}>{c.home}</Button>
        <Button variant="outlined" component={RouterLink} to="/book" sx={{ minHeight: 44 }}>{c.book}</Button>
      </Stack>
    </Container>
  );
}
