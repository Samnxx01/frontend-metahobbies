import type { BrandingConfig } from '@/app/services/brandingWidget';
import { readCachedBranding } from '@/app/services/brandingCache';
import { normalizeRoutePath } from '@/app/services/routePathNormalizer';

export type GovernedNavigationAction =
  | 'login'
  | 'postLogin'
  | 'logout'
  | 'register'
  | 'forgotPassword'
  | 'publicHome';

export interface GovernedNavigationEntry {
  path?: string;
  enabled?: boolean;
}

export interface GovernedNavigationConfig {
  login?: GovernedNavigationEntry;
  postLogin?: GovernedNavigationEntry;
  logout?: GovernedNavigationEntry;
  register?: GovernedNavigationEntry;
  forgotPassword?: GovernedNavigationEntry;
  publicHome?: GovernedNavigationEntry;
  allowedPaths?: string[];
}

const DEFAULT_PATHS: Record<GovernedNavigationAction, string> = {
  login: '/public/render/login',
  postLogin: '/admin',
  logout: '/admin',
  register: '/public/render/registro-cliente',
  forgotPassword: '/recuperar-contrasena',
  publicHome: '/public/render/home',
};

const isSafeInternalPath = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (/^https?:/i.test(value)) return false;
  return true;
};

const getNavigationConfig = (branding?: BrandingConfig | null): GovernedNavigationConfig => {
  const widgets = branding?.widgets as { navigation?: GovernedNavigationConfig } | undefined;
  return widgets?.navigation || {};
};

const isAllowedByGovernance = (path: string, allowedPaths: string[]): boolean => {
  if (allowedPaths.length === 0) return true;
  const normalizedPath = normalizeRoutePath(path);
  return allowedPaths.map((item) => normalizeRoutePath(item)).includes(normalizedPath);
};

const isDisallowedRootForAction = (
  action: GovernedNavigationAction,
  path: string
): boolean => {
  if (path !== '/') return false;
  return true;
};

export const getGovernedPath = (
  action: GovernedNavigationAction,
  options?: {
    branding?: BrandingConfig | null;
    fallback?: string;
  }
): string => {
  const fallback = options?.fallback || DEFAULT_PATHS[action];
  const normalizedFallback = normalizeRoutePath(fallback);
  const branding = options?.branding ?? readCachedBranding();
  const config = getNavigationConfig(branding);
  const entry = config[action];
  const allowedPaths = Array.isArray(config.allowedPaths)
    ? config.allowedPaths.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  if (entry?.enabled === false) return normalizedFallback;

  const candidate = String(entry.path || '').trim();
  if (!isSafeInternalPath(candidate)) return normalizedFallback;

  const normalizedCandidate = normalizeRoutePath(candidate);
  if (isDisallowedRootForAction(action, normalizedCandidate)) return normalizedFallback;
  if (!isAllowedByGovernance(normalizedCandidate, allowedPaths)) return normalizedFallback;

  return normalizedCandidate;
};

export const getGovernedLoginPath = (): string => getGovernedPath('login');
export const getGovernedPostLoginPath = (): string => getGovernedPath('postLogin');
export const getGovernedLogoutPath = (): string => getGovernedPath('logout');
export const getGovernedRegisterPath = (): string => getGovernedPath('register');
export const getGovernedForgotPasswordPath = (): string => getGovernedPath('forgotPassword');
export const getGovernedPublicHomePath = (): string => getGovernedPath('publicHome');
