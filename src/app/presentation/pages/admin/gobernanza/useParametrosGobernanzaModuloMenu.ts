import { useMemo } from 'react';
import { useGobernanzaModuloMenu } from './useGobernanzaModuloMenu';
import {
  getParametrosGobernanzaMenuParametrizacion,
  mergeParametrizacionConModuloApi,
  resolvePanelCopy,
  type ParametrosGobernanzaModuloMenuParametrizacion,
} from './parametrosGobernanzaModuloMenu';
import { normalizeGobernanzaModuloSlug } from './gobernanzaModulosCatalog';

export type UseParametrosGobernanzaModuloMenuOptions = {
  moduloSlug: string | null | undefined;
  /** Sobrescribe campos de parametrización local (p. ej. desde inlineModuloConfig). */
  parametrizacionOverride?: Partial<ParametrosGobernanzaModuloMenuParametrizacion> | null;
  syncDefaultAction?: boolean;
  enabled?: boolean;
};

/**
 * Menú del flujo inline de ParametrosGobernanza: parametrización local + datos API.
 */
export function useParametrosGobernanzaModuloMenu({
  moduloSlug,
  parametrizacionOverride,
  syncDefaultAction,
  enabled = true,
}: UseParametrosGobernanzaModuloMenuOptions) {
  const slug = moduloSlug ? normalizeGobernanzaModuloSlug(String(moduloSlug)) : '';

  const parametrizacionBase = useMemo(() => {
    const base = getParametrosGobernanzaMenuParametrizacion(slug);
    if (!base) return null;
    if (!parametrizacionOverride) return base;
    return { ...base, ...parametrizacionOverride, slug: parametrizacionOverride.slug ?? base.slug };
  }, [slug, parametrizacionOverride]);

  const menu = useGobernanzaModuloMenu({
    moduloSlug: slug || null,
    syncDefaultAction: syncDefaultAction ?? parametrizacionBase?.syncDefaultAction ?? true,
    enabled: enabled && Boolean(slug),
  });

  const config = useMemo(() => {
    if (!parametrizacionBase) return menu.config;
    return mergeParametrizacionConModuloApi(parametrizacionBase, menu.menuConfigApi);
  }, [parametrizacionBase, menu.config, menu.menuConfigApi]);

  const panelCopy = useMemo(() => {
    if (!parametrizacionBase) {
      return { panelTitle: menu.config.label || '', panelHint: menu.config.description || '' };
    }
    return resolvePanelCopy(parametrizacionBase, config);
  }, [parametrizacionBase, config, menu.config]);

  return {
    ...menu,
    parametrizacion: parametrizacionBase,
    config,
    panelTitle: panelCopy.panelTitle,
    panelHint: panelCopy.panelHint,
  };
}

export type ParametrosGobernanzaModuloMenuState = ReturnType<typeof useParametrosGobernanzaModuloMenu>;
