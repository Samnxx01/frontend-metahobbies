import type { BrandingConfig } from '@/app/services/brandingWidget';
import { normalizeBrandingWidgetImages } from '@/app/utils/normalizeImageRenderUrl';

export const BRANDING_CACHE_KEY = 'mabs.branding.public.v1';

export const readCachedBranding = (): BrandingConfig | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    return normalizeBrandingWidgetImages(JSON.parse(raw) as BrandingConfig);
  } catch {
    return null;
  }
};

export const persistBrandingCache = (branding: BrandingConfig | null | undefined): void => {
  if (typeof window === 'undefined' || !branding) return;

  try {
    window.localStorage.setItem(
      BRANDING_CACHE_KEY,
      JSON.stringify(normalizeBrandingWidgetImages(branding))
    );
  } catch {
    // Ignorar errores de storage para no bloquear la UI.
  }
};
