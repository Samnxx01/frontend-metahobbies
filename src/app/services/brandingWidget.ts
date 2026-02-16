import { apiFetch } from '@/app/services/api';

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
  widgets?: Record<string, unknown>;
  tokens?: Record<string, string>;
}

interface BrandingResponse {
  ok: boolean;
  branding?: BrandingConfig;
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

  return response.branding;
};

export const obtenerBrandingPrivado = async (): Promise<BrandingConfig | null> => {
  const response = (await apiFetch('/api/config/parametrizacion/widget/branding', {
    method: 'GET',
    useAuth: true
  })) as BrandingResponse | null;

  if (!response?.ok || !response.branding) {
    return null;
  }

  return response.branding;
};

export const guardarBrandingPrivado = async (branding: BrandingConfig): Promise<BrandingConfig | null> => {
  const response = (await apiFetch('/api/config/parametrizacion/widget/branding', {
    method: 'PUT',
    useAuth: true,
    body: branding
  })) as BrandingResponse | null;

  if (!response?.ok || !response.branding) {
    return null;
  }

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
