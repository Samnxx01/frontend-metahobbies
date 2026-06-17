import type { EndpointSection } from './parametrosGobernanzaTypes';

/** Metadatos de un módulo de gobernanza (submenú + formulario inline por ruta). */
export type GobernanzaModuloConfig = {
  /** Segmento de ruta: `/admin/.../gobernanza/:slug` */
  slug: string;
  section: EndpointSection;
  label: string;
  description: string;
  /**
   * IDs publicados en gobernanzaModuloConfigs (solo informativo; el menú operativo
   * se arma desde GET /gobernanza/modulos/menu, no desde este arreglo local).
   */
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
  /** Componente React en rutasSeguridad (parametrizado en gobernanzaModuloConfigs). */
  formularioComponent?: string | null;
  formularioId?: string | null;
  rutaId?: string | null;
  menuPath?: string | null;
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

/** Metadatos del módulo permisos; acciones solo desde gobernanzaModuloConfigs (API). */
export const GOBERNANZA_MODULO_PERMISOS: GobernanzaModuloConfig = {
  slug: 'permisos',
  section: 'permisos',
  label: 'Gobernanza Permisos',
  description: 'Herencias, roles y permisos por tenant según tu alcance JWT.',
  endpointIds: [],
  defaultActionId: '',
  actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
  submenuTitle: 'Operaciones de permisos',
  submenuHint: 'Selecciona una acción; el formulario se muestra debajo.',
};

/** Metadatos del módulo reglas; acciones solo desde gobernanzaModuloConfigs (API). */
export const GOBERNANZA_MODULO_REGLAS: GobernanzaModuloConfig = {
  slug: 'reglas',
  section: 'reglas',
  label: 'Gobernanza Reglas',
  description: 'Reglas de jerarquía por tenant global y plataforma.',
  endpointIds: [],
  defaultActionId: 'tenant-listar-reglas',
  actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
  submenuTitle: 'Operaciones de reglas',
  submenuHint: 'Selecciona una acción; el formulario se muestra debajo.',
};

const REGISTRY: Record<string, GobernanzaModuloConfig> = {
  [GOBERNANZA_MODULO_TENANT.slug]: GOBERNANZA_MODULO_TENANT,
  tenant: GOBERNANZA_MODULO_TENANT,
  'tenant-global': GOBERNANZA_MODULO_TENANT,
  [GOBERNANZA_MODULO_PERMISOS.slug]: GOBERNANZA_MODULO_PERMISOS,
  permisos: GOBERNANZA_MODULO_PERMISOS,
  [GOBERNANZA_MODULO_REGLAS.slug]: GOBERNANZA_MODULO_REGLAS,
  reglas: GOBERNANZA_MODULO_REGLAS,
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

/** Stub de módulo inline: slug/sección sin acciones quemadas (menú = API gobernanzaModuloConfigs). */
export function gobernanzaModuloOperativoStub(
  slug: string,
  partial?: Partial<GobernanzaModuloConfig>
): GobernanzaModuloConfig | null {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return null;
  const reg = getGobernanzaModuloBySlug(key);
  if (reg) {
    return {
      ...reg,
      ...partial,
      slug: partial?.slug ?? reg.slug,
      endpointIds: [],
      defaultActionId: partial?.defaultActionId ?? '',
    };
  }
  return {
    slug: key,
    section: partial?.section ?? 'tenant',
    label: partial?.label ?? key,
    description: partial?.description ?? '',
    actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
    ...partial,
    endpointIds: [],
    defaultActionId: partial?.defaultActionId ?? '',
  };
}
