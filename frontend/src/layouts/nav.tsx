import type { ReactNode } from 'react';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import LocalTaxiOutlined from '@mui/icons-material/LocalTaxiOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import CarRentalOutlined from '@mui/icons-material/CarRentalOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import AltRouteOutlined from '@mui/icons-material/AltRouteOutlined';
import CalculateOutlined from '@mui/icons-material/CalculateOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import SupportAgentOutlined from '@mui/icons-material/SupportAgentOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import BalanceOutlined from '@mui/icons-material/BalanceOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import type { Permission } from '../api/types';

export interface NavItem {
  label: string; // i18n key under nav.
  to: string;
  icon: ReactNode;
  perm: Permission;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const CONSOLE_NAV: NavGroup[] = [
  { items: [{ label: 'overview', to: '/console', icon: <DashboardOutlined />, perm: 'reports.read' }] },
  {
    label: 'operations',
    items: [
      { label: 'trips', to: '/console/trips', icon: <LocalTaxiOutlined />, perm: 'trips.read_all' },
      { label: 'rentals', to: '/console/rentals', icon: <EventOutlined />, perm: 'trips.read_all' },
    ],
  },
  {
    label: 'pricing',
    items: [
      { label: 'rideRates', to: '/console/pricing/ride', icon: <PaymentsOutlined />, perm: 'fares.read' },
      { label: 'rentalRates', to: '/console/pricing/rental', icon: <CarRentalOutlined />, perm: 'fares.read' },
      { label: 'zones', to: '/console/pricing/zones', icon: <PlaceOutlined />, perm: 'fares.read' },
      { label: 'routeFares', to: '/console/pricing/routes', icon: <AltRouteOutlined />, perm: 'fares.read' },
      { label: 'simulator', to: '/console/pricing/simulator', icon: <CalculateOutlined />, perm: 'fares.read' },
    ],
  },
  { items: [{ label: 'matching', to: '/console/matching', icon: <HubOutlined />, perm: 'settings.read' }] },
  {
    label: 'people',
    items: [
      { label: 'drivers', to: '/console/drivers', icon: <BadgeOutlined />, perm: 'drivers.read' },
      { label: 'customers', to: '/console/customers', icon: <PeopleOutlined />, perm: 'users.read' },
    ],
  },
  {
    label: 'growth',
    items: [
      { label: 'promotions', to: '/console/promotions', icon: <LocalOfferOutlined />, perm: 'promotions.read' },
      { label: 'sparks', to: '/console/sparks', icon: <AutoAwesomeOutlined />, perm: 'settings.read' },
      { label: 'support', to: '/console/support', icon: <SupportAgentOutlined />, perm: 'support.manage' },
    ],
  },
  {
    label: 'reports',
    items: [
      { label: 'reports', to: '/console/reports', icon: <BarChartOutlined />, perm: 'reports.read' },
      { label: 'fairness', to: '/console/reports/fairness', icon: <BalanceOutlined />, perm: 'reports.read' },
    ],
  },
  {
    label: 'settings',
    items: [
      { label: 'settings', to: '/console/settings', icon: <TuneOutlined />, perm: 'settings.read' },
      { label: 'audit', to: '/console/audit', icon: <HistoryOutlined />, perm: 'audit.read' },
    ],
  },
];

/** First console page this user may open (operations staff may not have reports.read). */
export const firstConsolePath = (can: (p: Permission) => boolean) =>
  CONSOLE_NAV.flatMap((g) => g.items).find((i) => can(i.perm))?.to ?? '/book';
