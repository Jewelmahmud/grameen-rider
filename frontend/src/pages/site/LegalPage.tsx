import { Alert, Box, Container, Divider, Typography } from '@mui/material';
import { useLegal } from '../../content/legal';
import { useSiteCopy } from '../../content/site';

export default function LegalPage({ doc }: { doc: 'terms' | 'privacy' }) {
  const d = useLegal(doc);
  const c = useSiteCopy().legal;
  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Alert severity="warning" sx={{ mb: 4 }}>{c.draft}</Alert>
      <Typography component="h1" sx={{ fontWeight: 700, fontSize: { xs: 30, md: 40 } }}>{d.title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {c.updated}: {d.updated}
      </Typography>
      <Typography sx={{ mt: 3, fontSize: 17 }}>{d.intro}</Typography>
      <Divider sx={{ my: 4 }} />
      {d.sections.map((s) => (
        <Box key={s.heading} component="section" sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{s.heading}</Typography>
          {s.body.map((p) => (
            <Typography key={p} color="text.secondary" sx={{ mb: 1, lineHeight: 1.75 }}>{p}</Typography>
          ))}
        </Box>
      ))}
    </Container>
  );
}
