import type { UiActionDef } from './types';

export function sortActionsByOrder<TContext>(actions: readonly UiActionDef<TContext>[]): UiActionDef<TContext>[] {
  return [...actions].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}
