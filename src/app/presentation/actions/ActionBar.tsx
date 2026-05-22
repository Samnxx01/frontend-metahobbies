import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UiActionDef } from './types';

export type ActionBarProps<TContext> = {
  actions: readonly UiActionDef<TContext>[];
  context: TContext;
  className?: string;
  /** Deshabilita todas las acciones (p. ej. guardando o eliminando). */
  globalDisabled?: boolean;
};

function resolveTitle<TContext>(action: UiActionDef<TContext>, ctx: TContext): string {
  if (typeof action.title === 'function') return action.title(ctx);
  return action.title ?? action.label;
}

/**
 * Renderiza botones a partir de acciones ya filtradas (`filterVisibleActions`).
 */
export function ActionBar<TContext>({
  actions,
  context,
  className,
  globalDisabled = false,
}: ActionBarProps<TContext>): React.ReactElement {
  return (
    <div className={cn('flex justify-end gap-1', className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        const disabled = globalDisabled || (action.isDisabled?.(context) ?? false);
        return (
          <Button
            key={action.id}
            type="button"
            variant={action.variant ?? 'ghost'}
            size={action.size ?? 'icon'}
            className={cn(action.size === 'icon' || !action.size ? 'h-8 w-8' : undefined, action.iconClassName)}
            disabled={disabled}
            title={resolveTitle(action, context)}
            aria-label={action.label}
            onClick={() => action.onClick(context)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
