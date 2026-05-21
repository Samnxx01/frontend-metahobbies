import type { ActionId } from './types';

export type ResolveVisibleActionIdsOptions = {
  /** Whitelist explícita (props del consumidor). Máxima prioridad. */
  visibleIds?: readonly ActionId[] | null;
  /** Blacklist opcional. Se aplica tras resolver la whitelist efectiva. */
  hiddenIds?: readonly ActionId[] | null;
  /** IDs desde API / gobernanza / parametrización de ruta. */
  parametrizedIds?: readonly ActionId[] | null;
  /** Si no hay visibleIds ni parametrizedIds. */
  fallback?: () => readonly ActionId[];
};

/**
 * Resuelve qué acciones mostrar: visibleIds > parametrizedIds > fallback > todos los del catálogo.
 */
export function resolveVisibleActionIds(
  catalogIds: readonly ActionId[],
  options: ResolveVisibleActionIdsOptions = {},
): ActionId[] {
  const normalize = (ids: readonly ActionId[] | null | undefined): ActionId[] =>
    (ids ?? []).map((id) => String(id).trim()).filter(Boolean);

  const explicit = normalize(options.visibleIds);
  if (explicit.length > 0) {
    return applyHidden(explicit.filter((id) => catalogIds.includes(id)), options.hiddenIds);
  }

  const parametrized = normalize(options.parametrizedIds);
  if (parametrized.length > 0) {
    return applyHidden(parametrized.filter((id) => catalogIds.includes(id)), options.hiddenIds);
  }

  const fallback = options.fallback ? normalize(options.fallback()) : [];
  const base = fallback.length > 0 ? fallback : [...catalogIds];
  return applyHidden(base.filter((id) => catalogIds.includes(id)), options.hiddenIds);
}

function applyHidden(ids: ActionId[], hiddenIds: readonly ActionId[] | null | undefined): ActionId[] {
  const hidden = new Set(normalizeIds(hiddenIds));
  if (hidden.size === 0) return ids;
  return ids.filter((id) => !hidden.has(id));
}

function normalizeIds(ids: readonly ActionId[] | null | undefined): ActionId[] {
  return (ids ?? []).map((id) => String(id).trim()).filter(Boolean);
}
