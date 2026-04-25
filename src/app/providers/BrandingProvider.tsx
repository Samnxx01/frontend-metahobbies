import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BrandingConfig, BrandingPalette, obtenerBrandingPublico } from '@/app/services/brandingWidget';
import { aplicarPaletaEnApp, restaurarPaletaLocal, type ColoresPaleta } from '@/app/utils/ColorUtils';
import { obtenerColoresPublico } from '@/app/services/coloresAppService';

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
    const colores = res?.colores as ColoresPaleta | null;
    if (colores) {
      aplicarPaletaEnApp(colores);
    }
  } catch {
    restaurarPaletaLocal();
  }
};

export default function BrandingProvider({ children }: BrandingProviderProps): React.ReactElement {
  const location = useLocation();
  const appliedVarsRef = useRef<Set<string>>(new Set());
  const paletaLoadedRef = useRef(false);

  useEffect(() => {
    let brandingSnapshot: BrandingConfig | null = null;

    const observer = new MutationObserver(() => {
      if (brandingSnapshot) {
        applyPaletteByMode(brandingSnapshot, appliedVarsRef.current);
      }
    });

    const cargarBranding = async (): Promise<void> => {
      try {
        const branding = await obtenerBrandingPublico();
        if (!branding) return;
        const effectiveBranding = applyRouteOverrides(branding, location.pathname);
        brandingSnapshot = effectiveBranding;
        applyBranding(effectiveBranding, appliedVarsRef.current);
        applyPaletteByMode(effectiveBranding, appliedVarsRef.current);
      } catch (error) {
        console.warn('No se pudo aplicar branding dinamico:', error);
      }

      // Aplicar la paleta activa DESPUÉS del branding en cada cambio de ruta.
      // Esto es necesario porque applyBranding sobreescribe las CSS variables
      // en cada navegación. La paleta debe aplicarse siempre al final para
      // que sus colores tengan precedencia sobre el branding base.
      // Paso 1: restaurar desde localStorage instantáneamente (sin fetch)
      // para que el color correcto aparezca de inmediato sin esperar la red.
      restaurarPaletaLocal();

      // Paso 2: solo en la primera carga, confirmado con el backend.
      // En navegaciones posteriores, localStorage es suficiente.
      if (!paletaLoadedRef.current) {
        paletaLoadedRef.current = true;
        await cargarYAplicarPaletaActiva();
      }
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
  }, [location.pathname]);

  return <>{children}</>;
}