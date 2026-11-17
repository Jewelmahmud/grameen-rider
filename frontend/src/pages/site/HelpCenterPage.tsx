import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import { useAuth } from '../../auth/AuthProvider';
import { usePublicConfig } from '../../api/hooks';
import { useSiteCopy } from '../../content/site';
import { Section, SectionTitle } from '../../layouts/PublicLayout';

/** Public FAQ. Logged-in users open and follow support requests at /book/help. */
export default function HelpCenterPage() {
  const c = useSiteCopy().help;
  const { status } = useAuth();
  const config = usePublicConfig();
  const phone = config.data?.['support.phone'] as string | undefined;
  const whatsapp = config.data?.['support.whatsapp'] as string | undefined;

  return (
    <Section>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 7 }}>
          <SectionTitle title={c.title} body={c.body} />
          {c.faqs.map((f, i) => (
            <Accordion key={f.q} disableGutters variant="outlined" defaultExpanded={i === 0} sx={{ '&:not(:last-of-type)': { borderBottom: 0 } }}>
              <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
                <Typography sx={{ fontWeight: 600 }}>{f.q}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">{f.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ position: { md: 'sticky' }, top: { md: 96 } }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" component="h2">{c.contactTitle}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{c.contactBody}</Typography>
              <Stack spacing={1.5} sx={{ mt: 3 }}>
                <Button variant="contained" component={RouterLink} to={status === 'authenticated' ? '/book/help' : '/login'} state={{ from: '/book/help' }} sx={{ minHeight: 44 }}>
                  {c.openTicket}
                </Button>
                {phone && (
                  <Button variant="outlined" startIcon={<PhoneOutlined />} href={`tel:${phone}`} sx={{ minHeight: 44 }}>
                    {c.call}: {phone}
                  </Button>
                )}
                {whatsapp && (
                  <Button variant="outlined" startIcon={<ChatOutlined />} href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" sx={{ minHeight: 44 }}>
                    {c.whatsapp}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Section>
  );
}
