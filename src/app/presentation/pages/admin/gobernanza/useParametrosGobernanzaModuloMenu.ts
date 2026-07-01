import { useMemo } from 'react';
import { useGobernanzaModuloMenu } from './useGobernanzaModuloMenu';
import {
  getParametrosGobernanzaMenuParametrizacion,
  mergeParametrizacionConModuloApi,
  resolvePanelCopy,
  type ParametrosGobernanzaModuloMenuParametrizacion,
} from './parametrosGobernanzaModuloMenu';
import { normalizeGobernanzaModuloSlug } from './gobernanzaModulosCatalog';
import { resolverMenuPathHubOperaciones } from './gobernanzaActionIds';

export type UseParametrosGobernanzaModuloMenuOptions = {
  moduloSlug: string | null | undefined;
  menuPath?: string | null;
  /** Sobrescribe campos de parametrización local (p. ej. desde inlineModuloConfig). */
  parametrizacionOverride?: Partial<ParametrosGobernanzaModuloMenuParametrizacion> | null;
  syncDefaultAction?: boolean;
  enabled?: boolean;
  preferredActionId?: string | null;
  operacionesHub?: boolean;
  /** Filtra menú por gobernanzaModuloTipos.section (p. ej. gobernanza). */
  tipoSection?: string | null;
};

/**
 * Menú del flujo inline de ParametrosGobernanza: parametrización local + datos API.
 */
export function useParametrosGobernanzaModuloMenu({
  moduloSlug,
  menuPath = null,
  parametrizacionOverride,
  syncDefaultAction,
  enabled = true,
  preferredActionId = null,
  operacionesHub = false,
  tipoSection = null,
}: UseParametrosGobernanzaModuloMenuOptions) {
  const slug = moduloSlug ? normalizeGobernanzaModuloSlug(String(moduloSlug)) : '';

  const parametrizacionBase = useMemo(() => {
    const base = getParametrosGobernanzaMenuParametrizacion(slug);
    if (!base) return null;
    if (!parametrizacionOverride) return base;
    return { ...base, ...parametrizacionOverride, slug: parametrizacionOverride.slug ?? base.slug };
  }, [slug, parametrizacionOverride]);

  const menuPathNorm = String(menuPath || '').trim();
  const menuPathOperativo = operacionesHub
    ? resolverMenuPathHubOperaciones(menuPathNorm)
    : menuPathNorm;
  const menu = useGobernanzaModuloMenu({
    moduloSlug: slug || null,
    sectionKey: parametrizacionBase?.section ?? slug,
    menuPath: menuPathOperativo || null,
    syncDefaultAction: operacionesHub ? false : (syncDefaultAction ?? parametrizacionBase?.syncDefaultAction ?? true),
    /** Hub: pestañas en el padre sin navegar a subrutas (menú siempre visible). */
    inlineFormularios: operacionesHub || !menuPathNorm,
    operacionesHub,
    tipoSection,
    enabled: enabled && Boolean(slug || menuPathNorm || parametrizacionBase?.section),
    preferredActionId,
  });

  const config = useMemo(() => {
    if (!parametrizacionBase) return menu.config;
    return mergeParametrizacionConModuloApi(parametrizacionBase, menu.menuConfigApi);
  }, [parametrizacionBase, menu.config, menu.menuConfigApi]);

  const panelCopy = useMemo(() => {
    if (!parametrizacionBase) {
      return {
        panelTitle: menu.config.label || '',
        panelHint: menu.config.description || '',
        submenuTitle: menu.config.submenuTitle || 'Operaciones',
        submenuHint: menu.config.submenuHint || '',
      };
    }
    return resolvePanelCopy(parametrizacionBase, config);
  }, [parametrizacionBase, config, menu.config]);

  return {
    ...menu,
    parametrizacion: parametrizacionBase,
    config,
    panelTitle: panelCopy.panelTitle,
    panelHint: panelCopy.panelHint,
    submenuTitle: panelCopy.submenuTitle,
    submenuHint: panelCopy.submenuHint,
  };
}

export type ParametrosGobernanzaModuloMenuState = ReturnType<typeof useParametrosGobernanzaModuloMenu>;
