type MongoIdLike =
  | string
  | number
  | null
  | undefined
  | { _id?: unknown; iud?: unknown; id?: unknown; $oid?: unknown; oid?: unknown };

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const PUBLIC_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const extractMongoIdRaw = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  if (typeof value === 'object') {
    const obj = value as MongoIdLike;
    if (obj.$oid != null) return extractMongoIdRaw(obj.$oid);
    if (obj.oid != null) return extractMongoIdRaw(obj.oid);
    if (obj._id != null) return extractMongoIdRaw(obj._id);
    if (obj.iud != null) return extractMongoIdRaw(obj.iud);
    if (obj.id != null) return extractMongoIdRaw(obj.id);
  }

  return '';
};

export const normalizeMongoId = (value: unknown): string => {
  const raw = extractMongoIdRaw(value);
  if (OBJECT_ID_REGEX.test(raw)) return raw;
  if (PUBLIC_UUID_REGEX.test(raw)) return raw;
  return '';
};

export const normalizeMongoIdList = (value: unknown): string[] => {
  if (value == null || value === '') return [];
  const items = Array.isArray(value) ? value : [value];
  return [...new Set(items.map((item) => normalizeMongoId(item)).filter(Boolean))];
};

export const normalizeMongoIdOrNull = (value: unknown): string | null => {
  const normalized = normalizeMongoId(value);
  return normalized || null;
};

/** ID público (iud UUID) o ObjectId para llamadas API de rutas. */
export const resolveRouteApiId = (route?: { iud?: string; _id?: string } | null): string =>
  String(route?.iud || route?._id || '').trim();
