/** Documento o referencia con ID ofuscado (iud) o legacy (_id / id). */
export type EntityRef = {
  iud?: string | null;
  _id?: string | null;
  id?: string | null;
} | null | undefined;

/**
 * Resuelve el ID público devuelto por publicId middleware (preferir `iud`).
 * Fallback a `_id` / `id` para respuestas legacy o populate sin enmascarar.
 */
export function resolveEntityPublicId(ref: EntityRef): string {
  return String(ref?.iud ?? ref?._id ?? ref?.id ?? '').trim();
}

/** Normaliza un valor crudo u objeto con refs para query, path o body API. */
export function normalizePublicIdForApi(id: unknown): string {
  if (id == null) return '';
  if (typeof id === 'object') {
    return resolveEntityPublicId(id as EntityRef);
  }
  return String(id).trim();
}

/** Codifica ID para segmentos de URL (UUID ofuscado u ObjectId). */
export function encodePublicIdForPath(id: unknown): string {
  const norm = normalizePublicIdForApi(id);
  return norm ? encodeURIComponent(norm) : '';
}
