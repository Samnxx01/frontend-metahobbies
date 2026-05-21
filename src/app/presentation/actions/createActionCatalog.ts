import { Circle } from 'lucide-react';
import { getActionDefinition, type MabsActionDefinitionKey } from './registry/actionDefinitions';
import type { ActionId, UiActionDef } from './types';

export type ActionBinding<TContext> = {
  /** ID del registro central o personalizado. */
  id: ActionId | MabsActionDefinitionKey;
  onClick: (ctx: TContext) => void;
  /** Sobrescribe label, title, disabled, etc. */
  overrides?: Partial<Omit<UiActionDef<TContext>, 'id' | 'onClick'>>;
};

/**
 * Arma el catálogo de una pantalla a partir del registro central + handlers locales.
 * Mismo patrón que Angular: definitions centralizadas, handlers por pantalla.
 */
export function createActionCatalog<TContext>(bindings: readonly ActionBinding<TContext>[]): UiActionDef<TContext>[] {
  return bindings.map((binding) => {
    const def = getActionDefinition(binding.id);
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
      iconClassName: def.iconClassName,
      onClick: binding.onClick,
      ...binding.overrides,
    };
  });
}

/**
 * IDs permitidos desde parametrización (API) con fallback a reglas locales.
 */
export function resolveAllowedActionIds(
  parametrized: readonly ActionId[] | undefined | null,
  fallback: () => readonly ActionId[],
): ActionId[] {
  const fromApi = (parametrized ?? []).map((id) => String(id).trim()).filter(Boolean);
  if (fromApi.length > 0) return fromApi;
  return [...fallback()];
}
