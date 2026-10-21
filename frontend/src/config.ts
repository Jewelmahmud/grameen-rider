export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:5006/api';

export const APP_ROLES = [
  'admin',
  'super_admin',
  'grameen_ride_branch_admin',
  'grameen_ride_operations',
  'grameen_ride_admin',
  'customer',
  'grameen_ride_driver',
] as const;
