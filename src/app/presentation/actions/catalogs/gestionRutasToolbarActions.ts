import { createToolbarActionCatalog } from '../createToolbarActionCatalog';
import { TOOLBAR_ACTION_DEFINITIONS } from '../registry/toolbarActionDefinitions';
import type { ActionId } from '../types';

export const GESTION_RUTAS_TOOLBAR_ACTION_IDS = {
  REFRESCAR: TOOLBAR_ACTION_DEFINITIONS.REFRESCAR.id,
  USUARIOS: TOOLBAR_ACTION_DEFINITIONS.USUARIOS.id,
  VER_ARBOL: TOOLBAR_ACTION_DEFINITIONS.VER_ARBOL.id,
  PARAM_TIPOS: TOOLBAR_ACTION_DEFINITIONS.PARAM_TIPOS.id,
  PARAM_ACCESOS: TOOLBAR_ACTION_DEFINITIONS.PARAM_ACCESOS.id,
  NUEVA_SUITE: TOOLBAR_ACTION_DEFINITIONS.NUEVA_SUITE.id,
  NUEVO_MODULO: TOOLBAR_ACTION_DEFINITIONS.NUEVO_MODULO.id,
  NUEVO_FORMULARIO: TOOLBAR_ACTION_DEFINITIONS.NUEVO_FORMULARIO.id,
  NUEVO_SUBFORMULARIO: TOOLBAR_ACTION_DEFINITIONS.NUEVO_SUBFORMULARIO.id,
} as const;

/** Todos los botones del toolbar de Gestión de Rutas (orden por defecto). */
export const GESTION_RUTAS_TOOLBAR_ALL_IDS: ActionId[] = [
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.REFRESCAR,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.USUARIOS,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.VER_ARBOL,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.PARAM_TIPOS,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.PARAM_ACCESOS,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVA_SUITE,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_MODULO,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_FORMULARIO,
  GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_SUBFORMULARIO,
];

export type GestionRutasToolbarContext = {
  loading: boolean;
};

export type GestionRutasToolbarHandlers = {
  onRefrescar: () => void;
  onUsuarios: () => void;
  onVerArbol: () => void;
  onParamTipos: () => void;
  onParamAccesos: () => void;
  onNuevaSuite: () => void;
  onNuevoModulo: () => void;
  onNuevoFormulario: () => void;
  onNuevoSubFormulario: () => void;
};

export function buildGestionRutasToolbarCatalog(handlers: GestionRutasToolbarHandlers) {
  return createToolbarActionCatalog<GestionRutasToolbarContext>([
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.REFRESCAR,
      onClick: () => handlers.onRefrescar(),
      overrides: {
        isLoading: (ctx) => ctx.loading,
      },
    },
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.USUARIOS,
      onClick: () => handlers.onUsuarios(),
    },
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.VER_ARBOL,
      onClick: () => handlers.onVerArbol(),
    },
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.PARAM_TIPOS,
      onClick: () => handlers.onParamTipos(),
    },
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.PARAM_ACCESOS,
      onClick: () => handlers.onParamAccesos(),
    },
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVA_SUITE,
      onClick: () => handlers.onNuevaSuite(),
    },
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_MODULO,
      onClick: () => handlers.onNuevoModulo(),
    },
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_FORMULARIO,
      onClick: () => handlers.onNuevoFormulario(),
    },
    {
      id: GESTION_RUTAS_TOOLBAR_ACTION_IDS.NUEVO_SUBFORMULARIO,
      onClick: () => handlers.onNuevoSubFormulario(),
    },
  ]);
}
