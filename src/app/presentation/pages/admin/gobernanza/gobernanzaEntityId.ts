import {
  encodePublicIdForPath,
  normalizePublicIdForApi,
  resolveEntityPublicId,
  type EntityRef,
} from '@/app/utils/entityPublicId';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const PUBLIC_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ID público (preferir `iud` ofuscado) desde documento API o valor crudo. */
export function gobernanzaEntityId(ref: EntityRef | unknown): string {
  if (ref == null) return '';
  if (typeof ref === 'object') return resolveEntityPublicId(ref as EntityRef);
  return normalizePublicIdForApi(ref);
}

/** ObjectId legacy o UUID público (iud) para refs persistidas en gobernanza. */
export function esGobernanzaRefIdPersistido(id: string): boolean {
  const norm = String(id || '').trim();
  return OBJECT_ID_REGEX.test(norm) || PUBLIC_UUID_REGEX.test(norm);
}

export function normalizarGobernanzaRefId(value: unknown): string {
  const id = gobernanzaEntityId(value);
  return esGobernanzaRefIdPersistido(id) ? id : '';
}

export function gobernanzaEntityIdForPath(ref: unknown): string {
  return encodePublicIdForPath(gobernanzaEntityId(ref));
}
