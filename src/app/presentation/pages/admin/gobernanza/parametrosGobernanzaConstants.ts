/** Constantes y conjuntos de IDs de endpoints (ParametrosGobernanza). */

export const JERARQUIA_USUARIOS_FETCH_MS = 22_000;

/** Intervalo para re-leer herencias en modal PUT admin/global (lectura alineada con servidor sin pulsar checks). */
export const POLL_HERENCIA_ADMIN_MS = 45_000;

export const SUPERADMIN_RULES_ENDPOINT_IDS = new Set([
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-crear-dios-reglas',
  'tenant-actualizar-dios-reglas',
  'tenant-listar-dios-reglas',
  'tenant-eliminar-dios-reglas',
]);

export const RULES_ENDPOINT_IDS = new Set([
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-actualizar-global-reglas',
  'tenant-desactivar-global-reglas',
  'tenant-eliminar-global-reglas',
  'tenant-crear-dios-reglas',
  'tenant-actualizar-dios-reglas',
  'tenant-listar-dios-reglas',
  'tenant-eliminar-dios-reglas',
]);

/** Crear / actualizar regla DIOS: exige JWT solo tenantSuperAdmin (sin tenantGlobal ni tenantCorporativo en el token). */
export const DIOS_REGLAS_ENDPOINT_IDS = new Set([
  'tenant-crear-dios-reglas',
  'tenant-actualizar-dios-reglas',
  'tenant-listar-dios-reglas',
  'tenant-eliminar-dios-reglas',
]);

/**
 * Select de alcance (tenant global / opción DIOS): filtro por tenantJerarquiaCounter solo si el JWT trae tenantSuperAdmin.
 * No aplica a sesiones puramente tenantGlobal / tenantCorporativo.
 *
 * PUT actualizar herencia admin/global: misma ruta API; tarjetas separadas SA (DIOS) vs TG (ADMIN).
 */
export const PERM_ADMIN_TENANT_GLOBAL_ACTUALIZAR_IDS = new Set([
  'perm-admin-tenant-global-actualizar-sa',
  'perm-admin-tenant-global-actualizar-tg',
]);

export const ENDPOINT_IDS_OPCIONES_TG_JERARQUIA_SUPERADMIN = new Set([
  'perm-usuario-tenant-global',
  'perm-admin-tenant-global',
  'perm-admin-tenant-global-actualizar-sa',
  'perm-admin-tenant-global-actualizar-tg',
  'perm-admin-tenant-global-desactivar',
  'perm-admin-tenant-global-eliminar',
  'perm-listar-herencias',
]);

/** Un `__tsa_scope__` por cada SA del GET selects (alinear con listado de herencias por tenantSuperTenant). */
export const ENDPOINT_IDS_SELECT_MULTI_SA_JERARQUIA = new Set([
  'perm-admin-tenant-global',
  'perm-admin-tenant-global-actualizar-sa',
  'perm-admin-tenant-global-desactivar',
  'perm-admin-tenant-global-eliminar',
]);

/** Opción de herencia sintética desde regla (no es documento Mongo de herencia; solo catálogo / vista previa). */
export const REGLA_SA_SYNTH_PREFIX = '__regla_sa__:';

/** Un `__tsa_scope__` por cada SA del GET selects. */
export const TENANT_SUPERADMIN_SCOPE_PREFIX = '__tsa_scope__:';

export const HIDDEN_ENDPOINT_IDS = new Set([
  'tenant-crear-global-usuario',
  'tenant-crear-global-admin',
  'tenant-listar-libres',
  // Trasladados a PermisosTenant (flujo acotado tenant global)
  'perm-usuario-tenant-global',
  'perm-admin-tenant-global-listar',
  // PUT tenant global (ADMIN) solo en `PermisosTenant` vía allowedEndpointIds
  'perm-admin-tenant-global-actualizar-tg',
  'perm-admin-tenant-global-desactivar',
  // `perm-admin-tenant-global-actualizar-sa` no se oculta: debe verse junto a POST/DELETE en panel permisos (DIOS).
]);
