import {
  encodePublicIdForPath,
  normalizePublicIdForApi,
  resolveEntityPublicId,
} from '@/app/utils/entityPublicId';

const IMG_FONDO_VER_PREFIX = '/api/front/imgFondo/ver/';
const IMG_PERFIL_VER_PREFIX = '/api/imgPerfil/ver/';
const PUBLICIDAD_IMAGEN_PREFIX = '/api/configuration/publicidad/modal/imagen/';

const API_IMAGE_ROUTE_RESOLVERS: Array<{
  pattern: RegExp;
  prefix: string;
}> = [
  { pattern: /\/api\/front\/imgFondo\/ver\/([^/?#]+)/i, prefix: IMG_FONDO_VER_PREFIX },
  { pattern: /\/api\/imgPerfil\/ver\/([^/?#]+)/i, prefix: IMG_PERFIL_VER_PREFIX },
  { pattern: /\/api\/imgFondo\/ver\/([^/?#]+)/i, prefix: '/api/imgFondo/ver/' },
  {
    pattern: /\/api\/configuration\/publicidad\/modal\/imagen\/([^/?#]+)/i,
    prefix: PUBLICIDAD_IMAGEN_PREFIX,
  },
];

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const PUBLIC_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// En producción convierte /api/... a URL absoluta apuntando a Render.
// En dev queda vacío y el proxy de Vite maneja las rutas relativas.
const API_IMAGE_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/api\/?$/, '');

function stripUrlOrigin(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value.replace(/^https?:\/\/[^/]+/i, '');
  }
}

function rebuildApiImagePath(path: string): string {
  for (const { pattern, prefix } of API_IMAGE_ROUTE_RESOLVERS) {
    const match = path.match(pattern);
    if (!match) continue;
    const id = normalizePublicIdForApi(match[1]);
    return id ? `${prefix}${encodePublicIdForPath(id)}` : '';
  }
  return path;
}

/** URL relativa `/api/.../ver/{id}` con id público (iud) normalizado. */
export function buildImgFondoVerUrl(id: unknown): string {
  const norm = normalizePublicIdForApi(id);
  return norm ? `${IMG_FONDO_VER_PREFIX}${encodePublicIdForPath(norm)}` : '';
}

export function buildImgPerfilVerUrl(id: unknown): string {
  const norm = normalizePublicIdForApi(id);
  return norm ? `${IMG_PERFIL_VER_PREFIX}${encodePublicIdForPath(norm)}` : '';
}

export function buildPublicidadImagenUrl(id: unknown): string {
  const norm = normalizePublicIdForApi(id);
  return norm ? `${PUBLICIDAD_IMAGEN_PREFIX}${encodePublicIdForPath(norm)}` : '';
}

/**
 * Normaliza URLs de assets API para render (img src, background-image).
 * - Convierte localhost/onrender absolutas → path relativo `/api/...`
 * - Reemplaza ObjectId en path por iud cuando aplica
 * - Acepta id crudo (ObjectId o UUID)
 */
export function normalizeImageRenderUrl(urlOrId: unknown): string {
  const raw = String(urlOrId ?? '').trim();
  if (!raw) return '';

  if (/^(data:|blob:)/i.test(raw)) return raw;

  let path = stripUrlOrigin(raw);
  if (!path.startsWith('/')) path = `/${path}`;

  const rebuilt = rebuildApiImagePath(path);
  if (rebuilt !== path) return rebuilt;

  if (OBJECT_ID_REGEX.test(raw) || PUBLIC_UUID_REGEX.test(raw)) {
    return buildImgFondoVerUrl(raw);
  }

  const resolved = path.startsWith('/') ? path : raw;
  if (API_IMAGE_ORIGIN && resolved.startsWith('/api')) {
    return `${API_IMAGE_ORIGIN}${resolved}`;
  }
  return resolved;
}

export function normalizeImagenFondoAsset<T extends { id?: string; url?: string }>(
  row: T
): T {
  const id = normalizePublicIdForApi(row.id);
  const url = normalizeImageRenderUrl(row.url || id);
  return { ...row, ...(id ? { id } : {}), ...(url ? { url } : {}) };
}

type BrandingWidgets = {
  loginBackground?: { imageUrl?: string; enabled?: boolean };
  loadingBackground?: { imageUrl?: string; enabled?: boolean };
  homeImage?: { imageUrl?: string; enabled?: boolean };
  [key: string]: unknown;
};

/** Normaliza imageUrl en branding para render y persistencia. */
export function normalizeBrandingWidgetImages<T extends { widgets?: BrandingWidgets }>(
  branding: T
): T {
  if (!branding?.widgets) return branding;

  const widgets = { ...branding.widgets };
  if (widgets.loginBackground?.imageUrl) {
    widgets.loginBackground = {
      ...widgets.loginBackground,
      imageUrl: normalizeImageRenderUrl(widgets.loginBackground.imageUrl),
    };
  }
  if (widgets.loadingBackground?.imageUrl) {
    widgets.loadingBackground = {
      ...widgets.loadingBackground,
      imageUrl: normalizeImageRenderUrl(widgets.loadingBackground.imageUrl),
    };
  }
  if (widgets.homeImage?.imageUrl) {
    widgets.homeImage = {
      ...widgets.homeImage,
      imageUrl: normalizeImageRenderUrl(widgets.homeImage.imageUrl),
    };
  }

  return { ...branding, widgets };
}

export function resolvePublicidadImageId(
  img: string | { _id?: string; iud?: string; id?: string } | null | undefined
): string {
  if (!img) return '';
  if (typeof img === 'string') return normalizePublicIdForApi(img);
  return resolveEntityPublicId(img);
}
