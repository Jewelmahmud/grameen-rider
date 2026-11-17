import { useQuery } from '@tanstack/react-query';
import { meApi } from './api';

/** GET /config/public: vehicle types, payment methods, booking windows, support contact. */
export const usePublicConfig = () => useQuery({ queryKey: ['public-config'], queryFn: meApi.publicConfig, staleTime: 5 * 60_000 });
