import type { Route } from '@/app/services/routesService';
import { createActionCatalog } from '../createActionCatalog';
import { MABS_ACTION_DEFINITIONS } from '../registry/actionDefinitions';
import type { ActionId } from '../types';

export const ROUTE_ROW_ACTION_IDS = {
  PREVIEW: MABS_ACTION_DEFINITIONS.PREVIEW.id,
  EDITAR: MABS_ACTION_DEFINITIONS.EDITAR.id,
  BAJA: MABS_ACTION_DEFINITIONS.BAJA.id,
} as const;

export type RouteRowActionHelpers = {
  canEdit: (route: Route) => boolean;
  canManageBaja: (route: Route) => boolean;
  /** IDs desde parametrización (p. ej. ruta.formulariosConfig / acciones del API). */
  parametrizedIds?: readonly ActionId[];
};

export type RouteRowActionHandlers = {
  onPreview: (route: Route) => void | Promise<void>;
  onEdit: (route: Route) => void;
  onDelete: (route: Route) => void | Promise<void>;
};

function fallbackRouteRowAllowedIds(route: Route, helpers: Pick<RouteRowActionHelpers, 'canEdit' | 'canManageBaja'>): ActionId[] {
  const ids: ActionId[] = [ROUTE_ROW_ACTION_IDS.PREVIEW];
  if (helpers.canEdit(route)) ids.push(ROUTE_ROW_ACTION_IDS.EDITAR);
  if (helpers.canManageBaja(route)) ids.push(ROUTE_ROW_ACTION_IDS.BAJA);
  return ids;
}

/** IDs permitidos: parametrización del API o reglas locales. */
export function resolveRouteRowAllowedIds(route: Route, helpers: RouteRowActionHelpers): ActionId[] {
  const parametrized = (helpers.parametrizedIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
  if (parametrized.length > 0) return parametrized;
  return fallbackRouteRowAllowedIds(route, helpers);
}

/** Catálogo de fila — solo enlaza handlers; metadatos vienen del registro central. */
export function buildRouteRowActionCatalog(handlers: RouteRowActionHandlers) {
  return createActionCatalog<Route>([
    {
      id: ROUTE_ROW_ACTION_IDS.PREVIEW,
      onClick: (route) => {
        void handlers.onPreview(route);
      },
    },
    {
      id: ROUTE_ROW_ACTION_IDS.EDITAR,
      onClick: (route) => handlers.onEdit(route),
    },
    {
      id: ROUTE_ROW_ACTION_IDS.BAJA,
      onClick: (route) => {
        void handlers.onDelete(route);
      },
      overrides: {
        title: (route) =>
          String(route.accionBajaPermitida || '').toUpperCase() === 'ELIMINAR' ? 'Eliminar' : 'Desactivar',
      },
    },
  ]);
}
