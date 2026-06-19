import type { EndpointSection } from './parametrosGobernanzaTypes';
import type { GobernanzaModuloConfig } from './gobernanzaModuloConfig';
import { GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT } from './gobernanzaModuloConfig';
import { getGobernanzaModuloCatalogoLocal } from './gobernanzaModulosCatalog';
import type { GobernanzaModuloConfigApi } from './gobernanzaModuloApiTypes';

/**
 * Parametrización del menú inline de ParametrosGobernanza (pestañas + query `?accion=`).
 * Fuente local; se fusiona con la respuesta GET /gobernanza/modulos/menu.
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
  defaultActionId: '',
  syncDefaultAction: true,
};

const MENU_PERMISOS: ParametrosGobernanzaModuloMenuParametrizacion = {
  slug: 'permisos',
  section: 'permisos',
  panelTitle: 'Gobernanza Permisos',
  panelHint: 'Gestiona herencias y permisos según tu alcance en el JWT.',
  actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
  submenuTitle: 'Operaciones de permisos',
  submenuHint: 'Menú parametrizable desde rutaSeguridad (API gobernanza/modulos).',
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
  const apiEndpointIds = apiModulo?.endpointIds?.filter(Boolean) ?? [];
  return {
    slug: apiModulo?.slug ?? parametrizacion.slug,
    section: apiModulo?.section ?? parametrizacion.section,
    label: apiModulo?.nombre ?? apiModulo?.label ?? parametrizacion.panelTitle,
    description: apiModulo?.description ?? parametrizacion.panelHint,
    endpointIds: apiEndpointIds,
    defaultActionId: apiModulo?.defaultActionId ?? parametrizacion.defaultActionId ?? '',
    actionQueryParam: apiModulo?.actionQueryParam ?? parametrizacion.actionQueryParam,
    submenuTitle: apiModulo?.submenuTitle ?? parametrizacion.submenuTitle,
    submenuHint: apiModulo?.submenuHint ?? parametrizacion.submenuHint,
    basePath: apiModulo?.frontPath,
    formularioComponent: apiModulo?.formularioComponent ?? null,
    formularioId: apiModulo?.formularioId ?? null,
    rutaId: apiModulo?.rutaId ?? null,
    menuPath: apiModulo?.menuPath ?? null,
  };
}

export function resolvePanelCopy(
  parametrizacion: ParametrosGobernanzaModuloMenuParametrizacion,
  config: GobernanzaModuloConfig
): { panelTitle: string; panelHint: string; submenuTitle: string; submenuHint: string } {
  return {
    panelTitle: config.label || parametrizacion.panelTitle,
    panelHint: config.description || config.submenuHint || parametrizacion.panelHint,
    submenuTitle: config.submenuTitle || parametrizacion.submenuTitle,
    submenuHint: config.submenuHint || parametrizacion.submenuHint,
  };
}
