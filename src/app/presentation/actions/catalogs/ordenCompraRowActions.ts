import type { InventarioOrdenCompra } from '@/app/services/inventarioService';
import { createActionCatalog } from '../createActionCatalog';
import { MABS_ACTION_DEFINITIONS } from '../registry/actionDefinitions';
import type { ActionId } from '../types';

export const ORDEN_COMPRA_ROW_ACTION_IDS = {
  VER: MABS_ACTION_DEFINITIONS.VER.id,
  EDITAR: MABS_ACTION_DEFINITIONS.EDITAR.id,
  ELIMINAR: MABS_ACTION_DEFINITIONS.ELIMINAR.id,
} as const;

export type OrdenCompraRowActionHelpers = {
  esTenantSuperAdmin: boolean;
  parametrizedIds?: readonly ActionId[];
};

export type OrdenCompraRowActionHandlers = {
  onVer: (orden: InventarioOrdenCompra) => void;
  onEditar: (orden: InventarioOrdenCompra) => void;
  onEliminar: (orden: InventarioOrdenCompra) => void;
};

function fallbackOrdenCompraAllowedIds(
  orden: InventarioOrdenCompra,
  helpers: Pick<OrdenCompraRowActionHelpers, 'esTenantSuperAdmin'>,
): ActionId[] {
  const ids: ActionId[] = [ORDEN_COMPRA_ROW_ACTION_IDS.VER];
  const editable = ['VERIFICACION', 'ABIERTA'].includes(orden.estado) || helpers.esTenantSuperAdmin;
  const eliminable = orden.estado !== 'CERRADA';
  if (editable) ids.push(ORDEN_COMPRA_ROW_ACTION_IDS.EDITAR);
  if (eliminable) ids.push(ORDEN_COMPRA_ROW_ACTION_IDS.ELIMINAR);
  return ids;
}

export function resolveOrdenCompraRowAllowedIds(
  orden: InventarioOrdenCompra,
  helpers: OrdenCompraRowActionHelpers,
): ActionId[] {
  const parametrized = (helpers.parametrizedIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
  if (parametrized.length > 0) return parametrized;
  return fallbackOrdenCompraAllowedIds(orden, helpers);
}

export function buildOrdenCompraRowActionCatalog(
  handlers: OrdenCompraRowActionHandlers,
  helpers: Pick<OrdenCompraRowActionHelpers, 'esTenantSuperAdmin'>,
) {
  return createActionCatalog<InventarioOrdenCompra>([
    {
      id: ORDEN_COMPRA_ROW_ACTION_IDS.VER,
      onClick: (orden) => handlers.onVer(orden),
    },
    {
      id: ORDEN_COMPRA_ROW_ACTION_IDS.EDITAR,
      onClick: (orden) => handlers.onEditar(orden),
      overrides: {
        title: (orden) =>
          helpers.esTenantSuperAdmin && !['VERIFICACION', 'ABIERTA'].includes(orden.estado)
            ? 'Editar (SuperAdmin)'
            : 'Editar',
      },
    },
    {
      id: ORDEN_COMPRA_ROW_ACTION_IDS.ELIMINAR,
      onClick: (orden) => handlers.onEliminar(orden),
      overrides: {
        title: (orden) =>
          orden.estado !== 'ABIERTA' ? 'Eliminar y reversar relacionados' : 'Eliminar',
      },
    },
  ]);
}
