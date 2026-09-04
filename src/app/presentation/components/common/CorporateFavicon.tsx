import { useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { fetchSplashLogo, resolveSplashLogoUrl } from '@/app/services/splashLogoService';
import { apiFetch } from '@/app/services/api';

export const CORPORATE_LOGO_UPDATED_EVENT = 'mabs-corporate-logo-updated';

const applyFavicon = (url: string | null): void => {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!url) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.type = url.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
  link.href = url;
};

const setMetaContent = (selector: string, content: string): void => {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
};

const applyCorporateMetadata = (perfil: any, logoUrl: string | null): void => {
  const name = String(perfil?.razon_social || '').trim();
  const description = String(perfil?.descripcion || '').trim();
  document.title = name;
  setMetaContent('meta[name="application-name"]', name);
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:site_name"]', name);
  setMetaContent('meta[property="og:title"]', name);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:image"]', logoUrl || '');
  setMetaContent('meta[name="twitter:title"]', name);
  setMetaContent('meta[name="twitter:description"]', description);
  setMetaContent('meta[name="twitter:image"]', logoUrl || '');

  let structuredData = document.querySelector<HTMLScriptElement>('#corporate-structured-data');
  if (!structuredData) {
    structuredData = document.createElement('script');
    structuredData.id = 'corporate-structured-data';
    structuredData.type = 'application/ld+json';
    document.head.appendChild(structuredData);
  }
  structuredData.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: window.location.origin,
    ...(logoUrl ? { logo: logoUrl } : {}),
  });
};

export default function CorporateFavicon(): null {
  const { user } = useAuth();

  useEffect(() => {
    let active = true;

    const refreshFavicon = async (): Promise<void> => {
      const useAuth = Boolean(localStorage.getItem('token'));
      const [logoResult, perfilResult] = await Promise.allSettled([
        fetchSplashLogo(useAuth, { forceRefresh: true }),
        apiFetch('/api/configuracion/listar/coporativo/perfil/publico', {
          method: 'GET',
          useAuth: false,
          logoutOn401: false,
        }),
      ]);
      if (!active) return;
      const logoResponse = logoResult.status === 'fulfilled' ? logoResult.value : null;
      const perfilResponse = perfilResult.status === 'fulfilled' ? perfilResult.value : null;
      const logoUrl = resolveSplashLogoUrl(logoResponse?.logo);
      applyFavicon(logoUrl);
      applyCorporateMetadata(perfilResponse?.perfil, logoUrl);
    };

    void refreshFavicon();
    window.addEventListener(CORPORATE_LOGO_UPDATED_EVENT, refreshFavicon);

    return () => {
      active = false;
      window.removeEventListener(CORPORATE_LOGO_UPDATED_EVENT, refreshFavicon);
    };
  }, [user]);

  return null;
}
