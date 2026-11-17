import { useState } from 'react';
import { Avatar, Box, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import LocalTaxiOutlined from '@mui/icons-material/LocalTaxiOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import HelpOutline from '@mui/icons-material/HelpOutline';
import BookmarkBorderOutlined from '@mui/icons-material/BookmarkBorderOutlined';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { EmployeeBadge } from '../components/common';
import { fullName } from '../lib/format';

export function UserMenu() {
  const { me, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!me) return null;
  const name = fullName(me);
  const initials = name === '—' ? '?' : name.split(' ').map((s) => s[0]).slice(0, 2).join('');
  const go = (to: string) => {
    setAnchor(null);
    navigate(to);
  };

  return (
    <>
      <Tooltip title={name}>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={`${t('common.profile')}: ${name}`}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>{initials}</Avatar>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 260 } } }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>{me.sparks.greetingName ?? name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {me.platformRoles.map((r) => t(`roles.${r}`)).join(' · ')}
          </Typography>
          {me.sparks.isEmployee && (
            <Stack direction="row" sx={{ mt: 1 }}>
              <EmployeeBadge designation={me.sparks.designation} />
            </Stack>
          )}
        </Box>
        <Divider />
        <MenuItem onClick={() => go('/book/profile')}>
          <ListItemIcon><PersonOutline fontSize="small" /></ListItemIcon>
          {t('common.profile')}
        </MenuItem>
        <MenuItem onClick={() => go('/book/places')}>
          <ListItemIcon><BookmarkBorderOutlined fontSize="small" /></ListItemIcon>
          {t('nav.places')}
        </MenuItem>
        <MenuItem onClick={() => go('/book/help')}>
          <ListItemIcon><HelpOutline fontSize="small" /></ListItemIcon>
          {t('nav.help')}
        </MenuItem>
        {me.permissions.includes('trips.book') && (
          <MenuItem onClick={() => go('/book')}>
            <ListItemIcon><LocalTaxiOutlined fontSize="small" /></ListItemIcon>
            {t('nav.bookRide')}
          </MenuItem>
        )}
        {me.isStaff && (
          <MenuItem onClick={() => go('/console')}>
            <ListItemIcon><DashboardOutlined fontSize="small" /></ListItemIcon>
            {t('nav.console')}
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={async () => {
            setAnchor(null);
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          <ListItemIcon><LogoutOutlined fontSize="small" /></ListItemIcon>
          {t('common.logout')}
        </MenuItem>
      </Menu>
    </>
  );
}
