import { apiFetch } from '@/app/services/api';
import { getAccionesCatalogo, type AccionOption } from '@/app/services/routesService';
import type {
  GobernanzaFormularioDetalleResponse,
  GobernanzaModuloMenuResponse,
  GobernanzaModuloOperativoResponse,
  GobernanzaModuloFiltrosOpcionesResponse,
  GobernanzaModuloRutasOpcionesResponse,
  GobernanzaModuloSembrarResponse,
  GobernanzaApiConsumoSyncResponse,
  GobernanzaApiConsumoSyncData,
  GobernanzaModulosCatalogoResponse,
  GobernanzaModuloTiposResponse,
  GobernanzaModuloTipoApi,
} from './gobernanzaModuloApiTypes';
import { canonicalGobernanzaTipoSection } from './gobernanzaModuloTipoDefaults';
import { fetchGobernanzaCached, gobernanzaApiCacheKey, invalidateGobernanzaApiCache } from './gobernanzaApiCache';
import type { GobernanzaParametrizacionUi } from './gobernanzaParametrizacionUi';

const CATALOGO_PATH = '/api/config/global/gobernanza/modulos/catalogo';
const CONFIGS_PATH = '/api/config/global/gobernanza/modulos/configs';
const OPERATIVO_PATH = '/api/config/global/gobernanza/modulos/operativo';
const PARAMETRIZACION_UI_PATH = '/api/config/global/gobernanza/modulos/parametrizacion-ui';
const UPSERT_PATH = '/api/config/global/gobernanza/modulos/upsert';
const RUTAS_OPCIONES_PATH = '/api/config/global/gobernanza/modulos/rutas-opciones';
const FORMULARIO_DETALLE_PATH = '/api/config/global/gobernanza/modulos/formulario-detalle';
const FILTROS_OPCIONES_PATH = '/api/config/global/gobernanza/modulos/filtros-opciones';
const SEMBRAR_PATH = '/api/config/global/gobernanza/modulos/sembrar';
const SINCRONIZAR_API_CONSUMO_PATH = '/api/config/global/gobernanza/modulos/sincronizar-api-consumo';
const TIPOS_PATH = '/api/config/global/gobernanza/modulos/tipos';
const TIPOS_SECTIONS_PATH = '/api/config/global/gobernanza/modulos/tipos/sections';
const TIPOS_UPSERT_PATH = '/api/config/global/gobernanza/modulos/tipos/upsert';

let parametrizacionUiMemory: GobernanzaParametrizacionUi | null = null;

export function seedGobernanzaParametrizacionUiCache(ui: GobernanzaParametrizacionUi | null | undefined): void {
  if (ui && typeof ui === 'object') {
    parametrizacionUiMemory = ui;
  }
}

export function peekGobernanzaParametrizacionUiCache(): GobernanzaParametrizacionUi | null {
  return parametrizacionUiMemory;
}

export async function fetchGobernanzaAccionesCatalogo(): Promise<AccionOption[]> {
  const res = await getAccionesCatalogo();
  return Array.isArray(res.data) ? res.data.filter((row) => row.estadoAccion !== false) : [];
}

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

export type FetchGobernanzaModuloMenuOptions = {
  modulo?: string;
  menuPath?: string;
};

export type FetchGobernanzaModuloOperativoOptions = {
  section?: string;
  modulo?: string;
  menuPath?: string;
  /** Hub contenedor (PermisosGlobal): lista tarjetas de gobernanzaModuloConfigs, no la ruta hub. */
  hubOperaciones?: boolean;
  /** Filtra configs por gobernanzaModuloTipos.section (p. ej. gobernanza en TenantSuperAdmin). */
  tipoSection?: string | null;
};

/** GET directo desde gobernanzaModuloConfigs (acciones + formularios para la vista). */
export async function fetchGobernanzaModuloOperativo(
  opts: string | FetchGobernanzaModuloOperativoOptions
): Promise<GobernanzaModuloOperativoResponse> {
  const section =
    typeof opts === 'string'
      ? opts.trim()
      : String(opts.section || opts.modulo || 'permisos').trim();
  const menuPath =
    typeof opts === 'string' ? '' : String(opts.menuPath || '').trim();
  const hubOperaciones =
    typeof opts === 'string' ? false : opts.hubOperaciones === true;
  const tipoSectionRaw =
    typeof opts === 'string' ? '' : String(opts.tipoSection || '').trim();
  const tipoSection = tipoSectionRaw ? canonicalGobernanzaTipoSection(tipoSectionRaw) : '';
  const params = new URLSearchParams({ section });
  if (menuPath) params.set('menuPath', menuPath);
  if (hubOperaciones) params.set('hubOperaciones', '1');
  if (tipoSection) params.set('tipoSection', tipoSection);
  const url = `${OPERATIVO_PATH}?${params.toString()}`;

  const payload = await fetchGobernanzaCached(
    gobernanzaApiCacheKey({
      operativo: true,
      section,
      menuPath: menuPath || null,
      hubOperaciones,
      tipoSection: tipoSection || null,
    }),
    async () =>
      apiFetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
  );

  if (!payload || (payload as { ok?: boolean }).ok === false) {
    const msg = (payload as { msg?: string })?.msg || 'No se pudo cargar gobernanzaModuloConfigs';
    throw new Error(msg);
  }

  const response = payload as GobernanzaModuloOperativoResponse;
  seedGobernanzaParametrizacionUiCache(response.parametrizacionUi);
  return response;
}

/** GET conjuntos UI (ocultar panel, reglas, jerarquía…) desde gobernanzaModuloConfigs. */
export async function fetchGobernanzaParametrizacionUi(): Promise<
  import('./gobernanzaParametrizacionUi').GobernanzaParametrizacionUi
> {
  if (parametrizacionUiMemory) {
    return parametrizacionUiMemory;
  }

  const payload = await fetchGobernanzaCached('parametrizacion-ui', async () =>
    apiFetch(PARAMETRIZACION_UI_PATH, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
  );

  if (!payload || (payload as { ok?: boolean }).ok === false) {
    throw new Error((payload as { msg?: string })?.msg || 'No se pudo cargar parametrización UI');
  }

  const ui = (payload as { parametrizacionUi?: unknown }).parametrizacionUi;
  if (!ui || typeof ui !== 'object') {
    throw new Error('Respuesta de parametrización UI inválida');
  }

  seedGobernanzaParametrizacionUiCache(ui as GobernanzaParametrizacionUi);
  return ui as import('./gobernanzaParametrizacionUi').GobernanzaParametrizacionUi;
}

/** GET crudo de gobernanzaModuloConfigs por sección. */
export async function fetchGobernanzaModuloConfigs(
  section: string,
  opts?: { tipoSection?: string | null }
): Promise<{ ok: boolean; configs: GobernanzaModuloOperativoResponse['configs'] }> {
  const params = new URLSearchParams({ section: section.trim() });
  const tipoSection = String(opts?.tipoSection || '').trim();
  if (tipoSection) {
    params.set('tipoSection', canonicalGobernanzaTipoSection(tipoSection));
  }
  const cacheKey = gobernanzaApiCacheKey({
    configs: true,
    section: section.trim(),
    tipoSection: tipoSection || null,
  });
  const payload = await fetchGobernanzaCached(cacheKey, async () =>
    apiFetch(
      `${CONFIGS_PATH}?${params.toString()}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      }
    )
  );

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudo cargar gobernanzaModuloConfigs');
  }

  return payload as { ok: boolean; configs: GobernanzaModuloOperativoResponse['configs'] };
}

/** GET sections distintas ya creadas en gobernanzaModuloTipos. */
export async function fetchGobernanzaModuloTiposSections(): Promise<string[]> {
  const payload = await apiFetch(TIPOS_SECTIONS_PATH, {
    method: 'GET',
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudieron cargar las sections de tipos');
  }

  const sections = Array.isArray((payload as { sections?: unknown }).sections)
    ? (payload as { sections: unknown[] }).sections
    : [];
  return sections.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean);
}

/** GET gobernanzaModuloTipos por sección (colección independiente). */
export async function fetchGobernanzaModuloTipos(
  section: string
): Promise<GobernanzaModuloTiposResponse> {
  const sectionKey = canonicalGobernanzaTipoSection(section);
  const payload = await apiFetch(
    `${TIPOS_PATH}?section=${encodeURIComponent(sectionKey)}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    }
  );

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudieron cargar los tipos de módulo');
  }

  return payload as GobernanzaModuloTiposResponse;
}

export type UpsertGobernanzaModuloTipoPayload = {
  /** Id Mongo del tipo existente (actualiza por _id, no solo por codigo+section). */
  id?: string;
  tipoId?: string;
  section: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  formularioComponent?: string;
  endpointId?: string;
  orden?: number;
};

export async function upsertGobernanzaModuloTipo(
  body: UpsertGobernanzaModuloTipoPayload
): Promise<GobernanzaModuloTipoApi> {
  const payload = await apiFetch(TIPOS_UPSERT_PATH, {
    method: 'POST',
    body,
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudo guardar el tipo de módulo');
  }

  return (payload as { tipo: GobernanzaModuloTipoApi }).tipo;
}

export async function fetchGobernanzaModuloMenu(
  opts: string | FetchGobernanzaModuloMenuOptions
): Promise<GobernanzaModuloMenuResponse> {
  const modulo =
    typeof opts === 'string' ? opts.trim() : String(opts.modulo || 'permisos').trim();
  const menuPath = typeof opts === 'string' ? '' : String(opts.menuPath || '').trim();
  if (menuPath) {
    return fetchGobernanzaModuloOperativo({ section: modulo, menuPath });
  }
  return fetchGobernanzaModuloOperativo(modulo);
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

  invalidateGobernanzaApiCache();
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

export async function fetchGobernanzaModuloFormularioDetalle(
  rutaId: string
): Promise<GobernanzaFormularioDetalleResponse['data']> {
  const payload = await apiFetch(FORMULARIO_DETALLE_PATH, {
    method: 'POST',
    body: { rutaId, formularioId: rutaId },
  });

  if (!payload || payload.ok === false) {
    throw new Error(payload?.msg || 'No se pudo cargar el formulario');
  }

  return (payload as GobernanzaFormularioDetalleResponse).data;
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

export async function sincronizarGobernanzaApiConsumo(): Promise<GobernanzaApiConsumoSyncData> {
  const payload = await apiFetch(SINCRONIZAR_API_CONSUMO_PATH, {
    method: 'POST',
    body: {},
  });

  if (!payload || (payload as GobernanzaApiConsumoSyncResponse).ok === false) {
    throw new Error((payload as GobernanzaApiConsumoSyncResponse)?.msg || 'No se pudo sincronizar apiconsumosfrontend');
  }

  const data = (payload as GobernanzaApiConsumoSyncResponse).data;
  if (!data) {
    throw new Error('Respuesta de sincronización sin datos');
  }
  return data;
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
