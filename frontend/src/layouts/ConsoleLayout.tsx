import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import MenuOpenOutlined from '@mui/icons-material/MenuOpenOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { FullPageSpinner } from '../auth/guards';
import { LanguageSwitch, ThemeToggle } from '../components/common';
import { CONSOLE_NAV } from './nav';
import { UserMenu } from './UserMenu';

const WIDTH = 248;
const MINI = 64;

export function Logo({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#1bc266', color: '#06260f', display: 'grid', placeItems: 'center', fontWeight: 700 }}
      >
        G
      </Box>
      {!compact && (
        <Typography sx={{ fontWeight: 700, fontSize: 17 }} noWrap>
          {t('app.name')}
        </Typography>
      )}
    </Stack>
  );
}

export function ConsoleLayout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const { t } = useTranslation();
  const { can } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mini = desktop && collapsed;
  const width = mini ? MINI : WIDTH;

  const groups = CONSOLE_NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) })).filter((g) => g.items.length);
  // The longest matching path is the active one (so /console/reports/fairness doesn't light up Reports too).
  const allPaths = groups.flatMap((g) => g.items.map((i) => i.to));
  const active = allPaths
    .filter((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: mini ? 2 : 2.5 }}>
        <Logo compact={mini} />
      </Toolbar>
      <Divider />
      <Box component="nav" aria-label={t('nav.console')} sx={{ overflowY: 'auto', flex: 1, py: 1 }}>
        {groups.map((g, gi) => (
          <List
            key={gi}
            dense
            subheader={
              g.label && !mini ? (
                <ListSubheader disableSticky sx={{ lineHeight: '32px', bgcolor: 'transparent', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t(`nav.${g.label}`)}
                </ListSubheader>
              ) : undefined
            }
          >
            {g.items.map((item) => {
              const selected = item.to === active;
              const button = (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end
                  selected={selected}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    mx: 1,
                    borderRadius: 1.5,
                    minHeight: 40,
                    justifyContent: mini ? 'center' : 'flex-start',
                    '&.Mui-selected': { bgcolor: 'action.selected', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } },
                  }}
                  aria-current={selected ? 'page' : undefined}
                >
                  <ListItemIcon sx={{ minWidth: mini ? 0 : 36 }}>{item.icon}</ListItemIcon>
                  {!mini && <ListItemText primary={t(`nav.${item.label}`)} />}
                </ListItemButton>
              );
              return mini ? (
                <Tooltip key={item.to} title={t(`nav.${item.label}`)} placement="right">
                  {button}
                </Tooltip>
              ) : (
                button
              );
            })}
          </List>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{ borderBottom: 1, borderColor: 'divider', width: { md: `calc(100% - ${width}px)` }, ml: { md: `${width}px` } }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={() => (desktop ? setCollapsed((c) => !c) : setMobileOpen(true))}
            aria-label={desktop ? (collapsed ? 'Expand menu' : 'Collapse menu') : 'Open menu'}
          >
            {desktop && !collapsed ? <MenuOpenOutlined /> : <MenuOutlined />}
          </IconButton>
          {!desktop && <Logo />}
          <Box sx={{ flex: 1 }} />
          <LanguageSwitch />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Box component="aside" sx={{ width: { md: width }, flexShrink: { md: 0 } }}>
        {desktop ? (
          <Drawer
            variant="permanent"
            open
            sx={{ '& .MuiDrawer-paper': { width, boxSizing: 'border-box', transition: 'width 150ms', overflowX: 'hidden' } }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: WIDTH } }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, sm: 3 }, mt: 8 }}>
        <Suspense fallback={<FullPageSpinner />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}
