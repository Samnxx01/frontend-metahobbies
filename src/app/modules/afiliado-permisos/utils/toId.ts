import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

export const toId = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'object') {
    return resolveEntityPublicId(value as { iud?: string; _id?: string; id?: string });
  }
  return normalizePublicIdForApi(value);
};

/** Lista de ids API (ObjectId o iud ofuscado) → ids públicos canónicos. */
export const normalizeIdList = (values: unknown[] | undefined | null): string[] =>
  (values ?? [])
    .map((value) => toId(value))
    .filter(Boolean);
