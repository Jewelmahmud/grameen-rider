import { Suspense } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppBar, BottomNavigation, BottomNavigationAction, Box, Button, Container, Paper, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import LocalTaxiOutlined from '@mui/icons-material/LocalTaxiOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import { useTranslation } from 'react-i18next';
import { FullPageSpinner } from '../auth/guards';
import { LanguageSwitch, ThemeToggle } from '../components/common';
import { Logo } from './ConsoleLayout';
import { UserMenu } from './UserMenu';

const TABS = [
  { to: '/book', label: 'nav.book', icon: <LocalTaxiOutlined /> },
  { to: '/book/trips', label: 'nav.myTrips', icon: <ReceiptLongOutlined /> },
  { to: '/book/profile', label: 'common.profile', icon: <PersonOutline /> },
];

export function CustomerLayout() {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const current = [...TABS].sort((a, b) => b.to.length - a.to.length).find((tab) => location.pathname.startsWith(tab.to))?.to ?? '/book';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: small ? 9 : 0 }}>
      <AppBar position="sticky" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Box component={RouterLink} to="/book" sx={{ color: 'inherit', textDecoration: 'none' }}>
            <Logo />
          </Box>
          <Box sx={{ flex: 1 }} />
          {!small &&
            TABS.slice(0, 2).map((tab) => (
              <Button key={tab.to} component={RouterLink} to={tab.to} color={current === tab.to ? 'primary' : 'inherit'} aria-current={current === tab.to ? 'page' : undefined}>
                {t(tab.label)}
              </Button>
            ))}
          <LanguageSwitch />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" component="main" sx={{ py: { xs: 2, sm: 4 } }}>
        <Suspense fallback={<FullPageSpinner />}>
          <Outlet />
        </Suspense>
      </Container>
      {small && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: 1, borderColor: 'divider', zIndex: 10 }} elevation={0}>
          <BottomNavigation value={current} onChange={(_, v: string) => navigate(v)} showLabels>
            {TABS.map((tab) => (
              <BottomNavigationAction key={tab.to} value={tab.to} label={t(tab.label)} icon={tab.icon} sx={{ minHeight: 56 }} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
