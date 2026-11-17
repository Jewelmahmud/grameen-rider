import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import RequestQuoteOutlined from '@mui/icons-material/RequestQuoteOutlined';
import LocalTaxiOutlined from '@mui/icons-material/LocalTaxiOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { homeFor, useAuth } from '../../auth/AuthProvider';
import { useSiteCopy } from '../../content/site';
import { Section, SectionTitle } from '../../layouts/PublicLayout';

const PLAN_ICONS = [<PlaceOutlined key="p" />, <RequestQuoteOutlined key="r" />, <LocalTaxiOutlined key="l" />];
const GUIDE_ICONS = [<HubOutlined key="h" />, <PaymentsOutlined key="p" />, <VerifiedUserOutlined key="v" />];

export default function LandingPage() {
  const c = useSiteCopy().landing;
  const { status, me } = useAuth();
  const bookTo = status === 'authenticated' ? homeFor(me) : '/register';

  return (
    <>
      {/* 1 Character + 5 Direct CTA */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 12 } }}>
          <Grid container spacing={{ xs: 5, md: 8 }} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>{c.heroEyebrow}</Typography>
              <Typography component="h1" sx={{ fontWeight: 700, fontSize: { xs: 36, sm: 44, md: 56 }, lineHeight: 1.1, letterSpacing: -0.5 }}>
                {c.heroTitle}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 2.5, fontSize: { xs: 17, md: 19 }, maxWidth: 560 }}>
                {c.heroBody}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
                <Button variant="contained" size="large" component={RouterLink} to={bookTo} endIcon={<ArrowForward />} sx={{ minHeight: 48, px: 3 }}>
                  {c.ctaPrimary}
                </Button>
                <Button variant="outlined" size="large" component={RouterLink} to="/#how" sx={{ minHeight: 48, px: 3 }}>
                  {c.ctaSecondary}
                </Button>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} sx={{ mt: 4, flexWrap: 'wrap' }}>
                {c.trust.map((t) => (
                  <Stack key={t} direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                    <CheckCircleOutline fontSize="small" sx={{ color: 'primary.main' }} aria-hidden />
                    <Typography variant="body2">{t}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <QuotePreview />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 2 Problem */}
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
        <Typography sx={{ mt: 4, fontSize: { md: 19 }, fontWeight: 500, maxWidth: 720 }}>{c.philosophical}</Typography>
      </Section>

      {/* 3 Guide: empathy + authority */}
      <Section tint>
        <SectionTitle title={c.guideTitle} body={c.guideEmpathy} />
        <Grid container spacing={4}>
          {c.guideAuthority.map((g, i) => (
            <Grid key={g.title} size={{ xs: 12, md: 4 }}>
              <IconBadge>{GUIDE_ICONS[i]}</IconBadge>
              <Typography variant="h6" component="h3" sx={{ mt: 2 }}>{g.title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{g.body}</Typography>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* 4 Plan */}
      <Section id="how">
        <SectionTitle title={c.planTitle} />
        <Grid container spacing={4}>
          {c.plan.map((s, i) => (
            <Grid key={s.title} size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={2}>
                <Box
                  aria-hidden
                  sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 1, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', fontWeight: 700 }}
                >
                  {i + 1}
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'primary.main' }}>
                    {PLAN_ICONS[i]}
                    <Typography variant="h6" component="h3" sx={{ color: 'text.primary' }}>{s.title}</Typography>
                  </Stack>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>{s.body}</Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Services */}
      <Section tint>
        <SectionTitle title={c.servicesTitle} />
        <Grid container spacing={2}>
          {c.services.map((s) => (
            <Grid key={s.key} size={{ xs: 12, md: 6 }}>
              <Card id={s.key} sx={{ height: '100%', scrollMarginTop: 80 }}>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <IconBadge>{s.key === 'ride' ? <LocalTaxiOutlined /> : <EventAvailableOutlined />}</IconBadge>
                    <Typography variant="h5" component="h3">{s.title}</Typography>
                  </Stack>
                  <Typography color="text.secondary" sx={{ mt: 2 }}>{s.body}</Typography>
                  <Stack spacing={1} sx={{ mt: 2.5 }}>
                    {s.points.map((p) => (
                      <Stack key={p} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <CheckCircleOutline fontSize="small" sx={{ color: 'primary.main', mt: 0.3 }} aria-hidden />
                        <Typography>{p}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* 6 Failure / 7 Success */}
      <Section>
        <SectionTitle title={c.stakesTitle} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" component="h3" color="text.secondary">{c.failureTitle}</Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {c.failure.map((f) => (
                    <Stack key={f} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', color: 'text.secondary' }}>
                      <CancelOutlined fontSize="small" sx={{ mt: 0.3 }} aria-hidden />
                      <Typography>{f}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%', borderColor: 'primary.main' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" component="h3" color="primary.main">{c.successTitle}</Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {c.success.map((s) => (
                    <Stack key={s} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                      <CheckCircleOutline fontSize="small" sx={{ color: 'primary.main', mt: 0.3 }} aria-hidden />
                      <Typography sx={{ fontWeight: 500 }}>{s}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Section>

      {/* 5 Final direct CTA + transitional CTAs */}
      <Section tint>
        <Card sx={{ borderColor: 'primary.main' }}>
          <CardContent sx={{ p: { xs: 3, md: 6 }, textAlign: 'center' }}>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700, fontSize: { xs: 26, md: 34 } }}>{c.finalTitle}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>{c.finalBody}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3, justifyContent: 'center' }}>
              <Button variant="contained" size="large" component={RouterLink} to={bookTo} sx={{ minHeight: 48, px: 4 }}>
                {status === 'authenticated' ? c.ctaPrimary : c.finalCta}
              </Button>
              {status !== 'authenticated' && (
                <Button size="large" component={RouterLink} to="/login" sx={{ minHeight: 48 }}>{c.haveAccount}</Button>
              )}
            </Stack>
          </CardContent>
        </Card>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TransitionCard title={c.driverTitle} body={c.driverBody} cta={c.driverCta} to="/drive" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TransitionCard title={c.employeeTitle} body={c.employeeBody} cta={c.ctaPrimary} to={status === 'authenticated' ? '/book/profile' : '/login'} />
          </Grid>
        </Grid>
      </Section>
    </>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <Box aria-hidden sx={{ width: 44, height: 44, borderRadius: 1, bgcolor: 'rgba(27,194,102,0.14)', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
      {children}
    </Box>
  );
}

function TransitionCard({ title, body, cta, to }: { title: string; body: string; cta: string; to: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h6" component="h3">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, flex: 1 }}>{body}</Typography>
        <Box sx={{ mt: 2 }}>
          <Button component={RouterLink} to={to} endIcon={<ArrowForward />}>{cta}</Button>
        </Box>
      </CardContent>
    </Card>
  );
}

/** Illustration of the booking step: prices shown per vehicle before booking. Labelled as an example. */
function QuotePreview() {
  const { i18n } = useSiteCopyLang();
  const bn = i18n === 'bn';
  const rows = bn
    ? [['মোটরসাইকেল', '৳ ১৩৪'], ['সিএনজি / অটো', '৳ ১৯০'], ['কার', '৳ ৩২০']]
    : [['Motorcycle', '৳ 134'], ['CNG / Auto', '৳ 190'], ['Car', '৳ 320']];
  return (
    <Card aria-label={bn ? 'উদাহরণ: ভাড়ার তালিকা' : 'Example: price list'} sx={{ boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">{bn ? 'গুলশান → মতিঝিল · ৭.৯ কিমি' : 'Gulshan → Motijheel · 7.9 km'}</Typography>
          <Chip size="small" label={bn ? 'উদাহরণ' : 'Example'} variant="outlined" />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1}>
          {rows.map(([v, p], i) => (
            <Stack
              key={v}
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 1, border: 1, borderColor: i === 2 ? 'primary.main' : 'divider', borderWidth: i === 2 ? 2 : 1 }}
            >
              <Typography sx={{ fontWeight: 500 }}>{v}</Typography>
              <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p}</Typography>
            </Stack>
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {bn ? 'বুক করার আগেই মোট ভাড়া। যে ভাড়া বাছবেন, সেটাই দেবেন।' : 'Total price before you book. The price you pick is the price you pay.'}
        </Typography>
      </CardContent>
    </Card>
  );
}

const useSiteCopyLang = () => {
  const { i18n } = useTranslation();
  return { i18n: i18n.language === 'en' ? 'en' : 'bn' };
};
