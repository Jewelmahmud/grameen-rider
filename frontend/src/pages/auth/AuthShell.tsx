import type { PropsWithChildren, ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { LanguageSwitch, ThemeToggle } from '../../components/common';
import { Logo } from '../../layouts/ConsoleLayout';

export function AuthShell({ title, subtitle, children, footer }: PropsWithChildren<{ title: string; subtitle?: ReactNode; footer?: ReactNode }>) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ p: 2, alignItems: 'center' }}>
        <Logo />
        <Box sx={{ flex: 1 }} />
        <LanguageSwitch />
        <ThemeToggle />
      </Stack>
      <Box component="main" sx={{ flex: 1, display: 'grid', placeItems: 'center', px: 2, pb: 6 }}>
        <Card sx={{ width: '100%', maxWidth: 440 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" component="h1">
              {title}
            </Typography>
            {subtitle && (
              <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
                {subtitle}
              </Typography>
            )}
            {children}
          </CardContent>
        </Card>
        {footer && <Box sx={{ mt: 2 }}>{footer}</Box>}
      </Box>
    </Box>
  );
}

/** GiLab accepts 01XXXXXXXXX; the server also normalises +880. */
export const BD_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;
