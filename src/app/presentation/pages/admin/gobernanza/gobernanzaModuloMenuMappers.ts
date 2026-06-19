import {
  normalizarGobernanzaMenuAccion,
  normalizarGobernanzaMenuPath,
  resolverGobernanzaActionTabId,
  resolverGobernanzaEndpointId,
} from './gobernanzaActionIds';
import { accionApiToEndpointSpec, ENDPOINTS_BY_ID } from './gobernanzaEndpointCatalog';
import type { GobernanzaModuloConfigApi, GobernanzaModuloMenuAccion } from './gobernanzaModuloApiTypes';
import type { EndpointSection, EndpointSpec, FieldSpec } from './parametrosGobernanzaTypes';

/** true cuando el formulario React publicado en BD/config resuelve la UI. */
export function tieneFormularioComponentResuelto(
  accion?: { formularioComponent?: string | null } | null,
  hint?: string | null
): boolean {
  return Boolean(String(hint ?? accion?.formularioComponent ?? '').trim());
}

/** Pestañas/menú: nunca llevan fields del catálogo TS. */
function fieldsParaMenuSpec(): FieldSpec[] {
  return [];
}

/** Formulario operativo: conserva fields del catálogo hasta migrar cada componente. */
function fieldsParaEndpointOperativo(baseFields: FieldSpec[] | undefined): FieldSpec[] {
  return baseFields ?? [];
}

/** Metadata del catálogo TS sin fields (solo menú / activeEndpoint de navegación). */
export function endpointSpecCatalogoSinFieldsSiComponente(
  base: EndpointSpec,
  formularioComponent?: string | null
): EndpointSpec {
  if (!tieneFormularioComponentResuelto({ formularioComponent })) return base;
  return { ...base, fields: fieldsParaMenuSpec() };
}

/** Spec operativo para render/ejecución: metadata + fields del catálogo. */
export function endpointSpecOperativoDesdeCatalogo(
  base: EndpointSpec,
  overrides: Partial<EndpointSpec> = {}
): EndpointSpec {
  return {
    ...base,
    ...overrides,
    fields: fieldsParaEndpointOperativo(base.fields),
  };
}

function nombreDesdeConfig(cfg: GobernanzaModuloConfigApi | null | undefined): string {
  return String(cfg?.nombre || cfg?.label || '').trim();
}

/** Config de gobernanzaModuloConfigs que corresponde al menuPath SPA actual. */
export function resolverConfigActivaPorMenuPath(
  configs: GobernanzaModuloConfigApi[] = [],
  menuPath?: string | null
): GobernanzaModuloConfigApi | null {
  const pathKey = normalizarGobernanzaMenuPath(menuPath)?.toLowerCase();
  if (pathKey) {
    const porPath = configs.find((c) => {
      const cfgPath = normalizarGobernanzaMenuPath(c.menuPath || c.frontPath || c.rutaPath)?.toLowerCase();
      return cfgPath && cfgPath === pathKey;
    });
    if (porPath) return porPath;
  }
  return configs[0] ?? null;
}

/**
 * Completa acciones del GET operativo con nombre, formularioComponent y títulos
 * desde gobernanzaModuloConfigs (fuente de verdad en BD).
 */
export function enriquecerAccionesDesdeConfigs(
  acciones: GobernanzaModuloMenuAccion[] = [],
  configs: GobernanzaModuloConfigApi[] = [],
  menuPath?: string | null
): GobernanzaModuloMenuAccion[] {
  if (!acciones.length) return acciones;

  const cfgActiva = resolverConfigActivaPorMenuPath(configs, menuPath);
  const nombrePorSlug = new Map(
    configs.map((c) => [String(c.slug || '').trim(), nombreDesdeConfig(c)] as const)
  );
  const nombrePorPath = new Map(
    configs
      .map((c) => {
        const path = normalizarGobernanzaMenuPath(c.menuPath || c.frontPath || c.rutaPath)?.toLowerCase();
        return path ? ([path, nombreDesdeConfig(c)] as const) : null;
      })
      .filter((x): x is readonly [string, string] => Boolean(x))
  );
  const componentPorSlug = new Map(
    configs.map((c) => [String(c.slug || '').trim(), String(c.formularioComponent || '').trim()] as const)
  );

  return acciones.map((accion) => {
    const pathKey = normalizarGobernanzaMenuPath(accion.menuPath)?.toLowerCase();
    const slugKey = String(accion.configSlug || '').trim();
    const cfgMatch =
      (pathKey && configs.find((c) => {
        const cfgPath = normalizarGobernanzaMenuPath(c.menuPath || c.frontPath || c.rutaPath)?.toLowerCase();
        return cfgPath === pathKey;
      }))
      ?? (slugKey ? configs.find((c) => c.slug === slugKey) : null)
      ?? cfgActiva;

    const nombreCfg =
      (slugKey && nombrePorSlug.get(slugKey))
      || (pathKey && nombrePorPath.get(pathKey))
      || nombreDesdeConfig(cfgMatch);

    const formularioComponent =
      String(accion.formularioComponent || '').trim()
      || String(cfgMatch?.formularioComponent || '').trim()
      || (slugKey ? componentPorSlug.get(slugKey) || '' : '');

    const catalogId = resolverGobernanzaEndpointId({
      endpointId: accion.endpointId,
      id: accion.id,
      formularioComponent: formularioComponent || null,
      menuPath: accion.menuPath,
    });
    const catalogTitle = catalogId ? String(ENDPOINTS_BY_ID[catalogId]?.title || '').trim() : '';
    const titulo =
      String(accion.title || accion.shortLabel || nombreCfg || catalogTitle || '').trim();

    return {
      ...accion,
      formularioComponent: formularioComponent || accion.formularioComponent,
      menuPath: String(accion.menuPath || cfgMatch?.menuPath || '').trim() || accion.menuPath,
      rutaId: accion.rutaId ?? cfgMatch?.rutaId ?? null,
      validacion: accion.validacion ?? cfgMatch?.validacion,
      title: titulo,
      shortLabel: String(accion.shortLabel || accion.title || nombreCfg || catalogTitle || titulo).trim(),
      description: String(accion.description || cfgMatch?.description || '').trim(),
    };
  });
}

/** Solo tarjetas por ruta (`tipo: formulario`). Las acciones del config van como `tipo: endpoint`. */
export function esAccionMenuFormulario(accion: GobernanzaModuloMenuAccion): boolean {
  return accion.tipo === 'formulario';
}

const GOBERNANZA_HUB_FORM_COMPONENTS = new Set([
  'PermisosGlobal',
  'TenantSuperAdmin',
  'TenantGlobal',
  'ParametrosGobernanza',
  'GobernanzaModuloPorRuta',
]);

/** Tarjetas publicadas en gobernanzaModuloConfigs para un hub (PermisosGlobal, etc.). */
export function buildAccionesHubDesdeConfigsClient(
  configs: GobernanzaModuloConfigApi[] = [],
  hubMenuPath?: string | null
): GobernanzaModuloMenuAccion[] {
  const pathKey = normalizarGobernanzaMenuPath(hubMenuPath)?.toLowerCase();
  const tarjetas = configs
    .filter((cfg) => {
      const menuPath = normalizarGobernanzaMenuPath(cfg.menuPath || cfg.frontPath || cfg.rutaPath || '');
      const component = String(cfg.formularioComponent || '').trim();
      if (!menuPath || !component) return false;
      if (pathKey && menuPath.toLowerCase() === pathKey) return false;
      if (GOBERNANZA_HUB_FORM_COMPONENTS.has(component)) return false;
      return true;
    })
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const acciones: GobernanzaModuloMenuAccion[] = [];
  const seen = new Set<string>();

  for (const cfg of tarjetas) {
    const formularioComponent = String(cfg.formularioComponent || '').trim();
    const menuPath = normalizarGobernanzaMenuPath(cfg.menuPath || cfg.frontPath || cfg.rutaPath || '');
    const nombreCfg = String(cfg.nombre || cfg.label || '').trim();
    const catalogEndpointId = resolverGobernanzaEndpointId({
      endpointId: cfg.defaultActionId,
      formularioComponent,
      defaultActionId: cfg.defaultActionId,
    });
    const id = String(cfg.slug || '').trim() || menuPath;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    acciones.push(
      normalizarGobernanzaMenuAccion({
        id,
        tipo: catalogEndpointId ? 'endpoint' : 'formulario',
        menuPath,
        formularioComponent,
        endpointId: catalogEndpointId || cfg.defaultActionId || null,
        configSlug: cfg.slug || null,
        rutaId: cfg.rutaId ?? null,
        validacion: cfg.validacion,
        method: 'GET',
        path: menuPath,
        title: nombreCfg || cfg.label || id,
        description: String(cfg.description || '').trim(),
        shortLabel: nombreCfg || cfg.label || '',
        actor: 'ambos',
        section: cfg.section,
        orden: cfg.orden ?? 0,
        disponible: true,
      })
    );
  }

  return acciones;
}

/**
 * Fallback cliente: arma acciones desde configs[] si el API devolvió configs pero acciones vacías.
 */
export function buildAccionesFromConfigsClient(
  configs: GobernanzaModuloConfigApi[] = []
): GobernanzaModuloMenuAccion[] {
  const acciones: GobernanzaModuloMenuAccion[] = [];
  const seen = new Set<string>();

  for (const cfg of configs) {
    const formularioComponent = String(
      cfg.formularioComponent || 'GobernanzaPermisosFormByEndpoint'
    ).trim();
    const menuPath = String(cfg.menuPath || '').trim();
    const nombreCfg = String(cfg.nombre || cfg.label || '').trim();
    const catalogo = Array.isArray(cfg.accionesCatalog) ? cfg.accionesCatalog : [];

    for (const item of catalogo) {
      const catalogId = resolverGobernanzaEndpointId({
        endpointId: item.id,
        id: item.id,
        formularioComponent,
        defaultActionId: cfg.defaultActionId,
      });
      const id =
        String(cfg.slug || '').trim()
        || resolverGobernanzaActionTabId({
          endpointId: catalogId,
          formularioComponent,
          defaultActionId: cfg.defaultActionId,
          menuPath,
          id: String(cfg.slug || item.id || '').trim(),
        });
      if (!id || seen.has(id)) continue;
      seen.add(id);
      acciones.push(
        normalizarGobernanzaMenuAccion({
        id,
        tipo: 'endpoint',
        menuPath: menuPath || undefined,
        formularioComponent,
        endpointId: catalogId || cfg.defaultActionId || null,
        configSlug: cfg.slug || null,
        method: (item.method as GobernanzaModuloMenuAccion['method']) || 'GET',
        path: String(item.path || '').trim(),
        title: String(item.title || item.shortLabel || nombreCfg || catalogId || id).trim(),
        description: String(cfg.description || '').trim(),
        shortLabel: String(item.shortLabel || item.title || nombreCfg || catalogId || id).trim(),
        actor: 'ambos',
        section: cfg.section,
        orden: 0,
        disponible: true,
      })
      );
    }

    if (!catalogo.length && formularioComponent) {
      const catalogEndpointId = resolverGobernanzaEndpointId({
        endpointId: cfg.defaultActionId,
        formularioComponent,
        defaultActionId: cfg.defaultActionId,
      });
      const id = String(cfg.slug || '').trim() || resolverGobernanzaActionTabId({
        endpointId: catalogEndpointId,
        formularioComponent,
        defaultActionId: cfg.defaultActionId,
        menuPath,
        id: String(cfg.slug || cfg.label || '').trim(),
      });
      if (id && !seen.has(id)) {
        seen.add(id);
        acciones.push(
          normalizarGobernanzaMenuAccion({
          id,
          tipo: catalogEndpointId ? 'endpoint' : menuPath ? 'formulario' : 'endpoint',
          menuPath: menuPath || undefined,
          formularioComponent,
          endpointId: catalogEndpointId || cfg.defaultActionId || null,
          configSlug: cfg.slug || null,
          method: 'GET',
          path: menuPath || catalogEndpointId || id,
          title: String(nombreCfg || cfg.label || catalogEndpointId || id).trim(),
          description: String(cfg.description || '').trim(),
          shortLabel: String(nombreCfg || cfg.label || '').trim(),
          actor: 'ambos',
          section: cfg.section,
          orden: cfg.orden ?? 0,
          disponible: true,
        })
        );
      }
    }
  }

  return acciones;
}
/** EndpointSpec mínimo desde acción API — sin validaciones extra. */
export function accionToEndpointSpecMinimo(
  accion: GobernanzaModuloMenuAccion,
  sectionFallback: EndpointSection
): EndpointSpec {
  const catalogId = resolverGobernanzaEndpointId({
    endpointId: accion.endpointId,
    id: accion.id,
    formularioComponent: accion.formularioComponent,
    menuPath: accion.menuPath,
  });
  const base = catalogId ? ENDPOINTS_BY_ID[catalogId] : null;
  const tabId = String(accion.id || '').trim() || catalogId;
  return {
    id: tabId,
    section: (accion.section as EndpointSection) || base?.section || sectionFallback,
    actor: (accion.actor as EndpointSpec['actor']) || base?.actor || 'ambos',
    method: (accion.method as EndpointSpec['method']) || base?.method || 'GET',
    path: String(accion.path || base?.path || '').trim(),
    title: String(accion.title || accion.shortLabel || base?.title || tabId).trim(),
    description: String(accion.description || base?.description || '').trim(),
    fields: fieldsParaMenuSpec(),
    primary: base?.primary,
  };
}

/**
 * Convierte ítem del menú API en EndpointSpec para render del formulario.
 * Formularios: id de pestaña = menuPath; campos desde endpointId/defaultActionId del config.
 */
export function accionMenuToEndpointSpec(
  accion: GobernanzaModuloMenuAccion,
  sectionFallback: EndpointSection
): EndpointSpec | null {
  const tabId = String(accion.id || '').trim();
  const catalogId = resolverGobernanzaEndpointId({
    endpointId: accion.endpointId,
    id: accion.id,
    formularioComponent: accion.formularioComponent,
    menuPath: accion.menuPath,
  });
  const base = catalogId ? ENDPOINTS_BY_ID[catalogId] : null;
  const titulo = String(accion.title || accion.shortLabel || base?.title || tabId).trim();

  if (!esAccionMenuFormulario(accion)) {
    if (catalogId && base) {
      return endpointSpecCatalogoSinFieldsSiComponente(
        {
          ...base,
          id: tabId || catalogId,
          title: titulo,
          description: String(accion.description || base.description || '').trim(),
        },
        accion.formularioComponent
      );
    }
    const spec = accionApiToEndpointSpec(
      {
        ...accion,
        id: catalogId || tabId,
        endpointId: catalogId || accion.endpointId || null,
      },
      sectionFallback
    );
    if (spec) {
      return {
        ...spec,
        id: tabId || spec.id,
        title: titulo || spec.title,
        description: String(accion.description || spec.description || '').trim(),
        fields: fieldsParaMenuSpec(),
      };
    }
    return accionToEndpointSpecMinimo(accion, sectionFallback);
  }

  const menuPath = String(accion.menuPath || accion.path || accion.id || '').trim();
  if (!tabId && !catalogId) return accionToEndpointSpecMinimo(accion, sectionFallback);

  const actor = (accion.actor as EndpointSpec['actor']) || base?.actor || 'ambos';
  const section = accion.section || base?.section || sectionFallback;

  return {
    id: tabId || catalogId || menuPath,
    section,
    actor,
    method: base?.method || (accion.method as EndpointSpec['method']) || 'GET',
    path: base?.path || menuPath,
    title: titulo || menuPath,
    description: String(accion.description || base?.description || '').trim(),
    fields: fieldsParaMenuSpec(),
    primary: base?.primary,
  };
}

/** EndpointSpec para ejecutar/renderizar formulario (conserva fields del catálogo). */
export function endpointSpecParaFormulario(
  accion: GobernanzaModuloMenuAccion | null | undefined,
  sectionFallback: EndpointSection,
  formularioComponentHint?: string | null
): EndpointSpec | null {
  if (!accion) return null;
  const catalogId = resolverGobernanzaEndpointId({
    endpointId: accion.endpointId,
    id: accion.id,
    formularioComponent: formularioComponentHint || accion.formularioComponent,
    menuPath: accion.menuPath,
  });
  if (catalogId && ENDPOINTS_BY_ID[catalogId]) {
    return endpointSpecOperativoDesdeCatalogo(ENDPOINTS_BY_ID[catalogId]);
  }
  return accionMenuToEndpointSpec(accion, sectionFallback);
}
