import React from 'react';
import { ActionBar } from './ActionBar';
import type { ActionId, UiActionDef } from './types';
import { useParameterizedActions } from './useParameterizedActions';

export type ParameterizedActionBarProps<TContext> = {
  /** Catálogo de la pantalla (`createActionCatalog` / `buildXxxActionCatalog`). */
  catalog: readonly UiActionDef<TContext>[];
  /** IDs permitidos desde parametrización o reglas de negocio. */
  allowedIds: readonly ActionId[];
  context: TContext;
  className?: string;
  globalDisabled?: boolean;
};

/**
 * Barra de acciones reutilizable: registro central + IDs parametrizados → solo renderiza lo permitido.
 */
export function ParameterizedActionBar<TContext>({
  catalog,
  allowedIds,
  context,
  className,
  globalDisabled,
}: ParameterizedActionBarProps<TContext>): React.ReactElement {
  const actions = useParameterizedActions({ catalog, allowedIds, context });
  return (
    <ActionBar
      actions={actions}
      context={context}
      className={className}
      globalDisabled={globalDisabled}
    />
  );
}
