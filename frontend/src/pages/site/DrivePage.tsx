import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { useSiteCopy } from '../../content/site';
import { Section, SectionTitle } from '../../layouts/PublicLayout';

/** SB7 for drivers: wants steady, fair work → fastest-tap dispatch and bargaining → fair-share matching → plan → sign up. */
export default function DrivePage() {
  const c = useSiteCopy().drive;
  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 12 } }}>
          <Box sx={{ maxWidth: 760 }}>
            <Typography sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>{c.eyebrow}</Typography>
            <Typography component="h1" sx={{ fontWeight: 700, fontSize: { xs: 34, sm: 42, md: 52 }, lineHeight: 1.12 }}>
              {c.title}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2.5, fontSize: { xs: 17, md: 19 } }}>{c.body}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button variant="contained" size="large" component={RouterLink} to="/register?role=driver" endIcon={<ArrowForward />} sx={{ minHeight: 48, px: 3 }}>
                {c.cta}
              </Button>
              <Button variant="outlined" size="large" component={RouterLink} to="/drive#how" sx={{ minHeight: 48, px: 3 }}>
                {c.ctaSecondary}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Section>
        <SectionTitle title={c.problemTitle} />
        <Grid container spacing={2}>
          {c.problems.map((p) => (
            <Grid key={p.title} size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" component="h3">{p.title}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>{p.body}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section tint>
        <SectionTitle title={c.guideTitle} />
        <Grid container spacing={4}>
          {c.guide.map((g) => (
            <Grid key={g.title} size={{ xs: 12, sm: 6 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <CheckCircleOutline sx={{ color: 'primary.main', mt: 0.3 }} aria-hidden />
                <Box>
                  <Typography variant="h6" component="h3">{g.title}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>{g.body}</Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section id="how">
        <SectionTitle title={c.planTitle} />
        <Grid container spacing={4}>
          {c.plan.map((s, i) => (
            <Grid key={s.title} size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={2}>
                <Box aria-hidden sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 1, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                  {i + 1}
                </Box>
                <Box>
                  <Typography variant="h6" component="h3">{s.title}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>{s.body}</Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section tint>
        <Card sx={{ borderColor: 'primary.main' }}>
          <CardContent sx={{ p: { xs: 3, md: 6 } }}>
            <Grid container spacing={4} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>{c.successTitle}</Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {c.success.map((s) => (
                    <Stack key={s} direction="row" spacing={1.5}>
                      <CheckCircleOutline fontSize="small" sx={{ color: 'primary.main', mt: 0.3 }} aria-hidden />
                      <Typography>{s}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }} sx={{ textAlign: { md: 'right' } }}>
                <Typography variant="h6" component="p" sx={{ mb: 2 }}>{c.finalTitle}</Typography>
                <Button variant="contained" size="large" component={RouterLink} to="/register?role=driver" sx={{ minHeight: 48, px: 4 }}>
                  {c.finalCta}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
