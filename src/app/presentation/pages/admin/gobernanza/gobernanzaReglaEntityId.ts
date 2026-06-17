import { gobernanzaEntityId } from './gobernanzaEntityId';

export type ReglaRowRef = {
  'x-regla-id'?: string | null;
  reglaIdEncrypted?: string | null;
  iud?: string | null;
  rid?: string | null;
  _id?: string | null;
};

/** ID ofuscado de regla para header `x-regla-id` y selects (preferir encriptado / iud). */
export function resolveReglaPublicId(row: ReglaRowRef | unknown): string {
  if (row == null || typeof row !== 'object') {
    return gobernanzaEntityId(row);
  }
  const r = row as ReglaRowRef;
  const fromHeader = String(r['x-regla-id'] || r.reglaIdEncrypted || r.iud || '').trim();
  if (fromHeader) return fromHeader;
  return gobernanzaEntityId(r);
}

/** ObjectId interno (rid / _id) para indexar respuestas legacy. */
export function resolveReglaLegacyId(row: ReglaRowRef | unknown): string {
  if (row == null || typeof row !== 'object') return '';
  const r = row as ReglaRowRef;
  return String(r.rid || r._id || '').trim();
}
