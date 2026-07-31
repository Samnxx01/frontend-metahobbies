import React from 'react';
import { GovernedButton } from './GovernedButton';
import { cn } from '@/lib/utils';
import { sortActionsByOrder } from './sortActionsByOrder';
import type { UiActionDef } from './types';

export type ToolbarActionBarProps<TContext> = {
  actions: readonly UiActionDef<TContext>[];
  context: TContext;
  className?: string;
  globalDisabled?: boolean;
};

function resolveTitle<TContext>(action: UiActionDef<TContext>, ctx: TContext): string {
  if (typeof action.title === 'function') return action.title(ctx);
  return action.title ?? action.label;
}

/**
 * Barra de botones con icono + etiqueta (toolbars de página / card header).
 */
export function ToolbarActionBar<TContext>({
  actions,
  context,
  className,
  globalDisabled = false,
}: ToolbarActionBarProps<TContext>): React.ReactElement {
  const sorted = sortActionsByOrder(actions);

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {sorted.map((action) => {
        const Icon = action.icon;
        const loading = action.isLoading?.(context) ?? false;
        const disabled = globalDisabled || loading || (action.isDisabled?.(context) ?? false);
        const showLabel = action.showLabel !== false && action.size !== 'icon';
        const label = loading && action.loadingLabel ? action.loadingLabel : action.label;

        return (
          <GovernedButton
            actionId={action.id}
            key={action.id}
            type="button"
            variant={action.variant ?? 'outline'}
            size={action.size ?? (showLabel ? 'default' : 'icon')}
            className={action.iconClassName}
            disabled={disabled}
            title={resolveTitle(action, context)}
            aria-label={action.label}
            onClick={() => action.onClick(context)}
          >
            <Icon className={cn('h-4 w-4', showLabel && 'mr-2', loading && 'animate-spin')} />
            {showLabel ? label : null}
          </GovernedButton>
        );
      })}
    </div>
  );
}
