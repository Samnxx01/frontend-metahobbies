import React from 'react';
import { ToolbarActionBar } from './ToolbarActionBar';
import type { ActionId, UiActionDef } from './types';
import { useParameterizedToolbarActions } from './useParameterizedToolbarActions';

export type ParameterizedToolbarActionBarProps<TContext> = {
  catalog: readonly UiActionDef<TContext>[];
  context: TContext;
  /** Whitelist: solo estos IDs se renderizan. */
  visibleIds?: readonly ActionId[] | null;
  /** Blacklist: oculta IDs concretos. */
  hiddenIds?: readonly ActionId[] | null;
  /** Desde API / gobernanza (si no hay visibleIds). */
  parametrizedIds?: readonly ActionId[] | null;
  /** Fallback si no hay visibleIds ni parametrizedIds (por defecto: todos del catálogo). */
  fallbackVisibleIds?: () => readonly ActionId[];
  className?: string;
  globalDisabled?: boolean;
};

/**
 * Toolbar parametrizable: catálogo central + visibleIds / parametrizedIds → renderiza solo lo permitido.
 */
export function ParameterizedToolbarActionBar<TContext>({
  catalog,
  context,
  visibleIds,
  hiddenIds,
  parametrizedIds,
  fallbackVisibleIds,
  className,
  globalDisabled,
}: ParameterizedToolbarActionBarProps<TContext>): React.ReactElement {
  const actions = useParameterizedToolbarActions({
    catalog,
    context,
    visibleIds,
    hiddenIds,
    parametrizedIds,
    fallbackVisibleIds,
  });

  return (
    <ToolbarActionBar
      actions={actions}
      context={context}
      className={className}
      globalDisabled={globalDisabled}
    />
  );
}
