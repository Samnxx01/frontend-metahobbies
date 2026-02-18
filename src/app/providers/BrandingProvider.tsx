import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BrandingConfig, BrandingPalette, obtenerBrandingPublico } from '@/app/services/brandingWidget';

interface BrandingProviderProps {
  children: React.ReactNode;
}

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

  Object.entries(branding.tipografia?.extras || {}).forEach(([key, value]) => {
    setVar(`--${key}`, value);
  });

  Object.entries(branding.botones?.extras || {}).forEach(([key, value]) => {
    setVar(`--${key}`, value);
  });

  Object.entries(branding.paleta?.extras || {}).forEach(([key, value]) => {
    setVar(`--${key}`, value);
  });

  Object.entries(branding.tokens || {}).forEach(([key, value]) => {
    setVar(`--${key}`, value);
  });

  appliedVars.forEach((cssVar) => {
    if (!nextVars.has(cssVar)) {
      root.style.removeProperty(cssVar);
    }
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
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
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

export default function BrandingProvider({ children }: BrandingProviderProps): React.ReactElement {
  const location = useLocation();
  const appliedVarsRef = useRef<Set<string>>(new Set());

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
    };

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
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
