/** Constantes técnicas de ParametrosGobernanza (no parametrizables en gobernanzaModuloConfigs). */

export const JERARQUIA_USUARIOS_FETCH_MS = 22_000;

/** Intervalo para re-leer herencias en modal PUT admin/global (lectura alineada con servidor sin pulsar checks). */
export const POLL_HERENCIA_ADMIN_MS = 45_000;

/** Opción de herencia sintética desde regla (no es documento Mongo de herencia; solo catálogo / vista previa). */
export const REGLA_SA_SYNTH_PREFIX = '__regla_sa__:';

/** Un `__tsa_scope__` por cada SA del GET selects. */
export const TENANT_SUPERADMIN_SCOPE_PREFIX = '__tsa_scope__:';

/** Query param por defecto del flujo inline; el valor concreto puede venir de parametrizacionUi.inlineFlowTenant. */
export const GOBERNANZA_INLINE_ACTION_QUERY_PARAM = 'accion';
