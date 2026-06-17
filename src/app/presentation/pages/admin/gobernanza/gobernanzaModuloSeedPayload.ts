import { GOBERNANZA_MODULOS_CATALOGO } from './gobernanzaModulosCatalog';
import { normalizarGobernanzaEndpointId } from './gobernanzaActionIds';
import { normalizarGobernanzaRefId } from './gobernanzaEntityId';
import {
  accionesPayloadDesdeEndpointIds,
  catalogoAccionesPorModuloSlug,
  endpointSpecToAccionPayload,
  endpointsPorSection,
  ENDPOINTS_BY_ID,
} from './gobernanzaEndpointCatalog';
import type { GobernanzaModuloConfigApi } from './gobernanzaModuloApiTypes';
import type { GobernanzaAccionCatalogItem } from './gobernanzaModuloParametrizarOpciones';
import { accionesCatalogDesdeConfig } from './gobernanzaModuloParametrizarOpciones';
import { TENANT_INLINE_FLOW_ENDPOINT_IDS } from './parametrosGobernanzaConstants';
import type { EndpointSpec } from './parametrosGobernanzaTypes';

/** Métodos equivalentes entre rutasSeguridad.acciones y catálogo ENDPOINTS. */
const HTTP_METHOD_ALIASES: Record<string, readonly string[]> = {
  PATCH: ['PATCH', 'PUT'],
  PUT: ['PUT', 'PATCH'],
};

function metodoCoincideCatalogo(catalogMethod: string, formMethod: string): boolean {
  const cat = String(catalogMethod || '').trim().toUpperCase();
  const form = String(formMethod || '').trim().toUpperCase();
  if (!cat || !form) return false;
  if (cat === form) return true;
  const aliases = HTTP_METHOD_ALIASES[form] ?? [form];
  return aliases.includes(cat);
}

function accionesDesdeSection(slug: string): Array<Record<string, unknown>> {
  if (slug === 'tenant') {
    return accionesPayloadDesdeEndpointIds([...TENANT_INLINE_FLOW_ENDPOINT_IDS]);
  }
  return endpointsPorSection(slug).map((e, idx) => endpointSpecToAccionPayload(e, (idx + 1) * 10));
}

function catalogEndpointsParaSlug(slug: string): EndpointSpec[] {
  if (slug === 'tenant') {
    return TENANT_INLINE_FLOW_ENDPOINT_IDS.map((id) => ENDPOINTS_BY_ID[id]).filter(Boolean) as EndpointSpec[];
  }
  return endpointsPorSection(slug);
}

export type GobernanzaModuloRutaBinding = {
  rutaId?: string | null;
  rutaPath?: string | null;
  formularioId?: string | null;
  formularioNombre?: string | null;
  formularioComponent?: string | null;
  tipoId?: string | null;
};

export type GobernanzaModuloFiltrosVistaPayload = {
  tenantSuperAdminIds?: string[];
  tenantGlobalIds?: string[];
  usuarioIds?: string[];
};

export type GobernanzaModuloUpsertCampos = {
  nombre?: string;
  label?: string;
  description?: string;
  menuPath?: string;
  /** Slug de tarjeta existente en gobernanzaModuloConfigs (modo actualizar). */
  cardSlug?: string;
  filtrosVista?: GobernanzaModuloFiltrosVistaPayload;
  acciones?: Array<Record<string, unknown>>;
};

/** Acciones de upsert alineadas al formulario (métodos en rutasSeguridad.acciones) + catálogo ENDPOINTS. */
export function accionesUpsertDesdeFormulario(
  slug: string,
  accionesFormulario: Array<{ method?: string; accionId?: string; title?: string }> = []
): Array<Record<string, unknown>> {
  const catalog = accionesDesdeSection(slug);

  const methods = new Set(
    accionesFormulario
      .map((a) => String(a?.method || '').trim().toUpperCase())
      .filter(Boolean)
  );

  if (!methods.size) return [];

  return catalog.filter((item) =>
    [...methods].some((m) => metodoCoincideCatalogo(String(item.method || ''), m))
  );
}

/** Vista previa: acciones del formulario → endpoints del menú operativo. */
export function previewAccionesMenuDesdeFormulario(
  slug: string,
  accionesFormulario: Array<{ method?: string; accionId?: string; title?: string }> = []
): Array<{ method: string; id: string; title: string; mapeado: boolean }> {
  const mapeados = accionesUpsertDesdeFormulario(slug, accionesFormulario);
  const mapeadosPorMetodo = new Map(
    mapeados.map((item) => [String(item.method || '').toUpperCase(), item])
  );

  return accionesFormulario.map((a) => {
    const method = String(a.method || '').trim().toUpperCase();
    const hit =
      mapeados.find((m) => metodoCoincideCatalogo(String(m.method || ''), method))
      ?? mapeadosPorMetodo.get(method);
    return {
      method,
      id: hit ? String(hit.id || '') : '',
      title: hit ? String(hit.title || '') : String(a.title || method),
      mapeado: Boolean(hit?.id),
    };
  });
}

export function buildAccionesSeleccionInicial(
  accionesFormulario: Array<{ accionId: string; method: string }> = [],
  accionesPublicadas: Array<{ id?: string; method?: string }> = []
): Record<string, boolean> {
  const savedMethods = new Set(
    accionesPublicadas.map((a) => String(a.method || '').trim().toUpperCase()).filter(Boolean)
  );
  const tienePublicadas = savedMethods.size > 0;

  return accionesFormulario.reduce<Record<string, boolean>>((acc, item) => {
    const id = String(item.accionId || '').trim();
    if (!id) return acc;
    acc[id] = tienePublicadas
      ? savedMethods.has(String(item.method || '').trim().toUpperCase())
      : true;
    return acc;
  }, {});
}

export function filtrarAccionesFormularioSeleccionadas<
  T extends { accionId: string },
>(acciones: T[] = [], seleccion: Record<string, boolean> = {}): T[] {
  return acciones.filter((a) => seleccion[String(a.accionId)] === true);
}

/** Catálogo operativo del módulo desde ENDPOINTS por sección (sin ids quemados). */
export function accionesCatalogoModuloPorSlug(
  slug: string
): Array<{ accionId: string; method: string; title: string }> {
  return catalogoAccionesPorModuloSlug(slug);
}

/** Selección inicial desde acciones publicadas en gobernanzaModuloConfigs (por endpoint id). */
export function buildAccionesSeleccionDesdeModuloConfig(
  catalog: Array<{ accionId: string; method?: string }> = [],
  publicadas: Array<{ id?: string; method?: string }> = []
): Record<string, boolean> {
  const publishedIds = new Set(
    publicadas
      .map((a) => normalizarGobernanzaRefId(a.id) || normalizarGobernanzaEndpointId(a.id))
      .filter(Boolean)
  );
  const tienePublicadas = publishedIds.size > 0;

  return catalog.reduce<Record<string, boolean>>((acc, item) => {
    const id = normalizarGobernanzaEndpointId(item.accionId);
    if (!id) return acc;
    acc[id] = tienePublicadas ? publishedIds.has(id) : true;
    return acc;
  }, {});
}

/** Payload de upsert desde ids elegidos (resuelve metadata en ENDPOINTS_BY_ID). */
export function accionesUpsertDesdeEndpointIds(
  _slug: string,
  endpointIds: string[] = []
): Array<Record<string, unknown>> {
  return accionesPayloadDesdeEndpointIds(endpointIds);
}

function indexPathPorAccionId(
  catalog: GobernanzaAccionCatalogItem[] = [],
  configs: GobernanzaModuloConfigApi[] = []
): Map<string, GobernanzaAccionCatalogItem> {
  const byId = new Map<string, GobernanzaAccionCatalogItem>();
  const push = (item: GobernanzaAccionCatalogItem) => {
    const id = String(item.accionId || '').trim();
    if (!id) return;
    const prev = byId.get(id);
    byId.set(id, prev ? { ...prev, ...item, title: item.title || prev.title } : item);
  };
  for (const item of catalog) push(item);
  for (const cfg of configs) {
    for (const item of accionesCatalogDesdeConfig(cfg)) push(item);
  }
  return byId;
}

function pathPorMetodoEnConfigsSeed(
  method: string,
  configs: GobernanzaModuloConfigApi[] = []
): string {
  const meta = String(method || '').trim().toUpperCase();
  if (!meta) return '';
  for (const cfg of configs) {
    for (const item of cfg.accionesCatalog ?? []) {
      if (String(item.method || '').trim().toUpperCase() === meta && item.path) {
        return String(item.path).trim();
      }
    }
  }
  return '';
}

/** Payload de upsert desde colección acciones (+ metadatos publicados en configs). */
export function accionesUpsertDesdeCatalogo(
  catalog: GobernanzaAccionCatalogItem[] = [],
  accionIds: string[] = [],
  configs: GobernanzaModuloConfigApi[] = []
): Array<Record<string, unknown>> {
  const metaById = indexPathPorAccionId(catalog, configs);
  const seen = new Set<string>();
  const out: Array<Record<string, unknown>> = [];

  for (const rawId of accionIds) {
    const id = String(rawId || '').trim();
    if (!id || seen.has(id)) continue;
    const item = metaById.get(id);
    const method = String(item?.method || 'GET').trim().toUpperCase();
    const path = String(item?.path || '').trim();
    if (!path) continue;
    seen.add(id);
    out.push({
      id,
      accionId: id,
      accionRef: id,
      method,
      path,
      title: String(item?.title || id).trim(),
      description: String(item?.description || '').trim(),
      shortLabel: String(item?.shortLabel || item?.title || id).trim(),
      actor: ['tenantSuperAdmin', 'tenantGlobal', 'ambos'].includes(String(item?.actor || ''))
        ? item?.actor
        : 'ambos',
      orden: (out.length + 1) * 10,
    });
  }

  return out;
}

export function previewAccionesMenuDesdeCatalogoDinamico(
  catalog: GobernanzaAccionCatalogItem[] = [],
  endpointIds: string[] = [],
  configs: GobernanzaModuloConfigApi[] = []
): Array<{ method: string; id: string; title: string; mapeado: boolean }> {
  const mapeados = accionesUpsertDesdeCatalogo(catalog, endpointIds, configs);
  const byId = new Map(mapeados.map((item) => [String(item.id || ''), item]));
  return endpointIds.map((rawId) => {
    const id = String(rawId || '').trim();
    const hit = byId.get(id);
    const meta = catalog.find((a) => a.accionId === id);
    return {
      method: String(hit?.method || meta?.method || 'GET').toUpperCase(),
      id: hit ? id : '',
      title: String(hit?.title || meta?.title || id).trim(),
      mapeado: Boolean(hit?.id),
    };
  });
}

export function previewAccionesMenuDesdeCatalogo(
  slug: string,
  endpointIds: string[] = []
): Array<{ method: string; id: string; title: string; mapeado: boolean }> {
  return accionesUpsertDesdeEndpointIds(slug, endpointIds).map((item) => ({
    method: String(item.method || '').toUpperCase(),
    id: String(item.id || ''),
    title: String(item.title || item.id || ''),
    mapeado: true,
  }));
}

/**
 * Payload para POST /gobernanza/modulos/upsert (requiere rutaId o rutaPath en rutasSeguridad).
 */
export function buildGobernanzaModuloUpsertPayload(
  slug: string,
  ruta: GobernanzaModuloRutaBinding | string,
  campos?: GobernanzaModuloUpsertCampos
): Record<string, unknown> | null {
  const local = GOBERNANZA_MODULOS_CATALOGO.find((m) => m.slug === slug);
  if (!local) return null;

  const binding: GobernanzaModuloRutaBinding =
    typeof ruta === 'string' ? { rutaPath: ruta } : ruta;

  if (!binding.rutaId && !binding.rutaPath?.trim()) return null;

  const nombre = String(campos?.nombre ?? campos?.label ?? local.label).trim();
  const description = String(campos?.description ?? local.description).trim();
  const menuPath = String(campos?.menuPath ?? binding.rutaPath ?? '').trim();
  if (!nombre) return null;
  if (!menuPath && !binding.rutaId) return null;

  const acciones =
    Array.isArray(campos?.acciones) && campos.acciones.length
      ? campos.acciones
      : accionesDesdeSection(slug);

  const fv = campos?.filtrosVista;

  return {
    ...(binding.rutaId ? { rutaId: binding.rutaId } : {}),
    ...(binding.rutaPath?.trim() ? { rutaPath: binding.rutaPath.trim() } : {}),
    ...(binding.formularioComponent?.trim()
      ? { formularioComponent: binding.formularioComponent.trim(), rutaComponent: binding.formularioComponent.trim() }
      : {}),
    ...(binding.tipoId?.trim() ? { tipoId: binding.tipoId.trim() } : {}),
    ...(menuPath ? { menuPath } : {}),
    slug: local.slug,
    section: local.section,
    ...(campos?.cardSlug?.trim() ? { cardSlug: campos.cardSlug.trim() } : {}),
    nombre,
    description,
    ...(fv
      ? {
          filtrosVista: {
            tenantSuperAdminIds: fv.tenantSuperAdminIds ?? [],
            tenantGlobalIds: fv.tenantGlobalIds ?? [],
            usuarioIds: fv.usuarioIds ?? [],
          },
        }
      : {}),
    orden: local.orden,
    acciones,
  };
}

export function buildGobernanzaModulosBulkSeed(
  rutasPorSlug: Record<string, string>
): { modulos: Record<string, unknown>[] } {
  const modulos: Record<string, unknown>[] = [];
  for (const [slug, rutaPath] of Object.entries(rutasPorSlug)) {
    const item = buildGobernanzaModuloUpsertPayload(slug, rutaPath);
    if (item) modulos.push(item);
  }
  return { modulos };
}
