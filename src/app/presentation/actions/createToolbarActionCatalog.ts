import { Circle } from 'lucide-react';
import { getToolbarActionDefinition, type ToolbarActionDefinitionKey } from './registry/toolbarActionDefinitions';
import type { ActionId, UiActionDef } from './types';

export type ToolbarActionBinding<TContext> = {
  id: ActionId | ToolbarActionDefinitionKey;
  onClick: (ctx: TContext) => void;
  overrides?: Partial<Omit<UiActionDef<TContext>, 'id' | 'onClick'>>;
};

export function createToolbarActionCatalog<TContext>(
  bindings: readonly ToolbarActionBinding<TContext>[],
): UiActionDef<TContext>[] {
  return bindings.map((binding) => {
    const def = getToolbarActionDefinition(binding.id);
    if (!def) {
      return {
        id: binding.id,
        label: String(binding.id),
        icon: Circle,
        onClick: binding.onClick,
        ...binding.overrides,
      };
    }
    return {
      id: def.id,
      label: def.label,
      icon: def.icon,
      variant: def.variant,
      size: def.size,
      showLabel: def.showLabel,
      order: def.order,
      iconClassName: def.iconClassName,
      onClick: binding.onClick,
      ...binding.overrides,
    };
  });
}
