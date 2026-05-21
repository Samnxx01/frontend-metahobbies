import type { ActionId, UiActionDef } from './types';

/**
 * Filtra el catálogo local por IDs permitidos (parametrización / permisos efectivos).
 */
export function filterVisibleActions<TContext>(
  catalog: readonly UiActionDef<TContext>[],
  allowedIds: readonly ActionId[],
  ctx: TContext,
): UiActionDef<TContext>[] {
  const allowed = new Set(allowedIds);
  return catalog.filter((action) => {
    if (!allowed.has(action.id)) return false;
    if (action.isAllowed && !action.isAllowed(ctx)) return false;
    return true;
  });
}
