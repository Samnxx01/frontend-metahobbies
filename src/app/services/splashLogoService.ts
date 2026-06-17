import { apiFetch } from '@/app/services/api';

export interface SplashLogoPayload {
  id?: string;
  nombre?: string;
  mimetype?: string;
  size?: number;
  base64?: string;
  dataUrl?: string;
  imageUrl?: string;
  url?: string;
  logoUrl?: string;
}

export interface SplashLogoResponse {
  ok?: boolean;
  logo?: SplashLogoPayload;
}

const CACHE_TTL_MS = 60_000;

type CacheEntry = { at: number; data: SplashLogoResponse | null };
const memoryCache = new Map<'auth' | 'anon', CacheEntry>();
const inflight = new Map<'auth' | 'anon', Promise<SplashLogoResponse | null>>();

const resolveMode = (useAuth: boolean): 'auth' | 'anon' => (useAuth ? 'auth' : 'anon');

export const resolveSplashLogoUrl = (logo?: SplashLogoPayload | null): string | null => {
  if (!logo) return null;
  if (typeof logo.dataUrl === 'string' && logo.dataUrl.trim()) return logo.dataUrl.trim();
  if (typeof logo.url === 'string' && logo.url.trim()) return logo.url.trim();
  if (typeof logo.imageUrl === 'string' && logo.imageUrl.trim()) return logo.imageUrl.trim();
  if (typeof logo.logoUrl === 'string' && logo.logoUrl.trim()) return logo.logoUrl.trim();
  if (
    typeof logo.base64 === 'string'
    && logo.base64.trim()
    && typeof logo.mimetype === 'string'
    && logo.mimetype.trim()
  ) {
    return `data:${logo.mimetype.trim()};base64,${logo.base64.trim()}`;
  }
  return null;
};

const isValidSplashLogoResponse = (data: SplashLogoResponse | null | undefined): boolean =>
  Boolean(data?.ok && data?.logo && resolveSplashLogoUrl(data.logo));

export const fetchSplashLogo = async (
  useAuth = false,
  options: { forceRefresh?: boolean } = {}
): Promise<SplashLogoResponse | null> => {
  const mode = resolveMode(useAuth);
  const forceRefresh = options.forceRefresh === true;

  if (!forceRefresh) {
    const cached = memoryCache.get(mode);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS && isValidSplashLogoResponse(cached.data)) {
      return cached.data;
    }
  }

  const pending = inflight.get(mode);
  if (pending && !forceRefresh) return pending;

  const promise = apiFetch('/api/config/parametrizacion/listar/logos/coporativo', {
    method: 'GET',
    useAuth,
    logoutOn401: false,
  })
    .then((response) => (response as SplashLogoResponse | null))
    .catch(() => null)
    .finally(() => {
      inflight.delete(mode);
    });

  inflight.set(mode, promise);

  const data = await promise;
  if (isValidSplashLogoResponse(data)) {
    memoryCache.set(mode, { at: Date.now(), data });
  } else {
    memoryCache.delete(mode);
  }
  return data;
};

/** Fuerza petición al logo y devuelve la URL lista para <img src>, o null si no hay logo válido. */
export const loadSplashLogoUrl = async (useAuth = false): Promise<string | null> => {
  const response = await fetchSplashLogo(useAuth, { forceRefresh: true });
  return resolveSplashLogoUrl(response?.logo);
};

export const invalidateSplashLogoCache = (): void => {
  memoryCache.clear();
  inflight.clear();
};
