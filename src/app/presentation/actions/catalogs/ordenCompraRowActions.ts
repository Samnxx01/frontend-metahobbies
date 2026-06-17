import type { InventarioOrdenCompra, EstadoOrdenCompraConfig } from '@/app/services/inventarioService';
import { createActionCatalog } from '../createActionCatalog';
import { MABS_ACTION_DEFINITIONS } from '../registry/actionDefinitions';
import type { ActionId } from '../types';
import { puedeEditarOrdenCompra } from '@/app/presentation/pages/admin/utils/estadoOrdenCompraUi';

export const ORDEN_COMPRA_ROW_ACTION_IDS = {
  VER: MABS_ACTION_DEFINITIONS.VER.id,
  EDITAR: MABS_ACTION_DEFINITIONS.EDITAR.id,
  ELIMINAR: MABS_ACTION_DEFINITIONS.ELIMINAR.id,
} as const;

export type OrdenCompraRowActionHelpers = {
  esTenantSuperAdmin: boolean;
  estadosOrden?: EstadoOrdenCompraConfig[];
  parametrizedIds?: readonly ActionId[];
};

export type OrdenCompraRowActionHandlers = {
  onVer: (orden: InventarioOrdenCompra) => void;
  onEditar: (orden: InventarioOrdenCompra) => void;
  onEliminar: (orden: InventarioOrdenCompra) => void;
};

function fallbackOrdenCompraAllowedIds(
  orden: InventarioOrdenCompra,
  helpers: Pick<OrdenCompraRowActionHelpers, 'esTenantSuperAdmin' | 'estadosOrden'>,
): ActionId[] {
  const ids: ActionId[] = [ORDEN_COMPRA_ROW_ACTION_IDS.VER];
  const editable = puedeEditarOrdenCompra(orden.estado, helpers.estadosOrden ?? [], {
    esTenantSuperAdmin: helpers.esTenantSuperAdmin,
  });
  const eliminable = editable || helpers.esTenantSuperAdmin;
  if (editable) ids.push(ORDEN_COMPRA_ROW_ACTION_IDS.EDITAR);
  if (eliminable && orden.estado !== 'CERRADA') ids.push(ORDEN_COMPRA_ROW_ACTION_IDS.ELIMINAR);
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
  helpers: Pick<OrdenCompraRowActionHelpers, 'esTenantSuperAdmin' | 'estadosOrden'>,
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
          helpers.esTenantSuperAdmin && String(orden.estado || '').toUpperCase() !== 'VERIFICACION'
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
