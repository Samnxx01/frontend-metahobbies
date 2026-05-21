import { apiFetch } from '@/app/services/api';
import type {
  GobernanzaModuloMenuResponse,
  GobernanzaModuloFiltrosOpcionesResponse,
  GobernanzaModuloRutasOpcionesResponse,
  GobernanzaModuloSembrarResponse,
  GobernanzaModulosCatalogoResponse,
} from './gobernanzaModuloApiTypes';

const CATALOGO_PATH = '/api/config/global/gobernanza/modulos/catalogo';
const MENU_PATH = '/api/config/global/gobernanza/modulos/menu';
const UPSERT_PATH = '/api/config/global/gobernanza/modulos/upsert';
const RUTAS_OPCIONES_PATH = '/api/config/global/gobernanza/modulos/rutas-opciones';
const FILTROS_OPCIONES_PATH = '/api/config/global/gobernanza/modulos/filtros-opciones';
const SEMBRAR_PATH = '/api/config/global/gobernanza/modulos/sembrar';

export async function fetchGobernanzaModulosCatalogo(): Promise<GobernanzaModulosCatalogoResponse> {
  const payload = await apiFetch(CATALOGO_PATH, {
    method: 'POST',
    body: {},
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudo cargar el catálogo de gobernanza');
  }

  return payload as GobernanzaModulosCatalogoResponse;
}

export async function fetchGobernanzaModuloMenu(modulo: string): Promise<GobernanzaModuloMenuResponse> {
  const payload = await apiFetch(MENU_PATH, {
    method: 'POST',
    body: { modulo },
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudo cargar el menú del módulo');
  }

  return payload as GobernanzaModuloMenuResponse;
}

export async function upsertGobernanzaModulo(
  body: Record<string, unknown> | { modulos: Record<string, unknown>[] }
): Promise<unknown> {
  const payload = await apiFetch(UPSERT_PATH, {
    method: 'POST',
    body,
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudo guardar el módulo de gobernanza');
  }

  return payload;
}

export async function fetchGobernanzaTenantMenu(modulo = 'tenant'): Promise<GobernanzaModuloMenuResponse> {
  return fetchGobernanzaModuloMenu(modulo);
}

export async function fetchGobernanzaModuloFiltrosOpciones(
  tenantSuperAdminId?: string
): Promise<GobernanzaModuloFiltrosOpcionesResponse['data']> {
  const payload = await apiFetch(FILTROS_OPCIONES_PATH, {
    method: 'POST',
    body: tenantSuperAdminId ? { tenantSuperAdminId } : {},
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudieron cargar opciones de filtros');
  }

  return (payload as GobernanzaModuloFiltrosOpcionesResponse).data;
}

export async function fetchGobernanzaModuloRutasOpciones(
  slug?: string
): Promise<GobernanzaModuloRutasOpcionesResponse['data']> {
  const payload = await apiFetch(RUTAS_OPCIONES_PATH, {
    method: 'POST',
    body: slug ? { slug } : {},
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudieron cargar las rutas de gobernanza');
  }

  return (payload as GobernanzaModuloRutasOpcionesResponse).data;
}

export async function sembrarGobernanzaModulosCatalogo(): Promise<GobernanzaModuloSembrarResponse['data']> {
  const payload = await apiFetch(SEMBRAR_PATH, {
    method: 'POST',
    body: {},
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudo sembrar el catálogo de gobernanza');
  }

  return (payload as GobernanzaModuloSembrarResponse).data;
}

const DESACTIVAR_PATH = '/api/config/global/gobernanza/modulos/desactivar';

export async function desactivarGobernanzaModulo(slug: string): Promise<unknown> {
  const payload = await apiFetch(DESACTIVAR_PATH, {
    method: 'POST',
    body: { slug },
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudo desactivar el módulo');
  }

  return payload;
}
