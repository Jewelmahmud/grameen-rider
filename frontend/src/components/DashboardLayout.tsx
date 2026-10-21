import { useEffect, useState, type PropsWithChildren } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { APP_ROLES } from '../config';
import type { AppRole } from '../types';
import { useAuth } from '../state/AuthContext';

const NAV_ITEMS: {
  to: string;
  label: string;
  icon: 'home' | 'car' | 'doc' | 'heart' | 'clock' | 'bell' | 'chat';
  match: string[];
}[] = [
  { to: '/', label: 'হোম', icon: 'home', match: ['/'] },
  { to: '/dashboard', label: 'যানবাহন ভাড়া', icon: 'car', match: ['/dashboard'] },
  { to: '/trips', label: 'ট্রিপ', icon: 'car', match: ['/trips'] },
  { to: '/api-playground', label: 'নোট', icon: 'doc', match: ['/api-playground'] },
  { to: '/dashboard', label: 'ফেভারিটস', icon: 'heart', match: [] },
  { to: '/dashboard', label: 'সাম্প্রতিক', icon: 'clock', match: [] },
  { to: '/dashboard', label: 'নোটিফিকেশন', icon: 'bell', match: [] },
  { to: '/dashboard', label: 'চ্যাট', icon: 'chat', match: [] },
];

function NavIcon({ name }: { name: (typeof NAV_ITEMS)[0]['icon'] }) {
  const size = 20;
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'car':
      return <svg {...common}><path d="M5 17h14v-3l-1.5-4.5A2 2 0 0015.6 8H8.4a2 2 0 00-1.9 1.4L5 14v3zM5 17l-1 1M19 17l1 1M9 19h1M15 19h1" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'doc':
      return <svg {...common}><path d="M9 3h6l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 3v4h4" /></svg>;
    case 'heart':
      return <svg {...common}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>;
    case 'bell':
      return <svg {...common}><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'chat':
      return <svg {...common}><path d="M4 4h16v10H8l-4 4V4z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    default:
      return null;
  }
}

export const DashboardLayout = ({ children }: PropsWithChildren) => {
  const { user, availableRoles, selectedRole, setSelectedRole, logout } = useAuth();
  const { pathname } = useLocation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="db-app">
      <aside className="db-sidebar" aria-label="Main navigation">
        <Link to="/dashboard" className="db-brand">
          <span className="db-brand__mark" />
          <span className="db-brand__text">Grameen Ride</span>
        </Link>

        <nav className="db-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match.includes(pathname);
            return (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              className={isActive ? 'db-nav__link db-nav__link--active' : 'db-nav__link'}
            >
              <span className="db-nav__icon" aria-hidden>
                <NavIcon name={item.icon} />
              </span>
              <span className="db-nav__label">{item.label}</span>
            </NavLink>
            );
          })}
        </nav>

        <div className="db-sidebar__footer">
          <div className="db-role">
            <label htmlFor="dbRole">রোল</label>
            <select
              id="dbRole"
              value={selectedRole || ''}
              onChange={(e) => setSelectedRole(e.target.value as AppRole)}
            >
              {APP_ROLES.filter((r) => availableRoles.length === 0 || availableRoles.includes(r)).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="db-btn-logout" onClick={logout}>
            লগআউট
          </button>
          {user && (
            <p className="db-user-hint">
              {user.firstName} {user.lastName}
            </p>
          )}
        </div>
      </aside>

      <div className="db-main-wrap">
        <header className="db-topbar">
          <div className="db-topbar__meta">
            <span className="db-topbar__time">
              {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="db-topbar__tz">{Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'}</span>
          </div>
          <div className="db-topbar__location">
            <span className="db-topbar__loc-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </span>
            <span>ঢাকা, বাংলাদেশ</span>
          </div>
        </header>

        <div className="db-content">{children}</div>
      </div>
    </div>
  );
};
