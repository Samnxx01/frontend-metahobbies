import type { EndpointSection } from './parametrosGobernanzaTypes';

/** Metadatos de un módulo de gobernanza (submenú + formulario inline por ruta). */
export type GobernanzaModuloConfig = {
  /** Segmento de ruta: `/admin/.../gobernanza/:slug` */
  slug: string;
  section: EndpointSection;
  label: string;
  description: string;
  /** IDs de endpoints en orden del submenú (catálogo ParametrosGobernanza). */
  endpointIds: readonly string[];
  defaultActionId: string;
  /** Query param de la acción activa (default `accion`). */
  actionQueryParam?: string;
  submenuTitle?: string;
  submenuHint?: string;
  /**
   * Ruta base del front para enlaces del submenú.
   * Si no se define, se usa `location.pathname` al renderizar.
   */
  basePath?: string;
};

export const GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT = 'accion';

/** Módulo Tenant global (flujo inline por defecto en Gobernanza Tenant). */
export const GOBERNANZA_MODULO_TENANT: GobernanzaModuloConfig = {
  slug: 'tenant',
  section: 'tenant',
  label: 'Gobernanza Tenant',
  description: 'Tenants, reglas y jerarquía visible.',
  endpointIds: [
    'tenant-listar-libres-tenantglobal',
    'tenant-crear-global-usuario',
    'tenant-actualizar-global',
    'tenant-desactivar-global',
    'tenant-eliminar-global',
  ],
  defaultActionId: 'tenant-listar-libres-tenantglobal',
  actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
  submenuTitle: 'Acciones disponibles',
  submenuHint: 'Elige una operación; el formulario se muestra debajo sin ventanas emergentes.',
};

const REGISTRY: Record<string, GobernanzaModuloConfig> = {
  [GOBERNANZA_MODULO_TENANT.slug]: GOBERNANZA_MODULO_TENANT,
  tenant: GOBERNANZA_MODULO_TENANT,
  'tenant-global': GOBERNANZA_MODULO_TENANT,
};

export function getGobernanzaModuloBySlug(slug: string | null | undefined): GobernanzaModuloConfig | null {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return null;
  return REGISTRY[key] ?? null;
}

export function registerGobernanzaModulo(config: GobernanzaModuloConfig): void {
  REGISTRY[config.slug.toLowerCase()] = config;
}

export function listGobernanzaModulos(): GobernanzaModuloConfig[] {
  const seen = new Set<string>();
  const out: GobernanzaModuloConfig[] = [];
  for (const cfg of Object.values(REGISTRY)) {
    if (seen.has(cfg.slug)) continue;
    seen.add(cfg.slug);
    out.push(cfg);
  }
  return out;
}

export function moduloEndpointIdSet(config: GobernanzaModuloConfig): Set<string> {
  return new Set(config.endpointIds);
}
