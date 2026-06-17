import {
  encodePublicIdForPath,
  normalizePublicIdForApi,
  resolveEntityPublicId,
  type EntityRef,
} from '@/app/utils/entityPublicId';
export function adminEntityId(ref: EntityRef | unknown): string {
  if (ref == null) return '';
  if (typeof ref === 'object') return resolveEntityPublicId(ref as EntityRef);
  return normalizePublicIdForApi(ref);
}

export function adminEntityIdForPath(ref: unknown): string {
  return encodePublicIdForPath(adminEntityId(ref));
}

export function sameAdminEntityId(a: unknown, b: unknown): boolean {
  const left = adminEntityId(a);
  const right = adminEntityId(b);
  return Boolean(left && right && left === right);
}

/** Coincide ref API (`iud` / `_id` / `id`) con un id crudo u otra ref. */
export function matchesAdminEntityRef(ref: EntityRef | unknown, id: unknown): boolean {
  if (sameAdminEntityId(ref, id)) return true;
  if (ref && typeof ref === 'object') {
    const legacyId = (ref as EntityRef & { _id?: string | null })._id;
    if (legacyId && sameAdminEntityId(legacyId, id)) return true;
  }
  return false;
}
