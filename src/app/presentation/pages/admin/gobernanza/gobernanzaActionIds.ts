import { normalizarGobernanzaRefId } from './gobernanzaEntityId';

import { ENDPOINTS_BY_ID } from './gobernanzaEndpointCatalog';
import { endpointIdDesdeComponente } from './permisos-forms/gobernanzaPermisosFormRegistry';
import { endpointIdDesdeComponenteReglas } from './reglas-forms/gobernanzaReglasFormRegistry';
import { endpointIdDesdeComponenteTenant } from './tenant-forms/gobernanzaTenantFormRegistry';
import type { GobernanzaModuloMenuAccion } from './gobernanzaModuloApiTypes';

export {
  GOBERNANZA_TIPO_SECTION_PERMISOS_SA,
  GOBERNANZA_TIPO_SECTION_REGLAS_SA,
  GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN,
  GOBERNANZA_TIPO_SECTION_TENANT_GLOBAL,
} from './gobernanzaTipoSectionConstants';

export const GOBERNANZA_GENERIC_ACTION_IDS = new Set(['accion-api', 'formulario']);

export function normalizarGobernanzaTextId(value: unknown): string {
  return String(value ?? '').trim();
}

/** Slug de endpoint del catálogo (perm-*, tenant-*, etc.). */
export function normalizarGobernanzaEndpointId(value: unknown): string {
  const raw = normalizarGobernanzaTextId(value);
  if (!raw) return '';
  if (ENDPOINTS_BY_ID[raw]) return raw;
  const lower = raw.toLowerCase();
  if (ENDPOINTS_BY_ID[lower]) return lower;
  return raw;
}

export function normalizarGobernanzaMenuPath(value: unknown): string {
  return normalizarGobernanzaTextId(value).replace(/\/+$/, '');
}

/** Hub contenedor de operaciones permisos (PermisosGlobal / …/permisos, …/herencia-sa). */
export function esRutaHubGobernanzaPermisos(menuPath?: string | null): boolean {
  const path = normalizarGobernanzaMenuPath(menuPath)?.toLowerCase();
  return Boolean(
    path
    && (
      /\/gobernanza\/parametros\/[^/]+\/permisos$/.test(path)
      || /\/herencia-sa$/.test(path)
    )
  );
}

/** Hub contenedor de operaciones reglas (ReglasTenant / …/reglas, …/reglas-sa). */
export function esRutaHubGobernanzaReglas(menuPath?: string | null): boolean {
  const path = normalizarGobernanzaMenuPath(menuPath)?.toLowerCase();
  return Boolean(
    path
    && (
      /\/reglas$/.test(path)
      || /\/reglas-sa$/.test(path)
      || /\/gobernanza\/parametros\/[^/]+\/reglas$/.test(path)
      || /\/reglas-tenant\/reglas-sa$/.test(path)
    )
  );
}

/** Hub contenedor TenantSuperAdmin (…/parametros/tenantsuperadmin). */
export function esRutaHubGobernanzaTenant(menuPath?: string | null): boolean {
  const path = normalizarGobernanzaMenuPath(menuPath)?.toLowerCase();
  return Boolean(path && /\/gobernanza\/parametros\/tenantsuperadmin$/.test(path));
}

/** Hub contenedor TenantGlobal (…/parametros/tenantglobal). */
export function esRutaHubGobernanzaTenantGlobal(menuPath?: string | null): boolean {
  const path = normalizarGobernanzaMenuPath(menuPath)?.toLowerCase();
  return Boolean(
    path
    && (
      /\/gobernanza\/parametros\/tenantglobal$/.test(path)
      || /\/gobernanza\/parametros\/tenant-global$/.test(path)
    )
  );
}

/**
 * Ruta del hub contenedor para GET operativo (subformularios publicados bajo el hub).
 * Si la URL actual es una hoja, sube al padre cuando este es hub conocido.
 */
export function resolverMenuPathHubOperaciones(menuPath?: string | null): string {
  const path = normalizarGobernanzaMenuPath(menuPath);
  if (!path) return '';

  const esHub = (p: string) =>
    esRutaHubGobernanzaPermisos(p)
    || esRutaHubGobernanzaReglas(p)
    || esRutaHubGobernanzaTenant(p)
    || esRutaHubGobernanzaTenantGlobal(p);

  if (esHub(path)) return path;

  const parent = path.replace(/\/[^/]+$/, '');
  if (parent && esHub(parent)) return parent;

  return path;
}

export function esGobernanzaEndpointIdCatalogo(id: string): boolean {
  const norm = normalizarGobernanzaEndpointId(id);
  return Boolean(norm && ENDPOINTS_BY_ID[norm]);
}

export type ResolverGobernanzaEndpointIdInput = {
  endpointId?: string | null;
  id?: string | null;
  formularioComponent?: string | null;
  defaultActionId?: string | null;
  menuPath?: string | null;
};

/** Resuelve el endpointId del catálogo operativo. */
export function resolverGobernanzaEndpointId(input: ResolverGobernanzaEndpointIdInput): string {
  const fromComponent =
    endpointIdDesdeComponente(input.formularioComponent)
    || endpointIdDesdeComponenteReglas(input.formularioComponent)
    || endpointIdDesdeComponenteTenant(input.formularioComponent);

  /** formularioComponent publicado en BD es la fuente de verdad del formulario por pestaña. */
  if (fromComponent && esGobernanzaEndpointIdCatalogo(fromComponent)) {
    return fromComponent;
  }

  const candidates = [
    input.endpointId,
    input.id,
    input.defaultActionId,
    fromComponent,
  ];

  for (const candidate of candidates) {
    const norm = normalizarGobernanzaEndpointId(candidate);
    if (norm && esGobernanzaEndpointIdCatalogo(norm)) return norm;
  }

  for (const candidate of [input.endpointId, input.id, input.defaultActionId, fromComponent]) {
    const norm = normalizarGobernanzaEndpointId(candidate);
    if (norm && !GOBERNANZA_GENERIC_ACTION_IDS.has(norm)) return norm;
  }

  return fromComponent || '';
}

/** ID de pestaña/acción: catálogo > menuPath > id crudo (evita accion-api si hay componente). */
export function resolverGobernanzaActionTabId(input: ResolverGobernanzaEndpointIdInput): string {
  const catalogId = resolverGobernanzaEndpointId(input);
  if (catalogId) return catalogId;

  const menuPath = normalizarGobernanzaMenuPath(input.menuPath);
  if (menuPath) return menuPath;

  const raw = normalizarGobernanzaTextId(input.id);
  if (raw && !GOBERNANZA_GENERIC_ACTION_IDS.has(raw)) return raw;

  const fromComponent =
    endpointIdDesdeComponente(input.formularioComponent)
    || endpointIdDesdeComponenteReglas(input.formularioComponent)
    || endpointIdDesdeComponenteTenant(input.formularioComponent);
  if (fromComponent) return fromComponent;

  return raw || 'accion-api';
}

/** Pestaña única por gobernanzaModuloConfigs (slug) aunque compartan endpointId de catálogo. */
function resolverTabIdDesdeAccion(
  accion: Pick<GobernanzaModuloMenuAccion, 'id' | 'configSlug'>,
  catalogId: string,
  catalogTabId: string
): string {
  const configSlug = normalizarGobernanzaTextId(accion.configSlug);
  const incomingId = normalizarGobernanzaTextId(accion.id);
  const tabFallback = catalogTabId || catalogId || incomingId;
  if (
    configSlug
    && incomingId
    && incomingId !== tabFallback
    && !GOBERNANZA_GENERIC_ACTION_IDS.has(incomingId)
  ) {
    return incomingId;
  }
  return tabFallback;
}

export function normalizarGobernanzaTipoId(value: unknown): string {
  return normalizarGobernanzaRefId(value) || normalizarGobernanzaTextId(value);
}

export function normalizarGobernanzaRutaId(value: unknown): string {
  return normalizarGobernanzaRefId(value) || normalizarGobernanzaTextId(value);
}

export function normalizarGobernanzaMenuAccion(
  accion: GobernanzaModuloMenuAccion
): GobernanzaModuloMenuAccion {
  const formularioComponent = normalizarGobernanzaTextId(accion.formularioComponent);
  const menuPath = normalizarGobernanzaMenuPath(accion.menuPath || accion.path) || undefined;
  const catalogId = resolverGobernanzaEndpointId({
    endpointId: accion.endpointId,
    id: accion.id,
    formularioComponent,
    menuPath,
  });
  const catalogTabId =
    catalogId
    || resolverGobernanzaActionTabId({
      endpointId: accion.endpointId,
      id: accion.id,
      formularioComponent,
      menuPath,
    });
  const tabId = resolverTabIdDesdeAccion(accion, catalogId, catalogTabId);
  const nombre =
    normalizarGobernanzaTextId(accion.shortLabel)
    || normalizarGobernanzaTextId(accion.title)
    || (catalogId && ENDPOINTS_BY_ID[catalogId]?.title)
    || '';

  return {
    ...accion,
    id: tabId,
    endpointId: catalogId || normalizarGobernanzaTextId(accion.endpointId) || null,
    formularioComponent: formularioComponent || undefined,
    menuPath,
    path: menuPath || normalizarGobernanzaTextId(accion.path) || undefined,
    title: normalizarGobernanzaTextId(accion.title) || nombre,
    shortLabel: normalizarGobernanzaTextId(accion.shortLabel) || normalizarGobernanzaTextId(accion.title) || nombre,
    tipo: catalogId ? 'endpoint' : accion.tipo,
    ...(accion.validacion
      ? {
          validacion: {
            ok: accion.validacion.ok !== false,
            mensajes: Array.isArray(accion.validacion.mensajes)
              ? accion.validacion.mensajes.map((m) => String(m ?? '').trim()).filter(Boolean)
              : typeof accion.validacion.mensajes === 'string' && accion.validacion.mensajes.trim()
                ? [accion.validacion.mensajes.trim()]
                : [],
          },
        }
      : {}),
  };
}

export function normalizarGobernanzaMenuAcciones(
  acciones: GobernanzaModuloMenuAccion[] = []
): GobernanzaModuloMenuAccion[] {
  const seen = new Set<string>();
  const out: GobernanzaModuloMenuAccion[] = [];
  for (const item of acciones) {
    const norm = normalizarGobernanzaMenuAccion(item);
    if (!norm.id || seen.has(norm.id)) continue;
    seen.add(norm.id);
    out.push(norm);
  }
  return out;
}
