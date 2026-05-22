import { ENDPOINTS } from './parametrosGobernanzaEndpoints';
import type { EndpointActor, EndpointSection, EndpointSpec, HttpMethod } from './parametrosGobernanzaTypes';
import type { GobernanzaModuloMenuAccion } from './gobernanzaModuloApiTypes';

export const ENDPOINTS_BY_ID: Record<string, EndpointSpec> = Object.fromEntries(
  ENDPOINTS.map((e) => [e.id, e])
);

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

  if (!base && !accion.path) return null;

  return {
    id: accion.id,
    section,
    actor,
    method: (accion.method as HttpMethod) || base?.method || 'GET',
    path: accion.path || base?.path || '',
    title: accion.title || base?.title || accion.id,
    description: accion.description || base?.description || '',
    fields: base?.fields ?? [],
    primary: base?.primary,
  };
}
