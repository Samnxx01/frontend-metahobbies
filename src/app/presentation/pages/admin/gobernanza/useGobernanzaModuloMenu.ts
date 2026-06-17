import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { GobernanzaModuloConfig } from './gobernanzaModuloConfig';
import { GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT, gobernanzaModuloOperativoStub } from './gobernanzaModuloConfig';
import { getGobernanzaModuloCatalogoLocal, normalizeGobernanzaModuloSlug } from './gobernanzaModulosCatalog';
import { accionMenuToEndpointSpec, endpointSpecParaFormulario, esAccionMenuFormulario, buildAccionesFromConfigsClient, buildAccionesHubDesdeConfigsClient, accionToEndpointSpecMinimo, enriquecerAccionesDesdeConfigs, resolverConfigActivaPorMenuPath } from './gobernanzaModuloMenuMappers';
import {
  buildGobernanzaAccionesGridFromEndpoints,
  buildGobernanzaMenuTabsFromEndpoints,
} from './gobernanzaModuloMenuUi';
import { fetchGobernanzaModuloConfigs, fetchGobernanzaModuloOperativo } from './gobernanzaModuloService';
import type { GobernanzaModuloConfigApi, GobernanzaModuloMenuAccion } from './gobernanzaModuloApiTypes';
import type { EndpointSpec } from './parametrosGobernanzaTypes';
import { ENDPOINTS_BY_ID } from './gobernanzaEndpointCatalog';
import {
  normalizarGobernanzaMenuAcciones,
  normalizarGobernanzaMenuPath,
  resolverGobernanzaEndpointId,
  GOBERNANZA_GENERIC_ACTION_IDS,
} from './gobernanzaActionIds';
import {
  errorGobernanzaOperativo,
  groupGobernanzaOperativo,
  logGobernanzaOperativo,
  warnGobernanzaOperativo,
} from './gobernanzaModuloDebug';

function apiModuloToConfig(api: GobernanzaModuloConfigApi): GobernanzaModuloConfig {
  return {
    slug: api.slug,
    section: api.section,
    label: api.nombre ?? api.label,
    description: api.description,
    endpointIds: api.endpointIds ?? [],
    defaultActionId: api.defaultActionId || '',
    actionQueryParam: api.actionQueryParam || GOBERNANZA_MODULO_ACTION_QUERY_DEFAULT,
    submenuTitle: api.submenuTitle,
    submenuHint: api.submenuHint,
    basePath: api.frontPath,
    formularioComponent: api.formularioComponent ?? null,
    formularioId: api.formularioId ?? null,
    rutaId: api.rutaId ?? null,
    menuPath: api.menuPath ?? null,
  };
}

function fallbackConfigFromSlug(slug: string): GobernanzaModuloConfig | null {
  const local = getGobernanzaModuloCatalogoLocal(slug);
  if (local) {
    return gobernanzaModuloOperativoStub(local.slug, {
      section: local.section,
      label: local.label,
      description: local.description,
    });
  }
  return gobernanzaModuloOperativoStub(slug);
}

export type UseGobernanzaModuloMenuOptions = {
  moduloSlug: string | null | undefined;
  /** Sección en BD (permisos | tenant | corporativo). Prioridad sobre moduloSlug en el GET. */
  sectionKey?: string | null;
  /** Ruta SPA actual: resuelve gobernanzaModuloConfigs por menuPath. */
  menuPath?: string | null;
  syncDefaultAction?: boolean;
  /**
   * Pestañas + formulario en la misma página (hub PermisosGlobal): sin ?accion= ni navegar a subrutas.
   */
  inlineFormularios?: boolean;
  /** Hub operaciones: fuerza menú desde gobernanzaModuloConfigs (excluye ruta contenedora). */
  operacionesHub?: boolean;
  /** Si false, no llama al API (p. ej. cuando ParametrosGobernanza no está en flujo inline). */
  enabled?: boolean;
  /** Acción del catálogo al abrir subruta (p. ej. perm-admin-tenant-global). */
  preferredActionId?: string | null;
};

export function useGobernanzaModuloMenu({
  moduloSlug,
  sectionKey = null,
  menuPath = null,
  syncDefaultAction = true,
  inlineFormularios = false,
  operacionesHub = false,
  enabled = true,
  preferredActionId = null,
}: UseGobernanzaModuloMenuOptions) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = moduloSlug ? normalizeGobernanzaModuloSlug(String(moduloSlug)) : '';
  const sectionQuery = String(sectionKey || slug || 'permisos').trim().toLowerCase();
  const menuPathNorm = normalizarGobernanzaMenuPath(menuPath);
  const preferredActionNorm = String(preferredActionId || '').trim();

  const [menuLoading, setMenuLoading] = useState(Boolean(enabled && sectionQuery));
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuAcciones, setMenuAcciones] = useState<GobernanzaModuloMenuAccion[] | null>(null);
  const [menuConfigApi, setMenuConfigApi] = useState<GobernanzaModuloConfigApi | null>(null);
  const [menuConfigs, setMenuConfigs] = useState<GobernanzaModuloConfigApi[]>([]);
  const [menuDefaultActionId, setMenuDefaultActionId] = useState<string | null>(null);
  const [saJerarquiaConCorporativo, setSaJerarquiaConCorporativo] = useState(false);
  const [menuConfigCount, setMenuConfigCount] = useState(0);
  const [selectedActionId, setSelectedActionId] = useState('');

  const refreshMenu = useCallback(async () => {
    logGobernanzaOperativo('refreshMenu:start', {
      enabled,
      sectionQuery,
      slug,
      sectionKey,
      menuPath: menuPathNorm || null,
    });

    if (!enabled || !sectionQuery) {
      warnGobernanzaOperativo('refreshMenu:SKIP — API no llamado', {
        motivo: !enabled ? 'enabled=false' : 'sectionQuery vacío',
        enabled,
        sectionQuery,
      });
      setMenuLoading(false);
      setMenuAcciones(null);
      setMenuConfigApi(null);
      setMenuConfigs([]);
      setMenuConfigCount(0);
      return;
    }
    setMenuLoading(true);
    setMenuError(null);
    try {
      logGobernanzaOperativo('fetch GET operativo', {
        url: `/operativo?section=${sectionQuery}${menuPathNorm ? `&menuPath=${menuPathNorm}` : ''}${operacionesHub ? '&hubOperaciones=1' : ''}`,
      });
      const res = await fetchGobernanzaModuloOperativo({
        section: sectionQuery,
        menuPath: menuPathNorm || undefined,
        hubOperaciones: operacionesHub,
      });
      let acciones = Array.isArray(res.acciones) ? res.acciones : [];
      let configs = Array.isArray(res.configs) ? res.configs : [];

      const accionesParecenFallbackHub = () => {
        if (!operacionesHub) return false;
        if (!acciones.length) return true;
        const pathKey = normalizarGobernanzaMenuPath(menuPathNorm)?.toLowerCase();
        if (acciones.length === 1) {
          const a = acciones[0];
          const mp = normalizarGobernanzaMenuPath(a.menuPath || a.path || '').toLowerCase();
          return (
            GOBERNANZA_GENERIC_ACTION_IDS.has(a.id)
            || GOBERNANZA_GENERIC_ACTION_IDS.has(String(a.title || '').trim())
            || Boolean(pathKey && mp === pathKey)
          );
        }
        return acciones.every((a) => GOBERNANZA_GENERIC_ACTION_IDS.has(a.id));
      };

      if (operacionesHub) {
        try {
          const raw = await fetchGobernanzaModuloConfigs(sectionQuery);
          const full = Array.isArray(raw.configs) ? raw.configs : [];
          if (full.length) configs = full;
        } catch (cfgErr) {
          warnGobernanzaOperativo('GET configs (hub) falló — usando configs del operativo', cfgErr);
        }
        const hubAcciones = buildAccionesHubDesdeConfigsClient(configs, menuPathNorm || undefined);
        if (hubAcciones.length) {
          acciones = hubAcciones;
          logGobernanzaOperativo('acciones hub desde gobernanzaModuloConfigs', acciones);
        } else if (accionesParecenFallbackHub()) {
          warnGobernanzaOperativo('hub sin tarjetas — revisa section=permisos, menuPath y formularioComponent', {
            menuPath: menuPathNorm,
            configs: configs.map((c) => ({ slug: c.slug, menuPath: c.menuPath, formularioComponent: c.formularioComponent })),
          });
        }
      } else if (!acciones.length && configs.length) {
        acciones = buildAccionesFromConfigsClient(configs);
        logGobernanzaOperativo('acciones reconstruidas desde configs (cliente)', acciones);
      }

      groupGobernanzaOperativo('respuesta GET operativo', () => {
        logGobernanzaOperativo('ok', res.ok);
        logGobernanzaOperativo('meta', res.meta);
        logGobernanzaOperativo('configs.length', configs.length);
        logGobernanzaOperativo('acciones.length (API)', acciones.length);
        logGobernanzaOperativo('configs[0]', configs[0] ?? null);
        logGobernanzaOperativo('acciones (API)', acciones);
      });

      acciones = enriquecerAccionesDesdeConfigs(acciones, configs, menuPathNorm || undefined);
      acciones = normalizarGobernanzaMenuAcciones(acciones);

      if (!acciones.length && !configs.length) {
        warnGobernanzaOperativo('operativo vacío — probando GET configs');
        const raw = await fetchGobernanzaModuloConfigs(sectionQuery);
        configs = Array.isArray(raw.configs) ? raw.configs : [];
        logGobernanzaOperativo('GET configs', { count: configs.length, configs });
        if (configs.length) {
          const baseAcciones = operacionesHub
            ? buildAccionesHubDesdeConfigsClient(configs, menuPathNorm || undefined)
            : buildAccionesFromConfigsClient(configs);
          acciones = enriquecerAccionesDesdeConfigs(
            baseAcciones,
            configs,
            menuPathNorm || undefined
          );
          acciones = normalizarGobernanzaMenuAcciones(acciones);
          logGobernanzaOperativo('acciones desde configs fallback', acciones);
        }
      }

      setMenuConfigs(configs);
      setMenuConfigCount(configs.length || res.meta?.configCount || 0);
      setMenuAcciones(acciones);
      const cfgActiva = resolverConfigActivaPorMenuPath(configs, menuPathNorm || res.modulo?.menuPath);
      const firstCfg = cfgActiva ?? configs[0];
      setMenuConfigApi(
        res.modulo
          ? { ...res.modulo, label: res.modulo.nombre ?? res.modulo.label }
          : (firstCfg
            ? {
                slug: firstCfg.slug,
                section: firstCfg.section,
                nombre: firstCfg.nombre ?? firstCfg.label,
                label: firstCfg.nombre ?? firstCfg.label,
                description: firstCfg.description,
                frontPath: firstCfg.frontPath || '',
                menuPath: firstCfg.menuPath ?? null,
                rutaId: firstCfg.rutaId ?? null,
                formularioId: firstCfg.formularioId ?? null,
                formularioNombre: firstCfg.formularioNombre ?? null,
                formularioComponent: firstCfg.formularioComponent ?? null,
                defaultActionId: firstCfg.defaultActionId ?? acciones[0]?.id ?? null,
                actionQueryParam: firstCfg.actionQueryParam || 'accion',
                submenuTitle: firstCfg.submenuTitle,
                submenuHint: firstCfg.submenuHint,
                endpointIds: acciones.map((a) => a.id),
              }
            : null)
      );
      setMenuDefaultActionId(
        res.defaultActionId
          ?? res.modulo?.defaultActionId
          ?? acciones.find((a) => a.disponible)?.id
          ?? acciones[0]?.id
          ?? null
      );
      setSaJerarquiaConCorporativo(Boolean(res.saJerarquiaConCorporativo));

      logGobernanzaOperativo('refreshMenu:OK', {
        configCount: configs.length || res.meta?.configCount || 0,
        accionesCount: acciones.length,
        accionIds: acciones.map((a) => a.id),
        defaultActionId:
          res.defaultActionId ?? res.modulo?.defaultActionId ?? acciones[0]?.id ?? null,
      });
    } catch (err: unknown) {
      errorGobernanzaOperativo('refreshMenu:ERROR', err);
      setMenuAcciones(null);
      setMenuConfigApi(null);
      setMenuConfigs([]);
      setMenuConfigCount(0);
      setMenuError(err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setMenuLoading(false);
    }
  }, [enabled, sectionQuery, menuPathNorm, operacionesHub]);

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
  const pathnameNorm = normalizarGobernanzaMenuPath(pathname);

  /** Quita ?accion=accion-api (u otros ids genéricos) de la URL. */
  useEffect(() => {
    const q = searchParams.get(actionQueryParam)?.trim();
    if (!q || !GOBERNANZA_GENERIC_ACTION_IDS.has(q)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(actionQueryParam);
        return next;
      },
      { replace: true }
    );
  }, [searchParams, actionQueryParam, setSearchParams]);

  const configLabelBd = useMemo(
    () => String(menuConfigApi?.nombre || menuConfigApi?.label || config.label || '').trim(),
    [menuConfigApi, config.label]
  );

  const actionShortLabels = useMemo(() => {
    if (!menuAcciones?.length) return undefined;
    const map: Record<string, string> = {};
    for (const a of menuAcciones) {
      const label = String(a.shortLabel || a.title || configLabelBd).trim();
      if (label) map[a.id] = label;
      const catalogId = resolverGobernanzaEndpointId({
        endpointId: a.endpointId,
        id: a.id,
        formularioComponent: a.formularioComponent,
        menuPath: a.menuPath,
      });
      if (catalogId && catalogId !== a.id && label) map[catalogId] = label;
    }
    return map;
  }, [menuAcciones, configLabelBd]);

  const menuDisponibleById = useMemo(() => {
    if (!menuAcciones?.length) return undefined;
    return Object.fromEntries(menuAcciones.map((a) => [a.id, a.disponible]));
  }, [menuAcciones]);

  /** Menú operativo: exclusivamente acciones de gobernanzaModuloConfigs (API). */
  const endpoints = useMemo((): EndpointSpec[] => {
    if (menuAcciones === null) return [];
    const section = config.section;
    const mapped = menuAcciones.map((item) => accionMenuToEndpointSpec(item, section));
    const result = mapped.filter((e): e is EndpointSpec => Boolean(e));
    if (menuAcciones.length && !result.length) {
      const fallback = menuAcciones.map((item) => accionToEndpointSpecMinimo(item, section));
      warnGobernanzaOperativo('endpoints: fallback mínimo (sin validación)', fallback);
      return fallback;
    }
    logGobernanzaOperativo('endpoints para pestañas', {
      menuAccionesCount: menuAcciones.length,
      endpointsCount: result.length,
      endpointIds: result.map((e) => e.id),
    });
    return result;
  }, [menuAcciones, config.section]);

  const usaMenuPorRuta = useMemo(
    () => (menuAcciones ?? []).some((a) => esAccionMenuFormulario(a)),
    [menuAcciones]
  );

  const activeActionIdResolved = useMemo(() => {
    const endpointFromComponent = resolverGobernanzaEndpointId({
      formularioComponent: menuConfigApi?.formularioComponent ?? config.formularioComponent,
    });
    const preferCatalog = (id: string | null | undefined) =>
      id && (ENDPOINTS_BY_ID[id] || endpoints.some((e) => e.id === id)) ? id : '';

    if (menuPathNorm) {
      const pathKey = menuPathNorm.toLowerCase();
      const accionEnRuta = menuAcciones?.find(
        (a) => normalizarGobernanzaMenuPath(a.menuPath).toLowerCase() === pathKey
      );
      if (accionEnRuta) {
        const spec = accionMenuToEndpointSpec(accionEnRuta, config.section);
        if (spec && endpoints.some((e) => e.id === spec.id)) return spec.id;
        if (endpoints.some((e) => e.id === accionEnRuta.id)) return accionEnRuta.id;
      }
      const porRuta = endpoints.find(
        (e) => normalizarGobernanzaMenuPath(e.id).toLowerCase() === pathKey
      );
      if (porRuta) return porRuta.id;
    }

    const q = searchParams.get(actionQueryParam)?.trim();
    if (q && preferCatalog(q)) return q;
    if (preferredActionNorm && preferCatalog(preferredActionNorm)) return preferredActionNorm;
    if (endpointFromComponent && preferCatalog(endpointFromComponent)) return endpointFromComponent;

    if (usaMenuPorRuta && menuPathNorm) {
      const pathKey = menuPathNorm.toLowerCase();
      const porRuta = endpoints.find(
        (e) => normalizarGobernanzaMenuPath(e.id).toLowerCase() === pathKey
      );
      if (porRuta) return porRuta.id;
    }

    return (
      preferCatalog(menuDefaultActionId) ||
      preferCatalog(config.defaultActionId) ||
      preferCatalog(menuConfigApi?.defaultActionId) ||
      endpoints[0]?.id ||
      ''
    );
  }, [
    menuPathNorm,
    menuAcciones,
    config.section,
    config.formularioComponent,
    config.defaultActionId,
    menuConfigApi,
    usaMenuPorRuta,
    searchParams,
    actionQueryParam,
    preferredActionNorm,
    menuDefaultActionId,
    endpoints,
  ]);

  useEffect(() => {
    if (!inlineFormularios) {
      setSelectedActionId('');
      return;
    }
    if (!endpoints.length) return;
    const valid = (id: string) => id && endpoints.some((e) => e.id === id);
    if (valid(selectedActionId)) return;
    const seed =
      (preferredActionNorm && valid(preferredActionNorm) ? preferredActionNorm : '')
      || (activeActionIdResolved && valid(activeActionIdResolved) ? activeActionIdResolved : '')
      || endpoints[0]?.id
      || '';
    if (seed) setSelectedActionId(seed);
  }, [
    inlineFormularios,
    endpoints,
    preferredActionNorm,
    activeActionIdResolved,
    selectedActionId,
  ]);

  const activeActionId =
    inlineFormularios && selectedActionId
      ? selectedActionId
      : activeActionIdResolved;

  const activeAccionMenu = useMemo(() => {
    if (!menuAcciones?.length) return null;
    if (!activeActionId) return menuAcciones[0] ?? null;
    return (
      menuAcciones.find((a) => a.id === activeActionId) ??
      menuAcciones.find((a) => a.endpointId === activeActionId) ??
      menuAcciones.find(
        (a) =>
          resolverGobernanzaEndpointId({
            endpointId: a.endpointId,
            id: a.id,
            formularioComponent: a.formularioComponent,
          }) === activeActionId
      ) ??
      menuAcciones[0]
    );
  }, [menuAcciones, activeActionId]);

  const activeEndpoint = useMemo(() => {
    const componentHint =
      activeAccionMenu?.formularioComponent
      ?? menuConfigApi?.formularioComponent
      ?? config.formularioComponent
      ?? null;
    const catalogFromAccion = resolverGobernanzaEndpointId({
      endpointId: activeAccionMenu?.endpointId,
      formularioComponent: componentHint,
      menuPath: activeAccionMenu?.menuPath,
    });
    if (catalogFromAccion && ENDPOINTS_BY_ID[catalogFromAccion]) {
      return ENDPOINTS_BY_ID[catalogFromAccion];
    }
    if (activeActionId && ENDPOINTS_BY_ID[activeActionId]) {
      return ENDPOINTS_BY_ID[activeActionId];
    }
    const formSpec = endpointSpecParaFormulario(activeAccionMenu, config.section, componentHint);
    if (formSpec?.fields?.length) return formSpec;
    if (formSpec && ENDPOINTS_BY_ID[formSpec.id]) return ENDPOINTS_BY_ID[formSpec.id];
    const found = endpoints.find((e) => e.id === activeActionId);
    if (found?.fields?.length) return found;
    if (activeAccionMenu) return accionToEndpointSpecMinimo(activeAccionMenu, config.section);
    const fromComponent = resolverGobernanzaEndpointId({ formularioComponent: componentHint });
    if (fromComponent && ENDPOINTS_BY_ID[fromComponent]) return ENDPOINTS_BY_ID[fromComponent];
    return found ?? formSpec ?? null;
  }, [
    activeAccionMenu,
    config.section,
    config.formularioComponent,
    menuConfigApi?.formularioComponent,
    endpoints,
    activeActionId,
  ]);

  const menuTabs = useMemo(
    () =>
      buildGobernanzaMenuTabsFromEndpoints(endpoints, {
        shortLabels: actionShortLabels,
        disponibleById: menuDisponibleById,
        configLabel: configLabelBd,
      }),
    [endpoints, actionShortLabels, menuDisponibleById, configLabelBd]
  );

  const accionesGrid = useMemo(
    () =>
      buildGobernanzaAccionesGridFromEndpoints(endpoints, {
        shortLabels: actionShortLabels,
        disponibleById: menuDisponibleById,
        configLabel: configLabelBd,
      }),
    [endpoints, actionShortLabels, menuDisponibleById, configLabelBd]
  );

  useEffect(() => {
    if (!syncDefaultAction || menuLoading || !activeActionId) return;
    if (usaMenuPorRuta && !inlineFormularios) return;
    if (GOBERNANZA_GENERIC_ACTION_IDS.has(activeActionId)) return;
    const current = searchParams.get(actionQueryParam)?.trim();
    if (current && endpoints.some((e) => e.id === current)) return;
    if (!ENDPOINTS_BY_ID[activeActionId] && !endpoints.some((e) => e.id === activeActionId)) return;
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
    endpoints,
    usaMenuPorRuta,
    inlineFormularios,
    setSearchParams,
  ]);

  const setActiveActionId = (id: string) => {
    if (inlineFormularios) {
      setSelectedActionId(id);
      return;
    }

    const accion =
      menuAcciones?.find((a) => a.id === id)
      ?? menuAcciones?.find((a) => normalizarGobernanzaMenuPath(a.menuPath) === normalizarGobernanzaMenuPath(id));

    const destino = String(accion?.menuPath || '').trim();
    if (destino && !inlineFormularios) {
      const destKey = normalizarGobernanzaMenuPath(destino).toLowerCase();
      if (destKey && destKey !== pathnameNorm.toLowerCase()) {
        navigate(destino);
        return;
      }
    }

    if (!id || GOBERNANZA_GENERIC_ACTION_IDS.has(id)) return;
    if (!ENDPOINTS_BY_ID[id] && !endpoints.some((e) => e.id === id)) return;

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
    menuConfigs,
    menuAcciones,
    menuLoading,
    menuError,
    menuDesdeApi: menuAcciones !== null,
    menuConfigCount,
    menuTabs,
    accionesGrid,
    endpoints,
    activeActionId,
    activeEndpoint,
    activeAccionMenu,
    setActiveActionId,
    actionShortLabels,
    menuDisponibleById,
    saJerarquiaConCorporativo,
    refreshMenu,
  };
}
