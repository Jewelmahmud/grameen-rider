import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './auth/AuthProvider';
import { FullPageSpinner, GuestOnly, RequireAuth, RequirePermission } from './auth/guards';
import { ConsoleLayout } from './layouts/ConsoleLayout';
import { CustomerLayout } from './layouts/CustomerLayout';
import { firstConsolePath } from './layouts/nav';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyPhonePage } from './pages/auth/VerifyPhonePage';
import type { Permission } from './api/types';

const BookPage = lazy(() => import('./pages/book/BookPage'));
const TripPage = lazy(() => import('./pages/book/TripPage'));
const MyTripsPage = lazy(() => import('./pages/book/MyTripsPage'));
const ProfilePage = lazy(() => import('./pages/book/ProfilePage'));

const OverviewPage = lazy(() => import('./pages/console/OverviewPage'));
const TripsPage = lazy(() => import('./pages/console/TripsPage'));
const TripDetailPage = lazy(() => import('./pages/console/TripDetailPage'));
const RentalsPage = lazy(() => import('./pages/console/RentalsPage'));
const RatesPage = lazy(() => import('./pages/console/RatesPage'));
const ZonesPage = lazy(() => import('./pages/console/ZonesPage'));
const RouteFaresPage = lazy(() => import('./pages/console/RouteFaresPage'));
const SimulatorPage = lazy(() => import('./pages/console/SimulatorPage'));
const SettingsPage = lazy(() => import('./pages/console/SettingsPage'));
const DriversPage = lazy(() => import('./pages/console/DriversPage'));
const DriverDetailPage = lazy(() => import('./pages/console/DriverDetailPage'));
const CustomersPage = lazy(() => import('./pages/console/CustomersPage'));
const PromotionsPage = lazy(() => import('./pages/console/PromotionsPage'));
const SupportPage = lazy(() => import('./pages/console/SupportPage'));
const ReportsPage = lazy(() => import('./pages/console/ReportsPage'));
const FairnessPage = lazy(() => import('./pages/console/FairnessPage'));
const AuditPage = lazy(() => import('./pages/console/AuditPage'));

const guard = (perm: Permission, el: React.ReactNode) => <RequirePermission perm={perm}>{el}</RequirePermission>;

function ConsoleHome() {
  const { can } = useAuth();
  return can('reports.read') ? <OverviewPage /> : <Navigate to={firstConsolePath((p) => can(p))} replace />;
}

function Root() {
  const { status, me } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  return <Navigate to={status === 'authenticated' ? homeFor(me) : '/login'} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/verify-phone" element={<VerifyPhonePage />} />

        <Route path="/book" element={<RequireAuth><CustomerLayout /></RequireAuth>}>
          <Route index element={<BookPage />} />
          <Route path="trips" element={<MyTripsPage />} />
          <Route path="trips/:id" element={<TripPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/console" element={<RequireAuth staff><ConsoleLayout /></RequireAuth>}>
          <Route index element={<ConsoleHome />} />
          <Route path="trips" element={guard('trips.read_all', <TripsPage />)} />
          <Route path="trips/:id" element={guard('trips.read_all', <TripDetailPage />)} />
          <Route path="rentals" element={guard('trips.read_all', <RentalsPage />)} />
          <Route path="pricing/ride" element={guard('fares.read', <RatesPage service="ride" />)} />
          <Route path="pricing/rental" element={guard('fares.read', <RatesPage service="rental" />)} />
          <Route path="pricing/zones" element={guard('fares.read', <ZonesPage />)} />
          <Route path="pricing/routes" element={guard('fares.read', <RouteFaresPage />)} />
          <Route path="pricing/simulator" element={guard('fares.read', <SimulatorPage />)} />
          <Route path="matching" element={guard('settings.read', <SettingsPage group="matching" />)} />
          <Route path="sparks" element={guard('settings.read', <SettingsPage group="perks" />)} />
          <Route path="settings" element={guard('settings.read', <SettingsPage group="general" />)} />
          <Route path="drivers" element={guard('drivers.read', <DriversPage />)} />
          <Route path="drivers/:id" element={guard('drivers.read', <DriverDetailPage />)} />
          <Route path="customers" element={guard('users.read', <CustomersPage />)} />
          <Route path="promotions" element={guard('promotions.read', <PromotionsPage />)} />
          <Route path="support" element={guard('support.manage', <SupportPage />)} />
          <Route path="reports" element={guard('reports.read', <ReportsPage />)} />
          <Route path="reports/fairness" element={guard('reports.read', <FairnessPage />)} />
          <Route path="audit" element={guard('audit.read', <AuditPage />)} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
