import type { EndpointSpec } from './parametrosGobernanzaTypes';
import type { ParametrosGobernanzaProps } from './parametrosGobernanzaTypes';
import type { GobernanzaParametrizacionUiSets } from './gobernanzaParametrizacionUi';
import { GOBERNANZA_PARAMETRIZACION_UI_SETS_VACIO } from './gobernanzaParametrizacionUi';

/**
 * Contexto mínimo para evaluar permisos de endpoint (alineado a ParametrosGobernanza).
 */
export type GobernanzaCapabilityContext = {
  mode: NonNullable<ParametrosGobernanzaProps['mode']>;
  tenantSuperAdminId?: string | null;
  tenantGlobalId?: string | null;
  tenantCorporativoId?: string | null;
  /** `tenant-actualizar-dios-reglas` / reglas DIOS: corporativo en counters → solo lectura en UI. */
  saJerarquiaConCorporativo: boolean;
  /** Valor crudo del actor JWT (`undefined` = aún no cargado). */
  saJerarquiaTieneCorporativoEnCounters?: boolean;
  /** Desde gobernanzaModuloConfigs (GET parametrizacion-ui). */
  parametrizacionUi?: GobernanzaParametrizacionUiSets;
};

export type GobernanzaEndpointActionId = 'configure' | 'execute' | 'design';

export type GobernanzaEndpointActionInventoryItem = {
  id: GobernanzaEndpointActionId;
  label: string;
  /** Permitido para esta sesión / endpoint. */
  allowed: boolean;
};

export type GobernanzaEndpointCapabilities = {
  /** El JWT/scope permite usar este endpoint en principio. */
  scopeDisponible: boolean;
  /** Puede invocar la API (botón Ejecutar habilitado en modal). */
  canExecuteApi: boolean;
  /** Reglas DIOS: solo lectura desactivado; alcance lo valida backend (counters + configs NVL). */
  diosSoloLectura: boolean;
  /** Puede cambiar tokens visuales de la tarjeta (diseño local). */
  canEditCardDesign: boolean;
  /** Lista dinámica para UI / auditoría de lo que la tarjeta expone. */
  inventory: GobernanzaEndpointActionInventoryItem[];
};

function endpointDisponibleParaScope(endpoint: EndpointSpec, ctx: GobernanzaCapabilityContext): boolean {
  const actorTieneScopeTenantSuperAdmin = Boolean(String(ctx.tenantSuperAdminId || '').trim());
  const actorTieneGlobal = Boolean(String(ctx.tenantGlobalId || '').trim());
  const actorTieneScopeTenantGlobal = actorTieneGlobal && !actorTieneScopeTenantSuperAdmin;

  if (endpoint.actor === 'ambos') return true;
  if (endpoint.actor === 'tenantSuperAdmin') {
    return actorTieneScopeTenantSuperAdmin;
  }
  if (endpoint.actor === 'tenantGlobal') {
    if (ctx.mode === 'superAdmin') return actorTieneScopeTenantSuperAdmin && !actorTieneGlobal;
    return actorTieneScopeTenantSuperAdmin || actorTieneScopeTenantGlobal;
  }
  return false;
}

function esJwtSoloTenantSuperAdmin(ctx: GobernanzaCapabilityContext): boolean {
  const tsa = String(ctx.tenantSuperAdminId || '').trim();
  const tg = String(ctx.tenantGlobalId || '').trim();
  const tc = String(ctx.tenantCorporativoId || '').trim();
  return Boolean(tsa && !tg && !tc);
}

/** JWT SA puro y counters confirman ausencia de corporativo (no habilitar mientras `undefined`). */
export function scopeJwtSaSinCorporativoEnCounters(ctx: GobernanzaCapabilityContext): boolean {
  return (
    esJwtSoloTenantSuperAdmin(ctx) &&
    ctx.saJerarquiaTieneCorporativoEnCounters === false
  );
}

function diosReglasEndpointIds(ctx: GobernanzaCapabilityContext): Set<string> {
  return ctx.parametrizacionUi?.endpointIdsModoReglasDios
    ?? GOBERNANZA_PARAMETRIZACION_UI_SETS_VACIO.endpointIdsModoReglasDios;
}

function diosReglasDisponibleModal(endpoint: EndpointSpec, ctx: GobernanzaCapabilityContext): boolean {
  const base = endpointDisponibleParaScope(endpoint, ctx);
  if (!diosReglasEndpointIds(ctx).has(endpoint.id)) return base;
  return base && esJwtSoloTenantSuperAdmin(ctx);
}

function modoSoloLecturaReglasDios(_endpoint: EndpointSpec, _ctx: GobernanzaCapabilityContext): boolean {
  return false;
}

/**
 * Inventario y capacidades por endpoint: mismo criterio que el panel (scope + reglas DIOS en solo lectura).
 * Usar para habilitar/deshabilitar diseño de tarjeta y mostrar qué acciones aplican.
 */
export function computeGobernanzaEndpointCapabilities(
  endpoint: EndpointSpec,
  ctx: GobernanzaCapabilityContext
): GobernanzaEndpointCapabilities {
  const scopeDisponible = endpointDisponibleParaScope(endpoint, ctx);
  const diosSoloLectura = modoSoloLecturaReglasDios(endpoint, ctx);
  const modalDisponible = diosReglasDisponibleModal(endpoint, ctx);
  const canExecuteApi = modalDisponible && !diosSoloLectura;
  /** Diseño controlado: solo si el scope permite el endpoint y no estamos en DIOS solo-consulta. */
  const canEditCardDesign = scopeDisponible && !diosSoloLectura;

  const inventory: GobernanzaEndpointActionInventoryItem[] = [
    {
      id: 'configure',
      label: 'Configurar (formulario API)',
      allowed: true,
    },
    {
      id: 'execute',
      label: `Ejecutar API (${endpoint.method})`,
      allowed: canExecuteApi,
    },
    {
      id: 'design',
      label: 'Editar diseño de tarjeta',
      allowed: canEditCardDesign,
    },
  ];

  return {
    scopeDisponible,
    canExecuteApi,
    diosSoloLectura,
    canEditCardDesign,
    inventory,
  };
}
