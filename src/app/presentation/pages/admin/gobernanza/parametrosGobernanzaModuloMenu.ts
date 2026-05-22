import type { EndpointSection } from './parametrosGobernanzaTypes';
import type { GobernanzaModuloConfig } from './gobernanzaModuloConfig';
import { GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT } from './gobernanzaModuloConfig';
import { getGobernanzaModuloCatalogoLocal } from './gobernanzaModulosCatalog';
import type { GobernanzaModuloConfigApi } from './gobernanzaModuloApiTypes';

/**
 * Parametrización del menú inline de ParametrosGobernanza (pestañas + query `?accion=`).
 * Fuente local; se fusiona con la respuesta POST /gobernanza/modulos/menu.
 */
export type ParametrosGobernanzaModuloMenuParametrizacion = {
  slug: string;
  section: EndpointSection;
  /** Título en la cabecera del Card de ParametrosGobernanza (sección activa). */
  panelTitle: string;
  panelHint: string;
  actionQueryParam: string;
  submenuTitle: string;
  submenuHint: string;
  defaultActionId: string;
  syncDefaultAction: boolean;
};

const MENU_TENANT: ParametrosGobernanzaModuloMenuParametrizacion = {
  slug: 'tenant',
  section: 'tenant',
  panelTitle: 'Gobernanza Tenant',
  panelHint: 'Elige una pestaña y completa el formulario debajo, como en Inventario.',
  actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
  submenuTitle: 'Operaciones',
  submenuHint: 'Selecciona una acción; el formulario aparece debajo sin modales.',
  defaultActionId: 'tenant-listar-libres-tenantglobal',
  syncDefaultAction: true,
};

const MENU_PERMISOS: ParametrosGobernanzaModuloMenuParametrizacion = {
  slug: 'permisos',
  section: 'permisos',
  panelTitle: 'Gobernanza Permisos',
  panelHint: 'Gestiona herencias y permisos según tu alcance en el JWT.',
  actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
  submenuTitle: 'Operaciones',
  submenuHint: 'Acciones de permisos disponibles para tu sesión.',
  defaultActionId: '',
  syncDefaultAction: true,
};

const MENU_CORPORATIVO: ParametrosGobernanzaModuloMenuParametrizacion = {
  slug: 'corporativo',
  section: 'corporativo',
  panelTitle: 'Gobernanza Corporativo',
  panelHint: 'Parametriza branding, widgets y catálogo corporativo.',
  actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
  submenuTitle: 'Operaciones',
  submenuHint: 'Acciones corporativas según tu sesión.',
  defaultActionId: '',
  syncDefaultAction: true,
};

/** Registro de parametrización por slug (ParametrosGobernanza). */
export const PARAMETROS_GOBERNANZA_MENU_POR_SLUG: Record<
  string,
  ParametrosGobernanzaModuloMenuParametrizacion
> = {
  tenant: MENU_TENANT,
  'tenant-global': MENU_TENANT,
  permisos: MENU_PERMISOS,
  corporativo: MENU_CORPORATIVO,
};

export function getParametrosGobernanzaMenuParametrizacion(
  slug: string | null | undefined
): ParametrosGobernanzaModuloMenuParametrizacion | null {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return null;
  if (PARAMETROS_GOBERNANZA_MENU_POR_SLUG[key]) {
    return PARAMETROS_GOBERNANZA_MENU_POR_SLUG[key];
  }
  const local = getGobernanzaModuloCatalogoLocal(key);
  if (!local) return null;
  return {
    slug: local.slug,
    section: local.section,
    panelTitle: local.label,
    panelHint: local.description,
    actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
    submenuTitle: 'Operaciones',
    submenuHint: 'Selecciona una pestaña para continuar.',
    defaultActionId: '',
    syncDefaultAction: true,
  };
}

/**
 * Fusiona parametrización local (ParametrosGobernanza) con módulo devuelto por API.
 */
export function mergeParametrizacionConModuloApi(
  parametrizacion: ParametrosGobernanzaModuloMenuParametrizacion,
  apiModulo?: GobernanzaModuloConfigApi | null
): GobernanzaModuloConfig {
  return {
    slug: apiModulo?.slug ?? parametrizacion.slug,
    section: apiModulo?.section ?? parametrizacion.section,
    label: apiModulo?.label ?? parametrizacion.panelTitle,
    description: apiModulo?.description ?? parametrizacion.panelHint,
    endpointIds: apiModulo?.endpointIds ?? [],
    defaultActionId: apiModulo?.defaultActionId || parametrizacion.defaultActionId,
    actionQueryParam: apiModulo?.actionQueryParam ?? parametrizacion.actionQueryParam,
    submenuTitle: apiModulo?.submenuTitle ?? parametrizacion.submenuTitle,
    submenuHint: apiModulo?.submenuHint ?? parametrizacion.submenuHint,
    basePath: apiModulo?.frontPath,
  };
}

export function resolvePanelCopy(
  parametrizacion: ParametrosGobernanzaModuloMenuParametrizacion,
  config: GobernanzaModuloConfig
): { panelTitle: string; panelHint: string } {
  return {
    panelTitle: config.label || parametrizacion.panelTitle,
    panelHint: parametrizacion.panelHint,
  };
}
