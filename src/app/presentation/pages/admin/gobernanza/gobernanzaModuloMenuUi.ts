import type { EndpointSpec } from './parametrosGobernanzaTypes';
import { GOBERNANZA_GENERIC_ACTION_IDS } from './gobernanzaActionIds';

export type GobernanzaMenuTabItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type GobernanzaAccionGridItem = {
  id: string;
  title: string;
  description: string;
  path: string;
  method: string;
  disponible: boolean;
};

function labelAccionDesdeEndpoint(
  ep: EndpointSpec,
  short?: string,
  configLabel?: string
): string {
  const shortOk = String(short || '').trim();
  if (shortOk) return shortOk;
  const titleOk = String(ep.title || '').trim();
  if (titleOk && !GOBERNANZA_GENERIC_ACTION_IDS.has(titleOk)) return titleOk;
  const configOk = String(configLabel || '').trim();
  if (configOk) return configOk;
  if (!GOBERNANZA_GENERIC_ACTION_IDS.has(ep.id)) return ep.id;
  return titleOk || configOk;
}

/**
 * Pestañas del menú operativo (misma fuente que la rejilla de acciones).
 * Equivalente a `inventarioTabsDesdeTarjetasDinamicas` en inventario.
 */
export function buildGobernanzaMenuTabsFromEndpoints(
  endpoints: EndpointSpec[] = [],
  opts?: {
    shortLabels?: Record<string, string>;
    disponibleById?: Record<string, boolean>;
    scopeDisponibleById?: Record<string, boolean>;
    /** nombre de gobernanzaModuloConfigs cuando la acción no trae título propio */
    configLabel?: string;
  }
): GobernanzaMenuTabItem[] {
  return endpoints.map((ep) => {
    const menuOk = opts?.disponibleById?.[ep.id] ?? true;
    const scopeOk = opts?.scopeDisponibleById?.[ep.id] ?? true;
    const short = opts?.shortLabels?.[ep.id]?.trim();
    return {
      value: ep.id,
      label: labelAccionDesdeEndpoint(ep, short, opts?.configLabel),
      disabled: !menuOk || !scopeOk,
    };
  });
}

/**
 * Tarjetas de acciones para vista tipo ConfigInventario (Abrir / path / descripción).
 */
export function buildGobernanzaAccionesGridFromEndpoints(
  endpoints: EndpointSpec[] = [],
  opts?: {
    shortLabels?: Record<string, string>;
    disponibleById?: Record<string, boolean>;
    scopeDisponibleById?: Record<string, boolean>;
    configLabel?: string;
  }
): GobernanzaAccionGridItem[] {
  return endpoints.map((ep) => {
    const menuOk = opts?.disponibleById?.[ep.id] ?? true;
    const scopeOk = opts?.scopeDisponibleById?.[ep.id] ?? true;
    return {
      id: ep.id,
      title: labelAccionDesdeEndpoint(ep, opts?.shortLabels?.[ep.id], opts?.configLabel),
      description: ep.description,
      path: ep.path,
      method: ep.method,
      disponible: menuOk && scopeOk,
    };
  });
}
