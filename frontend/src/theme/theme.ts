import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

/**
 * Design tokens (docs/WEB_PLATFORM_PLAN.md §8.2).
 * Brand green #1bc266 is too light for text on white (2.35:1), so it is used for fills and accents only.
 * primary.main #0f7a3f is 5.4:1 on white and carries buttons and links.
 */
export const tokens = {
  brand: '#1bc266',
  primary: '#0f7a3f',
  primaryDark: '#0a5c2f',
  primaryLight: '#4fbf7f',
  /** Corner radius in px. Kept small (2–3 px) for a crisp look; sx borderRadius values multiply this. */
  radius: 3,
  // Barlow first for Latin text and digits; it has no Bengali glyphs, so Bangla falls through to SolaimanLipi.
  fontFamily: 'Barlow, SolaimanLipi, "Noto Sans Bengali", "Helvetica Neue", Arial, sans-serif',
};

export const createAppTheme = (density: 'console' | 'customer' = 'console') =>
  createTheme({
    cssVariables: { colorSchemeSelector: 'data' },
    colorSchemes: {
      light: {
        palette: {
          primary: { main: tokens.primary, dark: tokens.primaryDark, light: tokens.primaryLight, contrastText: '#fff' },
          secondary: { main: '#455a64', contrastText: '#fff' },
          success: { main: '#2e7d32' },
          warning: { main: '#b26a00' },
          error: { main: '#c62828' },
          info: { main: '#0277bd' },
          background: { default: '#f6f8f7', paper: '#ffffff' },
          divider: 'rgba(0,0,0,0.10)',
        },
      },
      dark: {
        palette: {
          primary: { main: '#5fd08f', dark: '#3fae70', light: '#8fe0b1', contrastText: '#06260f' },
          secondary: { main: '#90a4ae', contrastText: '#0b1215' },
          background: { default: '#0f1412', paper: '#161d1a' },
        },
      },
    },
    shape: { borderRadius: tokens.radius },
    spacing: 8,
    typography: {
      fontFamily: tokens.fontFamily,
      fontSize: density === 'console' ? 13 : 14,
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.6 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiPaper: { defaultProps: { elevation: 0 } },
      MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTextField: { defaultProps: { size: density === 'console' ? 'small' : 'medium', fullWidth: true } },
      MuiSelect: { defaultProps: { size: density === 'console' ? 'small' : 'medium' } },
      MuiDialog: { defaultProps: { fullWidth: true, maxWidth: 'sm' } },
      MuiTooltip: { defaultProps: { arrow: true } },
      // Chips are pill-shaped by default; keep them in line with the 3 px corners.
      MuiChip: { styleOverrides: { root: { borderRadius: tokens.radius } } },
      MuiDataGrid: {
        defaultProps: { density: 'compact', disableRowSelectionOnClick: true },
        styleOverrides: { root: { border: 'none' }, cell: { fontVariantNumeric: 'tabular-nums' } },
      },
      MuiCssBaseline: {
        styleOverrides: {
          ':focus-visible': { outline: `2px solid ${tokens.primary}`, outlineOffset: 2 },
        },
      },
    },
  });
