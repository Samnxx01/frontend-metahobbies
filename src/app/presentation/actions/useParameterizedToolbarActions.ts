import { useMemo } from 'react';
import { filterVisibleActions } from './filterVisibleActions';
import { resolveVisibleActionIds, type ResolveVisibleActionIdsOptions } from './resolveVisibleActionIds';
import type { ActionId, UiActionDef } from './types';

export type UseParameterizedToolbarActionsParams<TContext> = {
  catalog: readonly UiActionDef<TContext>[];
  context: TContext;
  visibleIds?: readonly ActionId[] | null;
  hiddenIds?: readonly ActionId[] | null;
  parametrizedIds?: readonly ActionId[] | null;
  fallbackVisibleIds?: () => readonly ActionId[];
};

export function useParameterizedToolbarActions<TContext>({
  catalog,
  context,
  visibleIds,
  hiddenIds,
  parametrizedIds,
  fallbackVisibleIds,
}: UseParameterizedToolbarActionsParams<TContext>): UiActionDef<TContext>[] {
  const catalogIds = useMemo(() => catalog.map((a) => a.id), [catalog]);

  const resolvedIds = useMemo(() => {
    const options: ResolveVisibleActionIdsOptions = {
      visibleIds,
      hiddenIds,
      parametrizedIds,
      fallback: fallbackVisibleIds,
    };
    return resolveVisibleActionIds(catalogIds, options);
  }, [catalogIds, visibleIds, hiddenIds, parametrizedIds, fallbackVisibleIds]);

  return useMemo(
    () => filterVisibleActions(catalog, resolvedIds, context),
    [catalog, resolvedIds, context],
  );
}
