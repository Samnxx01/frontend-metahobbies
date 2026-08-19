import React from 'react';
import { TENANT_SUPERADMIN_SCOPE_PREFIX } from './parametrosGobernanzaConstants';
import { gobernanzaEntityId } from './gobernanzaEntityId';
import { esEndpointCreacionSaDocumento } from './tenantSuperAdminInsertEndpoints';
import { type DiosRecursoSuiteJerarquia } from './diosReglaRecursosJerarquia';
import { formatSaJerarquiaOptionLabel } from './SaJerarquiaUsuariosPanel';

// ---------------------------------------------------------------------------
// Tipos locales compartidos entre las funciones puras y el componente principal
// ---------------------------------------------------------------------------

export type Vista = { id: string; label: string; path: string; _id?: string };
export type Accion = { id: string; label: string; method: string };
export type TenantGlobal = {
  id: string;
  label: string;
  corporativo: string;
  correo?: string;
  tenantSuperAdmin?: string;
  tenantGlobalAdmin?: string;
};
export type PermisoItem = { vistaId: string; accionId: string[] };
export type ReglaOption = { id: string; label: string };
/** tipoContexto: `view` = interfaz tenant global; `api` = contexto API (excluido en reglas globales). */
export type ContextOption = { id: string; label: string; tipoContexto?: string };
export type HeredaGlobalOption = { id: string; label: string };
export type CatalogSelection = { vistas: string[]; acciones: string[] };
export type NodoRuta = { _id: string; name: string; path: string; tipoNodo?: string; tipoNodoId?: { codigo: string; nombre: string; order: number }; acciones?: Accion[]; children?: NodoRuta[] };
export type TenantCorporativoOption = { id: string; label: string; tenantGlobalId: string };
export type GenericSelectOption = { id: string; label: string; rol?: string; meta?: Record<string, string | number | undefined> };
export type HeredaScope = 'tenantSuperAdmin' | 'tenantGlobal' | 'unknown';
export type VistaLoc = { suiteId: string; suiteName: string; moduloId: string; moduloName: string };
export type VistaItem = { id: string; label: string; path: string };

export type SaJerarquiaMeta = {
  id: string;
  label?: string;
  codigoJerarquia?: string | null;
  codigoPadre?: string | null;
  secuenciaJerarquia?: number | null;
  usuarioId?: string | null;
  rolNombre?: string | null;
  usuarioNombre?: string | null;
  usuarioCorreo?: string | null;
  coporativoNombre?: string | null;
  dominioTenant?: string | null;
  nvlGeneracionTenantId?: string | null;
  securityPlatform?: boolean;
  apisDominiosId?: string | null;
  apisDominiosEtiqueta?: string | null;
  counterJerarquia?: {
    codigoJerarquia?: string | null;
    codigoPadre?: string | null;
    secuenciaJerarquia?: number | null;
  } | null;
  saPadre?: {
    id: string | null;
    codigoJerarquia: string | null;
    secuenciaJerarquia?: number | null;
    usuarioNombre: string | null;
    usuarioCorreo: string | null;
  } | null;
  mandoJerarquia?: {
    id: string;
    codigoJerarquia: string | null;
    secuenciaJerarquia: number | null;
    usuarioNombre: string | null;
    usuarioCorreo: string | null;
    cadenaJerarquica?: {
      id: string;
      codigoJerarquia: string | null;
      secuenciaJerarquia: number | null;
      usuarioNombre: string | null;
      usuarioCorreo: string | null;
    }[];
  } | null;
  usuariosJerarquia?: {
    id: string;
    nombre: string | null;
    apellido?: string | null;
    correo: string | null;
    tienePerfil?: boolean;
    perfilCc?: string | null;
    perfilTelefono?: string | null;
  }[];
};

// ---------------------------------------------------------------------------
// Funciones helper puras (sin hooks, sin estado React)
// ---------------------------------------------------------------------------

/** Cambia si recurso/acciones o metadatos de cualquier regla cambian (no solo la cantidad de claves). */
export function computeRuleCatalogPermisosDigest(catalog: Record<string, any>): string {
  const keys = Object.keys(catalog || {}).sort();
  const chunks: string[] = [];
  for (const k of keys) {
    const r = catalog[k];
    const vr = (Array.isArray(r?.recurso) ? r.recurso : [])
      .map((x: any) => String(x?._id || x || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
    const ar = (Array.isArray(r?.accionesUsu) ? r.accionesUsu : [])
      .map((x: any) => String(x?._id || x || '').trim())
      .filter(Boolean)
      .sort()
      .join(',');
    const ts = String(r?.updatedAt || r?.updated_at || r?.fechaModificacion || '').trim();
    chunks.push(`${k}:${vr}:${ar}:${ts}`);
  }
  return `${keys.length}|${chunks.join(';')}`;
}

/** Regla de plataforma por tenantSuperAdmin en GET listar reglas: prioriza securityPlatform true (histórico), luego false. */
export function findReglaPlataformaPorSuperAdmin(
  ruleCatalog: Record<string, any>,
  tenantSuperAdminId: string
): any | undefined {
  if (!tenantSuperAdminId) return undefined;
  const rows = Object.values(ruleCatalog || {});
  const matchSa = (r: any) => saIdCoincideEnRegla(r, tenantSuperAdminId);
  return (
    rows.find((r: any) => r?.securityPlatform === true && matchSa(r)) ||
    rows.find((r: any) => r?.securityPlatform === false && matchSa(r))
  );
}

export function saIdCoincideEnRegla(regla: any, tenantSuperAdminId: string): boolean {
  const sa = String(tenantSuperAdminId || '').trim();
  if (!sa) return false;
  const variantes = new Set<string>([sa]);
  const gens = Array.isArray(regla?.generacionTenatGlobales) ? regla.generacionTenatGlobales : [];
  for (const g of gens) {
    for (const gid of collectGobernanzaRefIds(g)) {
      if (variantes.has(gid)) return true;
    }
    if (idsPermisoRefsCoinciden(g, sa)) return true;
  }
  const tgList = Array.isArray(regla?.generacionGlovallNvlRoles) ? regla.generacionGlovallNvlRoles : [];
  for (const tg of tgList) {
    if (idsPermisoRefsCoinciden(tg?.tenantSuperAdmin, sa)) return true;
    for (const tid of collectGobernanzaRefIds(tg?.tenantSuperAdmin)) {
      if (variantes.has(tid)) return true;
    }
  }
  return false;
}

/** Reglas cuyo arreglo `generacionTenatGlobales` referencia el tenantSuperAdmin (listar en herencia asociada como respaldo). */
export function findReglasPorTenantSuperAdmin(
  ruleCatalog: Record<string, any>,
  tenantSuperAdminId: string
): any[] {
  if (!tenantSuperAdminId) return [];
  return Object.values(ruleCatalog || {}).filter((r: any) => saIdCoincideEnRegla(r, tenantSuperAdminId));
}

export function filterDiosJerarquiaTreeByAllowedIds(
  tree: DiosRecursoSuiteJerarquia[],
  allowedIds: Set<string>
): DiosRecursoSuiteJerarquia[] {
  if (!tree.length || !allowedIds.size) return [];
  return tree
    .map((suite) => ({
      ...suite,
      modulos: suite.modulos
        .map((mod) => ({
          ...mod,
          formularios: mod.formularios.filter((f) => allowedIds.has(String(f._id || '').trim())),
        }))
        .filter((mod) => mod.formularios.length > 0),
    }))
    .filter((suite) => suite.modulos.length > 0);
}

/** NVL desde meta del select (generacionglobalnvlrolesconfigs) + etiqueta de respaldo. */
export function resolverNvlGeneracionMeta(
  opt: { label?: string; meta?: Record<string, string | number | undefined> } | null | undefined
): { esLibre: boolean; esTenantGlobal: boolean; esTenantCorporativo: boolean; nvlNum: number | null } {
  const label = String(opt?.label || '');
  const meta = opt?.meta;
  const nvlRaw = String(meta?.nvl ?? '').trim();
  const nvlNum = nvlRaw !== '' && !Number.isNaN(Number(nvlRaw)) ? Number(nvlRaw) : null;
  const gen = String(meta?.generationTenant || '').toLowerCase();
  const texto = label.toLowerCase();
  const esLibre =
    nvlNum === 0 ||
    texto.includes('libre') ||
    texto.includes('nvl 0') ||
    String(meta?.securityPlatform || '').toLowerCase() === 'true';
  const esTenantGlobal =
    nvlNum === 1 ||
    texto.includes('tenant-global') ||
    texto.includes('nvl 1') ||
    gen.includes('tenant-global') ||
    gen.includes('global');
  const esTenantCorporativo =
    nvlNum === 2 ||
    /tenant[-_]?co?rporativo/i.test(texto) ||
    /nvl\s*2/.test(texto) ||
    gen.includes('corporativo');
  return { esLibre, esTenantGlobal, esTenantCorporativo, nvlNum };
}

/** NVL 1/2 + SA con corporativo en counters JWT: tipo_tenant y corporativo se resuelven solos. */
export function esNvl12ParametrosResueltosDesdeJwt(
  endpointId: string,
  selectedNvlId: string,
  nvlOptions: GenericSelectOption[],
  saJerarquiaConCorporativo: boolean,
  actorEsTenantSuperAdmin: boolean,
): boolean {
  if (!selectedNvlId || !saJerarquiaConCorporativo || !actorEsTenantSuperAdmin) return false;
  if (!esEndpointCreacionSaDocumento(endpointId) && endpointId !== 'tenant-crear-global-admin') return false;
  const { esTenantGlobal, esTenantCorporativo } = resolverNvlGeneracionMeta(
    nvlOptions.find((o) => o.id === selectedNvlId),
  );
  return esTenantGlobal || esTenantCorporativo;
}

export const getTipoNodoLabel = (node: any): string =>
  String(node?.tipoNodoId?.codigo || node?.tipoNodo || '').trim().toUpperCase();

export const esNodoFormularioLike = (node: any): boolean => {
  const tipo = getTipoNodoLabel(node);
  return tipo === 'FORMULARIO' || tipo === 'SUBFORMULARIO';
};

export const hasChildNodes = (node: any): boolean =>
  Array.isArray(node?.children) && node.children.length > 0;

export const collectFormularioLikeNodes = (nodes: any[] = []): any[] => {
  const collected: any[] = [];
  const walk = (items: any[] = []) => {
    items.forEach((item) => {
      if (!item) return;
      if (esNodoFormularioLike(item)) {
        collected.push(item);
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return collected;
};

export const getModuloNodes = (suite: any): any[] =>
  (suite?.children || []).filter((n: any) => !esNodoFormularioLike(n) || hasChildNodes(n));

// Recorre TODOS los descendientes del nodo (sin filtrar por tipoNodo)
export const collectAllNodes = (nodes: any[] = []): any[] => {
  const collected: any[] = [];
  const walk = (items: any[] = []) => {
    items.forEach((item) => {
      if (!item) return;
      collected.push(item);
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return collected;
};

export const getEntityId = (value: any): string => gobernanzaEntityId(value);

/**
 * Etiqueta de acción desde `etiquetas` (a veces llega poblado como objeto en vez de string).
 * Evita `[object Object]`: solo usa `etiquetas` si es un string real, si no cae al fallback.
 */
export const safeAccionEtiqueta = (etiquetas: unknown, fallback: string): string => {
  const raw = typeof etiquetas === 'string' ? etiquetas.trim() : '';
  return raw && raw !== '[object Object]' ? raw : fallback;
};

/** ID de vista/acción desde ref API (ObjectId, iud UUID u objeto poblado). Evita `[object Object]`. */
export const normalizePermisoRefId = (value: unknown): string => {
  const id = gobernanzaEntityId(value);
  return id && id !== '[object Object]' ? id : '';
};

export const collectGobernanzaRefIds = (value: unknown): Set<string> => {
  const out = new Set<string>();
  if (value == null) return out;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const k of ['iud', '_id', 'id', 'rid']) {
      const v = String(o[k] ?? '').trim();
      if (v && v !== '[object Object]') out.add(v);
    }
    return out;
  }
  const s = String(value).trim();
  if (s && s !== '[object Object]') out.add(s);
  return out;
};

export const idsPermisoRefsCoinciden = (a: unknown, b: unknown): boolean => {
  const sa = collectGobernanzaRefIds(a);
  const sb = collectGobernanzaRefIds(b);
  for (const x of sa) {
    if (sb.has(x)) return true;
  }
  return false;
};

/** Vista materializada en countertiponodorutas (formulario / subformulario). */
export const vistaIdEnCounterFormularioSubformulario = (
  vistaId: string,
  counterFormIds: Set<string>,
): boolean => {
  const id = String(vistaId || '').trim();
  if (!id || !counterFormIds.size) return false;
  if (counterFormIds.has(id)) return true;
  for (const cid of counterFormIds) {
    if (idsPermisoRefsCoinciden(cid, id)) return true;
  }
  return false;
};

/** IDs de refs en regla (recurso, accionesUsu, permisos) sin `[object Object]`. */
export const extractPermisoRefIds = (refs: unknown): string[] => {
  const arr = Array.isArray(refs) ? refs : refs != null ? [refs] : [];
  const out = new Set<string>();
  arr.forEach((ref) => {
    const id = normalizePermisoRefId(ref);
    if (id && id !== '[object Object]') out.add(id);
  });
  return Array.from(out);
};

export const resolveContextoIdFromRegla = (rule: any, contextosList: ContextOption[]): string => {
  const ctxArr = Array.isArray(rule?.contextoDefi) ? rule.contextoDefi : [];
  const raw = ctxArr[0];
  const candidates = collectGobernanzaRefIds(raw);
  const fallback = normalizePermisoRefId(raw);
  if (fallback && fallback !== '[object Object]') candidates.add(fallback);
  for (const cid of candidates) {
    const hit = contextosList.find((c) => c.id === cid || idsPermisoRefsCoinciden(c.id, cid));
    if (hit?.id) return hit.id;
  }
  return fallback && fallback !== '[object Object]' ? fallback : '';
};

export const alignSelectionToCatalogIds = (
  selection: CatalogSelection,
  vistasCatalogo: Vista[],
  accionesCatalogo: Accion[],
): CatalogSelection => {
  const remap = (ids: string[], catalog: Array<{ id: string }>) => {
    const keyToCanon = new Map<string, string>();
    catalog.forEach((item) => {
      keyToCanon.set(item.id, item.id);
      collectGobernanzaRefIds(item).forEach((alt) => keyToCanon.set(alt, item.id));
    });
    const out = new Set<string>();
    ids.forEach((raw) => {
      const id = normalizePermisoRefId(raw);
      if (!id) return;
      if (keyToCanon.has(id)) {
        out.add(keyToCanon.get(id)!);
        return;
      }
      catalog.forEach((item) => {
        if (idsPermisoRefsCoinciden(item.id, id)) out.add(item.id);
      });
    });
    return Array.from(out);
  };
  return {
    vistas: remap(selection.vistas, vistasCatalogo),
    acciones: remap(selection.acciones, accionesCatalogo),
  };
};

/** Comprueba si un id de nodo/vista coincide con alguna entrada del catálogo (ObjectId ↔ iud). */
export const vistaIdMatchesCatalog = (fid: string, catalogVistas: Vista[]): boolean => {
  const f = String(fid || '').trim();
  if (!f || f === '[object Object]') return false;
  return catalogVistas.some((v) => v.id === f || idsPermisoRefsCoinciden(v.id, f));
};

export const vistaIdMatchesIdSet = (fid: string, idSet: Set<string>): boolean => {
  const f = String(fid || '').trim();
  if (!f) return false;
  if (idSet.has(f)) return true;
  for (const id of idSet) {
    if (idsPermisoRefsCoinciden(id, f)) return true;
  }
  return false;
};

export const getEntityLabel = (value: any): string =>
  String(
    value?.label ||
    value?.nombre ||
    value?.name ||
    value?.razon_social ||
    value?.titulo ||
    value?.correo ||
    ''
  ).trim();

export const buildVistaLocationMap = (
  rutasJerarquia: NodoRuta[] = []
): { byId: Map<string, VistaLoc>; byPath: Map<string, VistaLoc> } => {
  const byId = new Map<string, VistaLoc>();
  const byPath = new Map<string, VistaLoc>();

  const reg = (id: string, path: string, loc: VistaLoc) => {
    if (id) byId.set(id, loc);
    if (path) byPath.set(path, loc);
  };

  rutasJerarquia.forEach((suite) => {
    const suiteId = getEntityId(suite);
    const suiteName = String(suite?.name || '').trim();
    const suitePath = String((suite as any)?.path || '').trim();

    // La suite misma puede ser una vista heredada (p. ej. "Inicio" en raÃ­z)
    reg(suiteId, suitePath, { suiteId, suiteName, moduloId: '', moduloName: '' });

    (suite.children || []).forEach((child: any) => {
      const childId = getEntityId(child);
      const childName = String(child?.name || '').trim();
      const childPath = String(child?.path || '').trim();

      if (!hasChildNodes(child)) {
        reg(childId, childPath, { suiteId, suiteName, moduloId: '', moduloName: '' });
        return;
      }

      // MÃ³dulo con hijos â†' mapear cada descendiente y el mÃ³dulo mismo
      collectAllNodes(child.children || []).forEach((node: any) => {
        const nodeId = getEntityId(node);
        const nodePath = String(node?.path || '').trim();
        reg(nodeId, nodePath, { suiteId, suiteName, moduloId: childId, moduloName: childName });
      });
      reg(childId, childPath, { suiteId, suiteName, moduloId: childId, moduloName: childName });
    });
  });

  return { byId, byPath };
};

export const buildGroupedVistas = (
  vistasDetalle: VistaItem[],
  byId: Map<string, VistaLoc>,
  byPath?: Map<string, VistaLoc>
) => {
  type ModuloGroup = { moduloName: string; vistas: VistaItem[] };
  type SuiteGroup = { suiteName: string; modulos: Map<string, ModuloGroup> };
  const suiteGroups = new Map<string, SuiteGroup>();
  const sinSuite: VistaItem[] = [];

  vistasDetalle.forEach((vista) => {
    const loc =
      byId.get(vista.id) ||
      (byPath && vista.path ? byPath.get(vista.path) : undefined);
    if (!loc) {
      sinSuite.push(vista);
      return;
    }
    if (!suiteGroups.has(loc.suiteId)) {
      suiteGroups.set(loc.suiteId, { suiteName: loc.suiteName, modulos: new Map() });
    }
    const sg = suiteGroups.get(loc.suiteId)!;
    const mKey = loc.moduloId || '__direct__';
    if (!sg.modulos.has(mKey)) {
      sg.modulos.set(mKey, { moduloName: loc.moduloName || 'Directo', vistas: [] });
    }
    sg.modulos.get(mKey)!.vistas.push(vista);
  });

  return { suiteGroups, sinSuite };
};

export const resolveVistaLocEnArbol = (
  vista: { id: string; path?: string },
  byId: Map<string, VistaLoc>,
  byPath: Map<string, VistaLoc>
): VistaLoc | undefined =>
  byId.get(String(vista.id)) || (vista.path ? byPath.get(String(vista.path)) : undefined);

/** Vistas del catálogo (regla/herencia) asignadas a una suite por id o path en el árbol de rutas. */
export const contarVistasCatalogoEnSuite = (
  suiteId: string,
  vistasCatalogo: VistaItem[],
  selectedVistaIds: readonly string[],
  byId: Map<string, VistaLoc>,
  byPath: Map<string, VistaLoc>
): { parametrizadas: number; total: number } => {
  const sid = String(suiteId || '').trim();
  const selectedSet = new Set(selectedVistaIds.map((x) => String(x)));
  let total = 0;
  let parametrizadas = 0;
  vistasCatalogo.forEach((vista) => {
    const loc = resolveVistaLocEnArbol(vista, byId, byPath);
    if (!loc || loc.suiteId !== sid) return;
    total += 1;
    if (selectedSet.has(String(vista.id))) parametrizadas += 1;
  });
  return { parametrizadas, total };
};

/** Vistas del catálogo dentro de un módulo (por id/path en árbol de rutas). */
export const contarVistasCatalogoEnModulo = (
  suiteId: string,
  moduloId: string,
  vistasCatalogo: VistaItem[],
  selectedVistaIds: readonly string[],
  byId: Map<string, VistaLoc>,
  byPath: Map<string, VistaLoc>
): { parametrizadas: number; total: number } => {
  const sid = String(suiteId || '').trim();
  const mid = String(moduloId || '').trim();
  const selectedSet = new Set(selectedVistaIds.map((x) => String(x)));
  let total = 0;
  let parametrizadas = 0;
  vistasCatalogo.forEach((vista) => {
    const loc = resolveVistaLocEnArbol(vista, byId, byPath);
    if (!loc || loc.suiteId !== sid) return;
    if (mid ? loc.moduloId !== mid : Boolean(loc.moduloId)) return;
    total += 1;
    if (selectedSet.has(String(vista.id))) parametrizadas += 1;
  });
  return { parametrizadas, total };
};

export const buildSuiteSummaryLabel = (suiteGroups: Map<string, { suiteName: string }>, sinSuiteCount = 0): string => {
  const suiteNames = Array.from(suiteGroups.values())
    .map((suite) => String(suite.suiteName || '').trim())
    .filter(Boolean);
  if (!suiteNames.length) {
    return sinSuiteCount > 0 ? `Sin suite (${sinSuiteCount})` : 'Sin suites';
  }
  const top = suiteNames.slice(0, 2).join(', ');
  const restantes = suiteNames.length - 2;
  const suiteText = restantes > 0 ? `${top} (+${restantes})` : top;
  return sinSuiteCount > 0 ? `${suiteText} | Sin suite:${sinSuiteCount}` : suiteText;
};

export const parseMaybeJson = (value: string): unknown => {
  const raw = value.trim();
  if (!raw) return '';
  if (raw.startsWith('[') || raw.startsWith('{')) return JSON.parse(raw);
  return raw;
};

export const pickArray = (payload: any, keys: string[]): any[] => {
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

export const pickTenantCorporate = (row: any): string => {
  return String(
    row?.coporativo?.razon_social ||
    row?.coporativo?.titulo ||
    row?.coporativo?.nombre ||
    row?.coporativo?.label ||
    row?.coporativo?.nit_ruc_rtn ||
    (typeof row?.coporativo === 'string' ? row?.coporativo : '') ||
    row?.razonSocial ||
    row?.label ||
    'Sin corporativo'
  );
};

export const buildTenantGlobalContextLabel = (row: any, id: string): string => {
  const usuariosAsociados = Array.isArray(row?.usuariosAsociados) ? row.usuariosAsociados : [];
  const nombres = usuariosAsociados
    .map((usuario: any) => {
      const nombre = String(usuario?.perfil?.nombre_cliente || '').trim();
      const apellido = String(usuario?.perfil?.apellido || '').trim();
      const nombreCompleto = `${nombre} ${apellido}`.trim();
      return nombreCompleto || String(usuario?.correo || '').trim();
    })
    .filter(Boolean);

  if (String(row?.label || '').trim() && nombres.length) {
    return String(row.label).trim();
  }

  if (nombres.length === 1) {
    return `${nombres[0]} | ${id}`;
  }

  if (nombres.length > 1) {
    return `${nombres[0]} +${nombres.length - 1} | ${id}`;
  }

  const rolName = String(row?.rol || row?.rolesMabs?.rol || '').trim();
  return String(
    row?.label ||
    (rolName ? `${rolName} | ${id}` : '') ||
    row?.name ||
    row?.nombre ||
    row?.titulo ||
    id
  );
};

export const pickTenantCorreo = (row: any): string => {
  const usuariosAsociados = Array.isArray(row?.usuariosAsociados) ? row.usuariosAsociados : [];
  return String(
    row?.correo ||
    row?.email ||
    row?.usuarioId?.correo ||
    row?.usuarioId?.email ||
    row?.rolesMabs?.usuarioId?.correo ||
    row?.rolesMabs?.usuarioId?.email ||
    usuariosAsociados.find((usuario: any) => usuario?.correo || usuario?.email)?.correo ||
    usuariosAsociados.find((usuario: any) => usuario?.correo || usuario?.email)?.email ||
    ''
  ).trim();
};

export const isTenantSuperAdminScopeOption = (value: string): boolean =>
  String(value || '').trim().startsWith(TENANT_SUPERADMIN_SCOPE_PREFIX);

export const GOBERNANZA_ID_BODY_KEYS = new Set([
  'id',
  '_id',
  'iud',
  'accionId',
  'accionesSeleccionadas',
  'accionesUsu',
  'heredaGlobal',
  'herenciaAsociada',
  'herenciaGlobalRefId',
  'moduloId',
  'nvlGeneracionTenant',
  'recurso',
  'recursosSeleccionadas',
  'reglaPlantillaId',
  'suiteId',
  'tenantCorporativo',
  'tenantCorporativoId',
  'tenantGlobal',
  'tenantGlobalId',
  'tenantGlobalRef',
  'tenantSuperAdmin',
  'usuarioDestinoId',
  'usuariosDestinoIds',
  'vistaId',
  'vistaIds',
  'vistas',
  'vistasSeleccionadas',
]);

export const shouldNormalizeGobernanzaIdKey = (key: string): boolean =>
  GOBERNANZA_ID_BODY_KEYS.has(key) ||
  /(?:^|[A-Z_])(id|ids)$/i.test(key) ||
  /(?:Id|Ids)$/.test(key);

export const normalizeGobernanzaApiIdValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  if (isTenantSuperAdminScopeOption(value)) return value.trim();
  return gobernanzaEntityId(value);
};

export const normalizeGobernanzaApiIds = (value: unknown, parentKey = ''): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeGobernanzaApiIds(item, parentKey));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
      acc[key] = normalizeGobernanzaApiIds(entry, key);
      return acc;
    }, {});
  }
  return shouldNormalizeGobernanzaIdKey(parentKey) ? normalizeGobernanzaApiIdValue(value) : value;
};

export const normalizeGobernanzaRequestPayloadIds = (payload: any): any => {
  if (!payload?.body || typeof payload.body !== 'object') return payload;
  return {
    ...payload,
    body: normalizeGobernanzaApiIds(payload.body),
  };
};

export const parseGobernanzaBooleanField = (value: unknown): boolean | undefined => {
  if (value === true || value === false) return value;
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'true' || raw === '1' || raw === 'si' || raw === 'sí') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return undefined;
};

/** ID público en query: mantener iud UUID u ObjectId legacy sin fabricar IDs parciales. */
export const toMongoIdQueryParam = (raw: string): string => {
  return gobernanzaEntityId(raw);
};

/** Agrupa el combo TG/SA: ramas SuperAdmin vs tenants globales. */
export function renderTenantGlobalSelectOptionGroups(
  tenantOptions: TenantGlobal[],
  saMetas: SaJerarquiaMeta[] = [],
): React.ReactNode {
  const saOpts = tenantOptions.filter((t) => isTenantSuperAdminScopeOption(String(t.id || '')));
  const tgOpts = tenantOptions.filter((t) => !isTenantSuperAdminScopeOption(String(t.id || '')));
  const metaById = new Map(saMetas.map((m) => [String(m.id), m]));
  return (
    <>
      {saOpts.length > 0 ? (
        <optgroup label="Ramas Tenant SuperAdmin">
          {saOpts.map((t) => {
            const saId = t.id.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length);
            const meta = metaById.get(saId);
            const label = meta ? formatSaJerarquiaOptionLabel(meta) : t.label;
            return (
              <option key={t.id} value={t.id}>
                {label}
              </option>
            );
          })}
        </optgroup>
      ) : null}
      {tgOpts.length > 0 ? (
        <optgroup label="Tenants globales (TG bajo una rama SA)">
          {tgOpts.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  );
}

/**
 * SuperAdmin (Mongo) asociado al valor del select "tenant global": opción __tsa_scope__ (SA explícito)
 * o tenant global real vía `tenantGlobales` (y padre tenantGlobalAdmin si hace falta), con respaldo al JWT.
 */
export const resolveTenantSuperAdminIdForHerenciaSelect = (
  tenantGlobalFieldValue: string,
  globales: Array<{ id: string; tenantSuperAdmin?: string; tenantGlobalAdmin?: string; label?: string }>,
  jwtTenantSuperAdminId: string
): string => {
  const raw = String(tenantGlobalFieldValue || '').trim();
  if (!raw) return String(jwtTenantSuperAdminId || '').trim();
  if (isTenantSuperAdminScopeOption(raw)) {
    return raw.slice(TENANT_SUPERADMIN_SCOPE_PREFIX.length).trim();
  }
  const tenantSel = globales.find((t) => String(t.id) === raw);
  let sa = String(tenantSel?.tenantSuperAdmin || '').trim();
  if (!sa && tenantSel) {
    const parentId = String(tenantSel?.tenantGlobalAdmin || '').trim();
    if (parentId) {
      const padre = globales.find((t) => t.id === parentId);
      sa = String(padre?.tenantSuperAdmin || '').trim();
    }
  }
  return sa || String(jwtTenantSuperAdminId || '').trim();
};

export function resolveTenantGlobalDisplayMeta(
  tenantGlobalId: string,
  globales: Array<{
    id: string;
    label: string;
    corporativo?: string;
    tenantSuperAdmin?: string;
    tenantGlobalAdmin?: string;
  }>,
  refs: Array<{ id: string; label: string; meta?: Record<string, string | number | undefined> }> = []
): {
  id: string;
  label: string;
  corporativo: string;
  tenantSuperAdmin?: string;
  tenantGlobalAdmin?: string;
} | null {
  const id = String(tenantGlobalId || '').trim();
  if (!id || isTenantSuperAdminScopeOption(id)) return null;
  const fromState = globales.find((t) => String(t.id || '').trim() === id);
  if (fromState) {
    return {
      id,
      label: fromState.label,
      corporativo: String(fromState.corporativo || ''),
      tenantSuperAdmin: fromState.tenantSuperAdmin,
      tenantGlobalAdmin: fromState.tenantGlobalAdmin,
    };
  }
  const fromRef = refs.find((r) => String(r.id || '').trim() === id);
  if (fromRef) {
    return {
      id,
      label: fromRef.label,
      corporativo: String(fromRef.meta?.corporativo || ''),
      tenantSuperAdmin: String(fromRef.meta?.tenantSuperAdmin || ''),
      tenantGlobalAdmin: String(fromRef.meta?.tenantGlobalAdmin || ''),
    };
  }
  return { id, label: id, corporativo: '' };
}
