import { ENDPOINTS } from './parametrosGobernanzaEndpoints';
import { GOBERNANZA_GENERIC_ACTION_IDS } from './gobernanzaActionIds';
import type { EndpointActor, EndpointSection, EndpointSpec, HttpMethod } from './parametrosGobernanzaTypes';
import type { GobernanzaModuloMenuAccion } from './gobernanzaModuloApiTypes';

export const ENDPOINTS_BY_ID: Record<string, EndpointSpec> = Object.fromEntries(
  ENDPOINTS.map((e) => [e.id, e])
);

const HTTP_VERBS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/** Endpoints visibles de una sección; ocultos según gobernanzaModuloConfigs (parametrizacionUi). */
export function endpointsPorSection(
  section: string,
  opts?: { excludeHidden?: boolean; hiddenEndpointIds?: Set<string> }
): EndpointSpec[] {
  const key = String(section || '').trim().toLowerCase();
  const excludeHidden = opts?.excludeHidden !== false;
  const hidden = opts?.hiddenEndpointIds ?? new Set<string>();
  return ENDPOINTS.filter((e) => {
    if (String(e.section || '').toLowerCase() !== key) return false;
    if (excludeHidden && hidden.has(e.id)) return false;
    return true;
  });
}

export function esAccionIdCatalogoValido(accionId: string): boolean {
  const id = String(accionId || '').trim();
  if (!id) return false;
  if (ENDPOINTS_BY_ID[id]) return true;
  return !HTTP_VERBS.has(id.toUpperCase());
}

export function shortLabelDesdeEndpoint(e: EndpointSpec): string {
  if (e.primary) return String(e.primary);
  const method = String(e.method || '').toUpperCase();
  if (method === 'GET') return 'Consulta';
  if (method === 'POST') return 'Alta';
  if (method === 'PUT' || method === 'PATCH') return 'Edición';
  if (method === 'DELETE') return 'Eliminación';
  return method || 'Acción';
}

/** Payload de acción para upsert en gobernanzaModuloConfigs. */
export function endpointSpecToAccionPayload(e: EndpointSpec, orden = 0): Record<string, unknown> {
  return {
    id: e.id,
    method: e.method,
    path: e.path,
    title: e.title,
    description: e.description,
    shortLabel: shortLabelDesdeEndpoint(e),
    actor: e.actor,
    orden: orden > 0 ? orden : 10,
  };
}

export function accionesPayloadDesdeEndpointIds(ids: string[] = []): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const out: Array<Record<string, unknown>> = [];
  for (const rawId of ids) {
    const id = String(rawId || '').trim();
    if (!id || seen.has(id)) continue;
    const spec = ENDPOINTS_BY_ID[id];
    if (!spec) continue;
    seen.add(id);
    out.push(endpointSpecToAccionPayload(spec, (out.length + 1) * 10));
  }
  return out;
}

export function catalogoAccionesPorModuloSlug(
  slug: string
): Array<{ accionId: string; method: string; title: string }> {
  const section = slug === 'tenant-global' ? 'tenant' : slug;
  return endpointsPorSection(section).map((e) => ({
    accionId: e.id,
    method: String(e.method || '').toUpperCase(),
    title: String(e.title || e.id),
  }));
}

/**
 * Arma EndpointSpec desde acción API + catálogo local de fields (como Inventario: menú dinámico, forms por id).
 */
export function accionApiToEndpointSpec(
  accion: GobernanzaModuloMenuAccion,
  sectionFallback: EndpointSection
): EndpointSpec | null {
  const base = ENDPOINTS_BY_ID[accion.id];
  const actor = (accion.actor as EndpointActor) || base?.actor || 'ambos';
  const section = accion.section || base?.section || sectionFallback;

  const id = String(accion.id || '').trim();
  if (!id) return null;

  return {
    id,
    section,
    actor,
    method: (accion.method as HttpMethod) || base?.method || 'GET',
    path: accion.path || base?.path || '',
    title: accion.title || accion.shortLabel || base?.title || (GOBERNANZA_GENERIC_ACTION_IDS.has(id) ? '' : id) || '',
    description: accion.description || base?.description || '',
    fields: [],
    primary: base?.primary,
  };
}
