import { Suspense, useState, type ReactNode } from 'react';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import { homeFor, useAuth } from '../auth/AuthProvider';
import { FullPageSpinner } from '../auth/guards';
import { LanguageSwitch, ThemeToggle } from '../components/common';
import { usePublicConfig } from '../api/hooks';
import { useSiteCopy } from '../content/site';
import { Logo } from './ConsoleLayout';

/** Header + footer for the public site: landing, drive, help, legal, 404. */
export function PublicLayout({ children }: { children?: ReactNode }) {
  const c = useSiteCopy();
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('md'));
  const { status, me } = useAuth();
  const [open, setOpen] = useState(false);
  const config = usePublicConfig();
  const phone = config.data?.['support.phone'] as string | undefined;

  const links = [
    { to: '/#ride', label: c.nav.ride },
    { to: '/#rental', label: c.nav.rental },
    { to: '/drive', label: c.nav.drive },
    { to: '/help', label: c.nav.help },
  ];
  const account =
    status === 'authenticated' ? (
      <Button variant="contained" component={RouterLink} to={homeFor(me)}>{c.nav.openApp}</Button>
    ) : (
      <>
        <Button color="inherit" component={RouterLink} to="/login">{c.nav.login}</Button>
        <Button variant="contained" component={RouterLink} to="/register">{c.nav.signup}</Button>
      </>
    );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="sticky" sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 1 }}>
            <Box component={RouterLink} to="/" sx={{ color: 'inherit', textDecoration: 'none' }} aria-label="Grameen Ride">
              <Logo />
            </Box>
            {!small && (
              <Stack component="nav" direction="row" spacing={0.5} sx={{ ml: 4 }}>
                {links.map((l) => (
                  <Button key={l.to} color="inherit" component={RouterLink} to={l.to}>{l.label}</Button>
                ))}
              </Stack>
            )}
            <Box sx={{ flex: 1 }} />
            <LanguageSwitch />
            {!small && <ThemeToggle />}
            {!small ? account : (
              <IconButton onClick={() => setOpen(true)} aria-label="Menu" edge="end">
                <MenuOutlined />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: 280 } } }}>
        <List onClick={() => setOpen(false)}>
          {links.map((l) => (
            <ListItemButton key={l.to} component={RouterLink} to={l.to} sx={{ minHeight: 48 }}>
              <ListItemText primary={l.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <Stack spacing={1} sx={{ p: 2 }} onClick={() => setOpen(false)}>
          {account}
          <ThemeToggle />
        </Stack>
      </Drawer>

      <Box component="main" sx={{ flex: 1 }}>
        <Suspense fallback={<FullPageSpinner />}>{children ?? <Outlet />}</Suspense>
      </Box>

      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', mt: 8 }}>
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Logo />
              <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 360 }}>{c.footer.tagline}</Typography>
              {phone && (
                <Typography sx={{ mt: 1.5 }}>
                  <Link href={`tel:${phone}`}>{phone}</Link>
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stack spacing={1}>
                <Link component={RouterLink} to="/book" color="inherit" underline="hover">{c.footer.links.book}</Link>
                <Link component={RouterLink} to="/drive" color="inherit" underline="hover">{c.footer.links.drive}</Link>
                <Link component={RouterLink} to="/help" color="inherit" underline="hover">{c.footer.links.help}</Link>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Stack spacing={1}>
                <Link component={RouterLink} to="/terms" color="inherit" underline="hover">{c.footer.links.terms}</Link>
                <Link component={RouterLink} to="/privacy" color="inherit" underline="hover">{c.footer.links.privacy}</Link>
              </Stack>
            </Grid>
          </Grid>
          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} {c.footer.company}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

/** Section wrapper with consistent vertical rhythm. */
export function Section({ id, children, tint }: { id?: string; children: ReactNode; tint?: boolean }) {
  return (
    <Box component="section" id={id} sx={{ py: { xs: 7, md: 10 }, bgcolor: tint ? 'action.hover' : undefined, scrollMarginTop: 64 }}>
      <Container maxWidth="lg">{children}</Container>
    </Box>
  );
}

export function SectionTitle({ eyebrow, title, body, center }: { eyebrow?: string; title: string; body?: string; center?: boolean }) {
  return (
    <Box sx={{ mb: { xs: 4, md: 6 }, maxWidth: 720, mx: center ? 'auto' : undefined, textAlign: center ? 'center' : undefined }}>
      {eyebrow && (
        <Typography sx={{ color: 'primary.main', fontWeight: 600, mb: 1, letterSpacing: 0.3 }}>{eyebrow}</Typography>
      )}
      <Typography variant="h4" component="h2" sx={{ fontWeight: 700, fontSize: { xs: 26, md: 34 }, lineHeight: 1.25 }}>
        {title}
      </Typography>
      {body && (
        <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: { md: 17 } }}>
          {body}
        </Typography>
      )}
    </Box>
  );
}
