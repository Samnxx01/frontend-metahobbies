/** Tipos compartidos de la pantalla ParametrosGobernanza (exportados para envoltorios y pruebas). */

import type { GobernanzaModuloConfig } from './gobernanzaModuloConfig';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type EndpointSection = 'tenant' | 'permisos' | 'corporativo' | 'reglas';
export type EndpointActor = 'tenantSuperAdmin' | 'tenantGlobal' | 'ambos';
export type FieldType = 'text' | 'textarea' | 'json' | 'id' | 'permisos' | 'context';

export type FieldSpec = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  header?: boolean;
  pathParam?: boolean;
};

export type EndpointSpec = {
  id: string;
  section: EndpointSection;
  actor: EndpointActor;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  fields: FieldSpec[];
  primary?: boolean;
};

export interface ParametrosGobernanzaProps {
  mode?: 'full' | 'rules' | 'superAdmin' | 'superAdminRules';
  initialSection?: EndpointSection;
  lockedSection?: EndpointSection | null;
  allowedEndpointIds?: string[];
  /**
   * Abre el modal del endpoint al montar (p. ej. `?endpoint=tenant-crear-global-reglas`).
   * Solo se aplica cuando cambia respecto al ciclo anterior (no reabre tras cerrar si la URL sigue igual).
   */
  initialEndpointId?: string | null;
  /** Si true, al cerrar el modal se invoca `onRouteEndpointClear` (p. ej. limpiar query). */
  syncRouteWithEndpoint?: boolean;
  onRouteEndpointClear?: () => void;
  /** Query param para el editor visual de tarjetas (default `diseno`). */
  cardDesignQueryParam?: string;
  /** Menú horizontal + diálogo de diseño por endpoint (default true). */
  enableCardDesignEditor?: boolean;
  /**
   * Flujo inline parametrizado (submenú + formulario por `?accion=`).
   * Si no se pasa, en sección tenant + modo full se usa el módulo `tenant` por defecto.
   */
  inlineModuloConfig?: GobernanzaModuloConfig | null;
  /** Resuelve módulo desde registro por slug de ruta (p. ej. `tenant`). */
  inlineModuloSlug?: string;
  /** `compact`: cabecera del módulo + menú parametrizado sin panel global. */
  shellVariant?: 'full' | 'compact';
  /** Path SPA para resolver gobernanzaModuloConfigs (menuPath). */
  menuPath?: string;
  /** Acción del catálogo al abrir subruta (sin query en URL si hay menuPath). */
  preferredActionId?: string | null;
  /**
   * Hub contenedor (PermisosGlobal): rejilla de operaciones publicadas en gobernanzaModuloConfigs.
   * La selección navega al menuPath del formulario hijo.
   */
  operacionesHub?: boolean;
}

/** Dominio UI / catálogos (solo usados dentro de ParametrosGobernanza). */
export type Vista = { id: string; label: string; path: string };
export type Accion = { id: string; label: string; method: string };
export type TenantGlobal = {
  id: string;
  label: string;
  corporativo: string;
  correo?: string;
  tenantSuperAdmin?: string;
  tenantGlobalAdmin?: string;
};
export type PermisoItem = { vistaId: string; accionId: string[] };
export type ReglaOption = { id: string; label: string };
/** tipoContexto: `view` = interfaz tenant global; `api` = contexto API (excluido en reglas globales). */
export type ContextOption = { id: string; label: string; tipoContexto?: string };
export type HeredaGlobalOption = { id: string; label: string };
export type CatalogSelection = { vistas: string[]; acciones: string[] };
export type NodoRuta = {
  _id: string;
  name: string;
  path: string;
  tipoNodo?: string;
  tipoNodoId?: { codigo: string; nombre: string; order: number };
  acciones?: Accion[];
  children?: NodoRuta[];
};
export type TenantCorporativoOption = { id: string; label: string; tenantGlobalId: string };
export type GenericSelectOption = { id: string; label: string; rol?: string; meta?: Record<string, string | number | undefined> };
export type HeredaScope = 'tenantSuperAdmin' | 'tenantGlobal' | 'unknown';
export type VistaLoc = { suiteId: string; suiteName: string; moduloId: string; moduloName: string };
export type VistaItem = { id: string; label: string; path: string };
