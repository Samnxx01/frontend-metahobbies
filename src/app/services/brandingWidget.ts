import { apiFetch } from '@/app/services/api';
import { persistBrandingCache } from '@/app/services/brandingCache';

export interface BrandingPalette {
  [key: string]: string | undefined;
}

export interface BrandingConfig {
  tipografia?: {
    fontFamilyBase?: string;
    fontFamilyHeading?: string;
    extras?: Record<string, string>;
  };
  paleta?: {
    light?: BrandingPalette;
    dark?: BrandingPalette;
    extras?: Record<string, string>;
  };
  botones?: {
    radius?: string;
    fontWeight?: string;
    extras?: Record<string, string>;
  };
  widgets?: {
    routes?: Array<Record<string, unknown>>;
    navigation?: {
      login?: { path?: string; enabled?: boolean };
      postLogin?: { path?: string; enabled?: boolean };
      logout?: { path?: string; enabled?: boolean };
      register?: { path?: string; enabled?: boolean };
      forgotPassword?: { path?: string; enabled?: boolean };
      publicHome?: { path?: string; enabled?: boolean };
      allowedPaths?: string[];
    };
    [key: string]: unknown;
  };
  tokens?: Record<string, string>;
}

interface BrandingResponse {
  ok: boolean;
  branding?: BrandingConfig;
}

export interface BrandingScopeParams {
  tenantGlobalId?: string | null;
}

export interface AccionBackend {
  _id?: string;
  iud?: string;
  etiquetas?: string;
  method?: string;
  estadoAccion?: boolean;
}

export const obtenerBrandingPublico = async (): Promise<BrandingConfig | null> => {
  const response = (await apiFetch('/api/config/parametrizacion/widget/branding/publico', {
    method: 'GET',
    useAuth: false,
    logoutOn401: false
  })) as BrandingResponse | null;

  if (!response?.ok || !response.branding) {
    return null;
  }

  persistBrandingCache(response.branding);
  return response.branding;
};

const buildBrandingScopeQuery = (params?: BrandingScopeParams): string => {
  const query = new URLSearchParams();
  const tenantGlobalId = String(params?.tenantGlobalId || '').trim();
  if (tenantGlobalId) {
    query.set('tenantGlobalId', tenantGlobalId);
  }

  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

export const obtenerBrandingPrivado = async (params?: BrandingScopeParams): Promise<BrandingConfig | null> => {
  const response = (await apiFetch(`/api/config/parametrizacion/widget/branding${buildBrandingScopeQuery(params)}`, {
    method: 'GET',
    useAuth: true
  })) as BrandingResponse | null;

  if (!response?.ok || !response.branding) {
    return null;
  }

  persistBrandingCache(response.branding);
  return response.branding;
};

export const guardarBrandingPrivado = async (
  branding: BrandingConfig,
  params?: BrandingScopeParams
): Promise<BrandingConfig | null> => {
  const response = (await apiFetch(`/api/config/parametrizacion/widget/branding${buildBrandingScopeQuery(params)}`, {
    method: 'PUT',
    useAuth: true,
    body: branding
  })) as BrandingResponse | null;

  if (!response?.ok || !response.branding) {
    return null;
  }

  persistBrandingCache(response.branding);
  return response.branding;
};

export const obtenerAccionesWidgetPublico = async (): Promise<AccionBackend[]> => {
  const response = await apiFetch('/api/config/parametrizacion/widget/branding/acciones/publico', {
    method: 'GET',
    useAuth: false,
    logoutOn401: false
  }) as { ok?: boolean; acciones?: AccionBackend[] } | null;

  if (!response?.ok) return [];
  return Array.isArray(response.acciones) ? response.acciones : [];
};

export const obtenerAccionesWidgetPrivado = async (): Promise<{
  accionesTenant: AccionBackend[];
  accionesSistema: AccionBackend[];
}> => {
  const response = await apiFetch('/api/config/parametrizacion/widget/branding/acciones', {
    method: 'GET',
    useAuth: true
  }) as {
    ok?: boolean;
    accionesTenant?: AccionBackend[];
    accionesSistema?: AccionBackend[];
  } | null;

  if (!response?.ok) {
    return { accionesTenant: [], accionesSistema: [] };
  }

  return {
    accionesTenant: Array.isArray(response.accionesTenant) ? response.accionesTenant : [],
    accionesSistema: Array.isArray(response.accionesSistema) ? response.accionesSistema : []
  };
};
