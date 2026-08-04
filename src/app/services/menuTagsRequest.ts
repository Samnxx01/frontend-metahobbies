import { apiFetch } from './api';

const TTL_MS = 300_000;
const cache = new Map<string, { at: number; promise: Promise<any> }>();

/** Deduplica resoluciones de menú entre LayoutRoutes, Navbar y AdminNavbar. */
export const fetchResolvedMenuTags = (menuTipo = 'USER_DROPDOWN'): Promise<any> => {
  const normalized = String(menuTipo || 'USER_DROPDOWN').trim().toUpperCase();
  const sessionKey = `${normalized}|${String(localStorage.getItem('token') || '')}`;
  const now = Date.now();
  const cached = cache.get(sessionKey);
  if (cached && now - cached.at < TTL_MS) return cached.promise;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
  const promise = apiFetch(
    `${apiBaseUrl}/seguridad/rutas/menu-tags/resolver/actual?menuTipo=${encodeURIComponent(normalized)}`,
    { method: 'GET', useAuth: true, logoutOn401: false },
  ).catch((error) => {
    if (cache.get(sessionKey)?.promise === promise) cache.delete(sessionKey);
    throw error;
  });

  cache.set(sessionKey, { at: now, promise });
  return promise;
};

export const invalidateResolvedMenuTagsCache = (): void => cache.clear();
