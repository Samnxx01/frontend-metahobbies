import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GobernanzaModuloConfig } from './gobernanzaModuloConfig';
import { GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT, getGobernanzaModuloBySlug } from './gobernanzaModuloConfig';
import { getGobernanzaModuloCatalogoLocal, normalizeGobernanzaModuloSlug } from './gobernanzaModulosCatalog';
import { accionApiToEndpointSpec } from './gobernanzaEndpointCatalog';
import { fetchGobernanzaModuloMenu } from './gobernanzaModuloService';
import type { GobernanzaModuloConfigApi, GobernanzaModuloMenuAccion } from './gobernanzaModuloApiTypes';
import type { EndpointSpec } from './parametrosGobernanzaTypes';

function apiModuloToConfig(api: GobernanzaModuloConfigApi): GobernanzaModuloConfig {
  return {
    slug: api.slug,
    section: api.section,
    label: api.label,
    description: api.description,
    endpointIds: api.endpointIds ?? [],
    defaultActionId: api.defaultActionId || '',
    actionQueryParam: api.actionQueryParam || GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
    submenuTitle: api.submenuTitle,
    submenuHint: api.submenuHint,
    basePath: api.frontPath,
  };
}

function fallbackConfigFromSlug(slug: string): GobernanzaModuloConfig | null {
  const local = getGobernanzaModuloCatalogoLocal(slug);
  const registered = getGobernanzaModuloBySlug(slug);
  if (registered) return registered;
  if (!local) return null;
  return {
    slug: local.slug,
    section: local.section,
    label: local.label,
    description: local.description,
    endpointIds: [],
    defaultActionId: '',
    actionQueryParam: GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
  };
}

export type UseGobernanzaModuloMenuOptions = {
  moduloSlug: string | null | undefined;
  syncDefaultAction?: boolean;
  /** Si false, no llama al API (p. ej. cuando ParametrosGobernanza no está en flujo inline). */
  enabled?: boolean;
};

export function useGobernanzaModuloMenu({
  moduloSlug,
  syncDefaultAction = true,
  enabled = true,
}: UseGobernanzaModuloMenuOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = moduloSlug ? normalizeGobernanzaModuloSlug(String(moduloSlug)) : '';

  const [menuLoading, setMenuLoading] = useState(Boolean(enabled && slug));
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuAcciones, setMenuAcciones] = useState<GobernanzaModuloMenuAccion[] | null>(null);
  const [menuConfigApi, setMenuConfigApi] = useState<GobernanzaModuloConfigApi | null>(null);
  const [menuDefaultActionId, setMenuDefaultActionId] = useState<string | null>(null);
  const [saJerarquiaConCorporativo, setSaJerarquiaConCorporativo] = useState(false);

  const refreshMenu = useCallback(async () => {
    if (!enabled || !slug) {
      setMenuLoading(false);
      setMenuAcciones(null);
      setMenuConfigApi(null);
      return;
    }
    setMenuLoading(true);
    setMenuError(null);
    try {
      const res = await fetchGobernanzaModuloMenu(slug);
      setMenuAcciones(Array.isArray(res.acciones) ? res.acciones : []);
      setMenuConfigApi(res.modulo ?? null);
      setMenuDefaultActionId(res.defaultActionId ?? res.modulo?.defaultActionId ?? null);
      setSaJerarquiaConCorporativo(Boolean(res.saJerarquiaConCorporativo));
    } catch (err: unknown) {
      setMenuAcciones(null);
      setMenuConfigApi(null);
      setMenuError(err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setMenuLoading(false);
    }
  }, [enabled, slug]);

  useEffect(() => {
    void refreshMenu();
  }, [refreshMenu]);

  const config = useMemo((): GobernanzaModuloConfig => {
    if (menuConfigApi) return apiModuloToConfig(menuConfigApi);
    return fallbackConfigFromSlug(slug) ?? {
      slug,
      section: 'tenant',
      label: slug,
      description: '',
      endpointIds: [],
      defaultActionId: '',
    };
  }, [menuConfigApi, slug]);

  const actionQueryParam = config.actionQueryParam ?? GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT;
  const allowedIds = useMemo(() => new Set(config.endpointIds), [config.endpointIds]);

  const actionShortLabels = useMemo(() => {
    if (!menuAcciones?.length) return undefined;
    const map: Record<string, string> = {};
    for (const a of menuAcciones) {
      if (a.shortLabel) map[a.id] = a.shortLabel;
    }
    return map;
  }, [menuAcciones]);

  const menuDisponibleById = useMemo(() => {
    if (!menuAcciones?.length) return undefined;
    return Object.fromEntries(menuAcciones.map((a) => [a.id, a.disponible]));
  }, [menuAcciones]);

  const endpoints = useMemo((): EndpointSpec[] => {
    if (menuAcciones?.length) {
      return menuAcciones
        .map((item) => accionApiToEndpointSpec(item, config.section))
        .filter((e): e is EndpointSpec => Boolean(e));
    }
    return config.endpointIds
      .map((id) => accionApiToEndpointSpec(
        {
          id,
          method: 'GET',
          path: '',
          title: id,
          description: '',
          shortLabel: '',
          actor: 'ambos',
          orden: 0,
          disponible: true,
        },
        config.section
      ))
      .filter((e): e is EndpointSpec => Boolean(e));
  }, [menuAcciones, config.endpointIds, config.section]);

  const activeActionId = useMemo(() => {
    const q = searchParams.get(actionQueryParam)?.trim();
    if (q && allowedIds.has(q)) return q;
    return menuDefaultActionId || config.defaultActionId || endpoints[0]?.id || '';
  }, [searchParams, actionQueryParam, allowedIds, menuDefaultActionId, config.defaultActionId, endpoints]);

  const activeEndpoint = useMemo(
    () => endpoints.find((e) => e.id === activeActionId) ?? null,
    [endpoints, activeActionId]
  );

  useEffect(() => {
    if (!syncDefaultAction || menuLoading || !activeActionId) return;
    const current = searchParams.get(actionQueryParam)?.trim();
    if (current && allowedIds.has(current)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(actionQueryParam, activeActionId);
        return next;
      },
      { replace: true }
    );
  }, [
    syncDefaultAction,
    menuLoading,
    activeActionId,
    searchParams,
    actionQueryParam,
    allowedIds,
    setSearchParams,
  ]);

  const setActiveActionId = (id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(actionQueryParam, id);
        return next;
      },
      { replace: true }
    );
  };

  return {
    slug,
    config,
    menuConfigApi,
    menuLoading,
    menuError,
    menuDesdeApi: Boolean(menuConfigApi && menuAcciones?.length),
    endpoints,
    activeActionId,
    activeEndpoint,
    setActiveActionId,
    actionShortLabels,
    menuDisponibleById,
    saJerarquiaConCorporativo,
    refreshMenu,
  };
}
