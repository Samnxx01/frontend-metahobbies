import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

export const toId = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'object') {
    return resolveEntityPublicId(value as { iud?: string; _id?: string; id?: string });
  }
  return normalizePublicIdForApi(value);
};
