import { useMemo } from 'react';
import { filterVisibleActions } from './filterVisibleActions';
import type { ActionId, UiActionDef } from './types';

export type UseParameterizedActionsParams<TContext> = {
  /** Catálogo de la pantalla (createActionCatalog). */
  catalog: readonly UiActionDef<TContext>[];
  /** IDs permitidos: parametrización API, JWT o reglas de negocio. */
  allowedIds: readonly ActionId[];
  context: TContext;
};

/**
 * Intersección catálogo ∩ permitidos — listo para `<ActionBar />`.
 */
export function useParameterizedActions<TContext>({
  catalog,
  allowedIds,
  context,
}: UseParameterizedActionsParams<TContext>): UiActionDef<TContext>[] {
  return useMemo(
    () => filterVisibleActions(catalog, allowedIds, context),
    [catalog, allowedIds, context],
  );
}
