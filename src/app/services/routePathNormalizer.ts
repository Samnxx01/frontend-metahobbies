const LEGACY_SEGMENT_ALIASES: Record<string, string> = {
  gobernaza: 'gobernanza',
};

const normalizeSlashes = (path: string): string =>
  String(path || '').trim().replace(/\/+/g, '/');

export const normalizeRoutePath = (path: string): string => {
  const clean = normalizeSlashes(path);
  if (!clean) return '/';

  const withLeadingSlash = clean.startsWith('/') ? clean : `/${clean}`;
  const normalizedSegments = withLeadingSlash
    .split('/')
    .map((segment) => {
      const lowered = String(segment || '').toLowerCase();
      return LEGACY_SEGMENT_ALIASES[lowered] || segment;
    })
    .join('/');

  return normalizedSegments || '/';
};

export const toRelativeRoutePath = (path: string): string =>
  normalizeRoutePath(path).replace(/^\//, '');
