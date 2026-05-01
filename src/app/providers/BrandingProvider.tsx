import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BrandingConfig, BrandingPalette, obtenerBrandingPublico } from '@/app/services/brandingWidget';
import { aplicarPaletaEnApp, restaurarPaletaLocal, type ColoresPaleta } from '@/app/utils/ColorUtils';
import { obtenerColoresPublico, fusionarColoresApp, type ColoresApp } from '@/app/services/coloresAppService';
import { getSocket } from '@/app/socket/socketService';
import { useAuth } from '@/app/providers/AuthProvider';

interface BrandingProviderProps {
  children: React.ReactNode;
}

// Helpers de CSS variables

const paletteKeyToCssVar = (key: string): string =>
  key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const applyPalette = (palette: BrandingPalette | undefined, appliedVars: Set<string>): void => {
  if (!palette) return;
  const target = document.documentElement;

  Object.entries(palette).forEach(([key, value]) => {
    if (!value || key === 'extras') return;
    const cssVar = `--${paletteKeyToCssVar(key)}`;
    target.style.setProperty(cssVar, value);
    appliedVars.add(cssVar);
  });
};

const applyBranding = (branding: BrandingConfig, appliedVars: Set<string>): void => {
  const root = document.documentElement;
  const nextVars = new Set<string>();
  const setVar = (key: string, value?: string): void => {
    if (!value) return;
    root.style.setProperty(key, value);
    nextVars.add(key);
  };

  const fontBase = branding.tipografia?.fontFamilyBase;
  const fontHeading = branding.tipografia?.fontFamilyHeading;
  setVar('--font-family-base', fontBase);
  setVar('--font-family-heading', fontHeading);

  const radius = branding.botones?.radius;
  const fontWeight = branding.botones?.fontWeight;
  setVar('--radius', radius);
  setVar('--button-radius', radius);
  setVar('--button-font-weight', fontWeight);

  Object.entries(branding.tipografia?.extras || {}).forEach(([key, value]) => setVar(`--${key}`, value));
  Object.entries(branding.botones?.extras || {}).forEach(([key, value]) => setVar(`--${key}`, value));
  Object.entries(branding.paleta?.extras || {}).forEach(([key, value]) => setVar(`--${key}`, value));
  Object.entries(branding.tokens || {}).forEach(([key, value]) => setVar(`--${key}`, value));

  appliedVars.forEach((cssVar) => {
    if (!nextVars.has(cssVar)) root.style.removeProperty(cssVar);
  });
  appliedVars.clear();
  nextVars.forEach((cssVar) => appliedVars.add(cssVar));
};

const applyPaletteByMode = (branding: BrandingConfig, appliedVars: Set<string>): void => {
  const isDark = document.documentElement.classList.contains('dark');
  const palette = isDark ? branding.paleta?.dark : branding.paleta?.light;
  applyPalette(palette, appliedVars);
};

const mergeDeep = <T extends Record<string, unknown>>(target: T, source: Record<string, unknown> | undefined): T => {
  if (!source) return target;
  const output: Record<string, unknown> = { ...target };

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = output[key];
    if (
      sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
      targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
    ) {
      output[key] = mergeDeep(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else if (sourceValue !== undefined) {
      output[key] = sourceValue;
    }
  });

  return output as T;
};

const matchPattern = (pattern: string, pathname: string): boolean => {
  if (!pattern) return false;
  if (pattern === '*') return true;
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return pathname.startsWith(base);
  }
  return pathname === pattern;
};

const applyRouteOverrides = (branding: BrandingConfig, pathname: string): BrandingConfig => {
  const routes = Array.isArray(branding.widgets?.routes)
    ? (branding.widgets?.routes as Array<Record<string, unknown>>)
    : [];

  const match = routes.find((routeConfig) => {
    const pattern = String(routeConfig.route || '');
    return matchPattern(pattern, pathname);
  });

  if (!match) return branding;
  const overrides = (match.overrides || {}) as Record<string, unknown>;
  return mergeDeep(branding as Record<string, unknown>, overrides) as BrandingConfig;
};

// Carga y aplica la paleta activa desde el endpoint público (sin JWT).
// Funciona para vistas públicas y privadas por igual.
const cargarYAplicarPaletaActiva = async (): Promise<void> => {
  try {
    const res = await obtenerColoresPublico();
    aplicarPaletaEnApp(fusionarColoresApp(res?.colores) as ColoresPaleta);
  } catch {
    if (!restaurarPaletaLocal()) {
      aplicarPaletaEnApp(fusionarColoresApp() as ColoresPaleta);
    }
  }
};

export default function BrandingProvider({ children }: BrandingProviderProps): React.ReactElement {
  const location = useLocation();
  const { token } = useAuth();
  const appliedVarsRef = useRef<Set<string>>(new Set());

  // Socket puede conectarse tras el login — enganchamos el evento de paleta en toda la app.
  useEffect(() => {
    const handler = (data: { colores?: Partial<ColoresPaleta> }): void => {
      if (!data?.colores) return;
      aplicarPaletaEnApp(fusionarColoresApp(data.colores as Partial<ColoresApp>) as ColoresPaleta);
    };

    let detach: (() => void) | undefined;
    const tick = (): void => {
      const s = getSocket();
      if (s && !detach) {
        s.on('paleta-colores-actualizada', handler);
        detach = () => {
          s.off('paleta-colores-actualizada', handler);
          detach = undefined;
        };
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
      detach?.();
    };
  }, []);

  useEffect(() => {
    let brandingSnapshot: BrandingConfig | null = null;

    const observer = new MutationObserver(() => {
      if (brandingSnapshot) {
        applyPaletteByMode(brandingSnapshot, appliedVarsRef.current);
      }
    });

    const cargarBranding = async (): Promise<void> => {
      // Antes de cualquier await: misma paleta que ya tenía el usuario (post-login / LoadingScreen).
      restaurarPaletaLocal();

      try {
        const branding = await obtenerBrandingPublico();
        if (branding) {
          const effectiveBranding = applyRouteOverrides(branding, location.pathname);
          brandingSnapshot = effectiveBranding;
          applyBranding(effectiveBranding, appliedVarsRef.current);
          applyPaletteByMode(effectiveBranding, appliedVarsRef.current);
        } else {
          brandingSnapshot = null;
        }
      } catch (error) {
        brandingSnapshot = null;
        console.warn('No se pudo aplicar branding dinamico:', error);
      }

      // Tras tipografía/paleta del widget: volver a la paleta parametrizada guardada
      // (applyPaletteByMode puede pisar --primary, etc.).
      restaurarPaletaLocal();

      // Servidor (colores-app) es fuente de verdad.
      await cargarYAplicarPaletaActiva();
    };

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    cargarBranding();

    return () => {
      observer.disconnect();
      appliedVarsRef.current.forEach((cssVar) => document.documentElement.style.removeProperty(cssVar));
      appliedVarsRef.current.clear();
    };
  }, [location.pathname, token]);

  return <>{children}</>;
}