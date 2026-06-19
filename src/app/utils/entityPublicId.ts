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

const OBJECT_ID_HEX = /^[0-9a-fA-F]{24}$/;
const PUBLIC_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ObjectId legacy o UUID público (`iud`) — no es un correo ni nombre legible. */
export function isOpaqueDocumentId(value: unknown): boolean {
  const v = String(value ?? '').trim();
  return OBJECT_ID_HEX.test(v) || PUBLIC_UUID.test(v);
}

/** Etiqueta corta para mostrar en UI sin exponer el identificador completo. */
export function formatOpaqueIdShort(value: unknown, suffixLen = 8): string {
  const v = String(value ?? '').trim();
  if (!v) return '—';
  if (v.length <= suffixLen + 3) return v;
  return `···${v.slice(-suffixLen)}`;
}

export function formatUserDisplayLabel(input: {
  nombre?: string | null;
  apellido?: string | null;
  correo?: string | null;
  fallback?: string;
}): string {
  const nombre = [input.nombre, input.apellido].map((v) => String(v ?? '').trim()).filter(Boolean).join(' ').trim();
  const correo = String(input.correo ?? '').trim();
  if (nombre) return nombre;
  if (correo && !isOpaqueDocumentId(correo)) return correo;
  return String(input.fallback ?? '').trim() || 'Usuario no identificado';
}
