import type {
  GobernanzaModuloConfigApi,
  GobernanzaModuloTipoApi,
  GobernanzaRutaOpcionApi,
} from './gobernanzaModuloApiTypes';
import type { GobernanzaFormularioDetalleApi } from './gobernanzaModuloApiTypes';
import type { GobernanzaModuloCatalogo } from './gobernanzaModulosCatalog';
import {
  normalizarGobernanzaEndpointId,
  normalizarGobernanzaMenuPath,
  normalizarGobernanzaRutaId,
  normalizarGobernanzaTipoId,
} from './gobernanzaActionIds';
import { gobernanzaEntityId, normalizarGobernanzaRefId } from './gobernanzaEntityId';
import { endpointIdDesdeComponente } from './permisos-forms/gobernanzaPermisosFormRegistry';
import { endpointIdDesdeComponenteReglas } from './reglas-forms/gobernanzaReglasFormRegistry';

function endpointIdFromAnyComponent(component?: string | null): string {
  return endpointIdDesdeComponente(component) || endpointIdDesdeComponenteReglas(component);
}

const HTTP_VERBS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function esAccionIdFormularioValido(accionId: string): boolean {
  const id = String(accionId || '').trim();
  if (!id) return false;
  return !HTTP_VERBS.has(id.toUpperCase());
}

export type GobernanzaSelectOpcion = {
  value: string;
  label: string;
  hint?: string;
};

export type GobernanzaAccionCatalogItem = {
  accionId: string;
  method: string;
  title: string;
  path?: string;
  shortLabel?: string;
  description?: string;
  actor?: string;
};

function resolverHttpMethodAccion(rawMethod = '', etiquetas = ''): string {
  for (const candidate of [rawMethod, etiquetas]) {
    const raw = String(candidate || '').trim();
    if (!raw) continue;
    const verbMatch = raw.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i);
    if (verbMatch) return verbMatch[1].toUpperCase();
    if (raw.startsWith('/')) return 'GET';
    const first = raw.split(/\s+/)[0]?.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (first && HTTP_VERBS.has(first)) return first;
  }
  return 'GET';
}

/** Catálogo completo de la colección Mongo `acciones` (parametrización). */
export function accionesCatalogDesdeAccionesApi(
  rows: Array<{ _id?: string; iud?: string; method?: string; etiquetas?: string; path?: string }> = []
): GobernanzaAccionCatalogItem[] {
  return rows
    .map((row) => {
      const accionId = gobernanzaEntityId(row);
      if (!accionId) return null;
      const rawMethod = String(row.method || '').trim();
      const httpMethod = resolverHttpMethodAccion(rawMethod, row.etiquetas);
      const path =
        String(row.path || '').trim()
        || (rawMethod.startsWith('/') ? rawMethod.trim() : '');
      return {
        accionId,
        method: httpMethod,
        title: String(row.etiquetas || rawMethod || httpMethod).trim(),
        ...(path ? { path } : {}),
      };
    })
    .filter((a): a is GobernanzaAccionCatalogItem => Boolean(a));
}

/** Opciones del select Tipo (gobernanzaModuloTipos). */
export function buildTiposModuloOpciones(
  tipos: GobernanzaModuloTipoApi[] = []
): GobernanzaSelectOpcion[] {
  return tipos
    .filter((t) => t.estado !== false && t.id)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre))
    .map((t) => ({
      value: normalizarGobernanzaTipoId(t.id) || String(t.id || '').trim(),
      label: t.nombre || t.codigo,
      hint: t.formularioComponent || t.codigo,
    }));
}

export function filtrarAccionesPorTipo(
  catalogo: GobernanzaAccionCatalogItem[] = [],
  tipo: GobernanzaModuloTipoApi | null | undefined,
  componentHint?: string | null
): GobernanzaAccionCatalogItem[] {
  if (!tipo) return catalogo;

  const fromTipo = accionesCatalogDesdeTipos([tipo], tipo, componentHint);
  if (!fromTipo.length) return catalogo;

  const allowed = new Set(fromTipo.map((a) => a.accionId));
  const filtered = catalogo.filter((a) => allowed.has(normalizarGobernanzaEndpointId(a.accionId)));
  return filtered.length ? filtered : fromTipo;
}

/** Config de gobernanzaModuloConfigs que corresponde a la ruta seleccionada. */
export function resolverConfigPorRuta(
  configs: GobernanzaModuloConfigApi[] = [],
  rutaId?: string | null,
  menuPath?: string | null
): GobernanzaModuloConfigApi | null {
  const rid = normalizarGobernanzaRutaId(rutaId);
  if (rid) {
    const porRuta = configs.find(
      (c) => normalizarGobernanzaRutaId(c.rutaId || c.formularioId) === rid
    );
    if (porRuta) return porRuta;
  }

  const path = normalizarGobernanzaMenuPath(menuPath);
  if (path) {
    const porPath = configs.find((c) => {
      const cfgPath = normalizarGobernanzaMenuPath(c.menuPath || c.frontPath || c.rutaPath);
      return cfgPath && cfgPath.toLowerCase() === path.toLowerCase();
    });
    if (porPath) return porPath;
  }

  return null;
}

export function mergeAccionesCatalogo(
  ...listas: GobernanzaAccionCatalogItem[][]
): GobernanzaAccionCatalogItem[] {
  const seen = new Set<string>();
  const out: GobernanzaAccionCatalogItem[] = [];
  for (const lista of listas) {
    for (const item of lista) {
      const id = String(item.accionId || '').trim();
      if (!id) continue;
      const next: GobernanzaAccionCatalogItem = {
        accionId: id,
        method: String(item.method || 'GET').trim().toUpperCase(),
        title: String(item.title || id).trim(),
        ...(item.path ? { path: String(item.path).trim() } : {}),
        ...(item.shortLabel ? { shortLabel: String(item.shortLabel).trim() } : {}),
        ...(item.description ? { description: String(item.description).trim() } : {}),
        ...(item.actor ? { actor: String(item.actor).trim() } : {}),
      };
      if (!seen.has(id)) {
        seen.add(id);
        out.push(next);
        continue;
      }
      const idx = out.findIndex((a) => a.accionId === id);
      if (idx < 0) continue;
      const prev = out[idx];
      out[idx] = {
        ...prev,
        ...next,
        title: next.title || prev.title,
        method: next.method || prev.method,
        path: next.path || prev.path,
        shortLabel: next.shortLabel || prev.shortLabel,
        description: next.description || prev.description,
        actor: next.actor || prev.actor,
      };
    }
  }
  return out;
}

function pushUnico(
  out: GobernanzaSelectOpcion[],
  seen: Set<string>,
  value: string,
  label: string,
  hint?: string
): void {
  const v = String(value || '').trim();
  if (!v || seen.has(v)) return;
  seen.add(v);
  out.push({ value: v, label: String(label || v).trim() || v, hint });
}

/** Opciones de título desde gobernanzaModuloConfigs + rutas + catálogo local. */
export function buildTitulosOpciones(
  configs: GobernanzaModuloConfigApi[] = [],
  catalogoLocal: GobernanzaModuloCatalogo | null | undefined,
  rutas: GobernanzaRutaOpcionApi[] = [],
  formularioDetalle: GobernanzaFormularioDetalleApi | null = null
): GobernanzaSelectOpcion[] {
  const seen = new Set<string>();
  const out: GobernanzaSelectOpcion[] = [];

  for (const cfg of configs) {
    const titulo = String(cfg.label || cfg.nombre || '').trim();
    if (titulo) pushUnico(out, seen, titulo, titulo, cfg.slug);
  }
  if (catalogoLocal?.label) {
    pushUnico(out, seen, catalogoLocal.label, catalogoLocal.label, 'Catálogo local');
  }
  for (const r of rutas) {
    pushUnico(out, seen, r.name, r.name, r.path);
  }
  if (formularioDetalle?.name) {
    pushUnico(out, seen, formularioDetalle.name, formularioDetalle.name, formularioDetalle.path);
  }

  return out;
}

/** Opciones de descripción desde gobernanzaModuloConfigs + catálogo local. */
export function buildDescripcionesOpciones(
  configs: GobernanzaModuloConfigApi[] = [],
  catalogoLocal: GobernanzaModuloCatalogo | null | undefined,
  tituloSeleccionado = ''
): GobernanzaSelectOpcion[] {
  const seen = new Set<string>();
  const out: GobernanzaSelectOpcion[] = [];
  const tituloKey = String(tituloSeleccionado || '').trim().toLowerCase();

  for (const cfg of configs) {
    const matchTitulo = !tituloKey || String(cfg.label || '').trim().toLowerCase() === tituloKey;
    if (matchTitulo && cfg.description?.trim()) {
      pushUnico(out, seen, cfg.description, cfg.description, cfg.slug);
    }
  }
  if (catalogoLocal?.description) {
    pushUnico(out, seen, catalogoLocal.description, catalogoLocal.description, 'Catálogo local');
  }
  for (const cfg of configs) {
    if (cfg.description?.trim()) {
      pushUnico(out, seen, cfg.description, cfg.description, cfg.slug);
    }
  }

  return out;
}

export function accionesCatalogDesdeConfig(
  cfg: GobernanzaModuloConfigApi | null | undefined
): GobernanzaAccionCatalogItem[] {
  if (!cfg) return [];
  const fromCatalog = (cfg.accionesCatalog ?? [])
    .map((a) => {
      const accionRefRaw = String(
        (a as { accionRef?: string; accionId?: string }).accionRef
        || (a as { accionId?: string }).accionId
        || a.id
        || ''
      ).trim();
      const refPersistida = normalizarGobernanzaRefId(accionRefRaw);
      return {
        accionId: refPersistida || normalizarGobernanzaEndpointId(a.id),
        method: String(a.method || 'GET').trim().toUpperCase(),
        title: String(a.title || a.shortLabel || a.id || '').trim(),
        ...(a.path ? { path: String(a.path).trim() } : {}),
        ...(a.shortLabel ? { shortLabel: String(a.shortLabel).trim() } : {}),
      };
    })
    .filter((a) => a.accionId);

  if (fromCatalog.length) return fromCatalog;

  return (cfg.endpointIds ?? [])
    .map((id) => {
      const accionId = normalizarGobernanzaEndpointId(id);
      return {
        accionId,
        method: 'GET',
        title: accionId,
      };
    })
    .filter((a) => a.accionId && esAccionIdFormularioValido(a.accionId));
}

/** Acciones desde gobernanzaModuloTipos.formularios (endpointId + titulo). */
export function accionesCatalogDesdeTipos(
  tipos: GobernanzaModuloTipoApi[] = [],
  tipoPreferido?: GobernanzaModuloTipoApi | null,
  componentHint?: string | null
): GobernanzaAccionCatalogItem[] {
  const fuente = tipoPreferido ? [tipoPreferido] : tipos.filter((t) => t.estado !== false);
  const seen = new Set<string>();
  const out: GobernanzaAccionCatalogItem[] = [];

  for (const tipo of fuente) {
    const formularios = Array.isArray(tipo.formularios) ? tipo.formularios : [];
    for (const f of formularios) {
      const accionId =
        normalizarGobernanzaEndpointId(f.endpointId)
        || normalizarGobernanzaEndpointId(
          endpointIdFromAnyComponent(f.formularioComponent || tipo.formularioComponent || componentHint)
        );
      if (!accionId || seen.has(accionId)) continue;
      seen.add(accionId);
      out.push({
        accionId,
        method: 'GET',
        title: String(f.titulo || f.descripcion || accionId).trim() || accionId,
      });
    }

    const fallbackId = normalizarGobernanzaEndpointId(
      endpointIdFromAnyComponent(tipo.formularioComponent || componentHint)
    );
    if (!out.length && fallbackId && !seen.has(fallbackId)) {
      seen.add(fallbackId);
      out.push({
        accionId: fallbackId,
        method: 'GET',
        title: String(tipo.nombre || fallbackId).trim() || fallbackId,
      });
    }
  }

  return out;
}

/** Catálogo para el modal: colección acciones (parametrización) + metadatos publicados en configs. */
export function buildAccionesPublicablesParametrizar(
  catalogoAcciones: GobernanzaAccionCatalogItem[] = [],
  configs: GobernanzaModuloConfigApi[] = [],
  configPorRuta: GobernanzaModuloConfigApi | null = null
): GobernanzaAccionCatalogItem[] {
  const desdeConfigs = configs.flatMap((cfg) => accionesCatalogDesdeConfig(cfg));
  const registradasRuta = accionesCatalogDesdeConfig(configPorRuta);
  const merged = mergeAccionesCatalogo(catalogoAcciones, desdeConfigs, registradasRuta);
  return enriquecerAccionesDesdeConfigs(merged, configs);
}

function pathPorMetodoEnConfigs(
  method: string,
  configs: GobernanzaModuloConfigApi[] = []
): string {
  const meta = String(method || '').trim().toUpperCase();
  if (!meta) return '';
  for (const cfg of configs) {
    for (const item of cfg.accionesCatalog ?? []) {
      if (String(item.method || '').trim().toUpperCase() === meta && item.path) {
        return String(item.path).trim();
      }
    }
  }
  return '';
}

function enriquecerAccionesDesdeConfigs(
  items: GobernanzaAccionCatalogItem[] = [],
  configs: GobernanzaModuloConfigApi[] = []
): GobernanzaAccionCatalogItem[] {
  const metaById = new Map<string, GobernanzaAccionCatalogItem>();
  const metaByMethod = new Map<string, GobernanzaAccionCatalogItem>();
  for (const cfg of configs) {
    for (const item of accionesCatalogDesdeConfig(cfg)) {
      const prev = metaById.get(item.accionId);
      metaById.set(item.accionId, prev ? { ...prev, ...item, title: item.title || prev.title } : item);
      const methodKey = String(item.method || '').trim().toUpperCase();
      if (methodKey && !metaByMethod.has(methodKey)) {
        metaByMethod.set(methodKey, item);
      }
    }
  }

  return items.map((item) => {
    const meta = metaById.get(item.accionId);
    const byMethod = metaByMethod.get(String(item.method || '').trim().toUpperCase());
    const path =
      String(item.path || '').trim()
      || meta?.path
      || byMethod?.path
      || pathPorMetodoEnConfigs(item.method, configs);
    return {
      ...item,
      ...(meta ? { ...meta, accionId: item.accionId, title: item.title || meta.title } : {}),
      ...(path ? { path } : {}),
    };
  });
}

/** Registros existentes en gobernanzaModuloConfigs. */
export function buildConfigsOpciones(
  configs: GobernanzaModuloConfigApi[] = []
): GobernanzaSelectOpcion[] {
  const seen = new Set<string>();
  const out: GobernanzaSelectOpcion[] = [];
  for (const cfg of configs) {
    const slug = String(cfg.slug || '').trim();
    if (!slug) continue;
    pushUnico(out, seen, slug, cfg.label || cfg.nombre || slug, cfg.menuPath || cfg.frontPath || slug);
  }
  return out;
}

/** Catálogo unificado (colección acciones + configs publicados). */
export function buildAccionesCatalogoDinamico(
  configs: GobernanzaModuloConfigApi[] = [],
  catalogoAcciones: GobernanzaAccionCatalogItem[] = []
): GobernanzaAccionCatalogItem[] {
  const merged = mergeAccionesCatalogo(
    catalogoAcciones,
    ...configs.map((cfg) => accionesCatalogDesdeConfig(cfg))
  );
  return enriquecerAccionesDesdeConfigs(merged, configs);
}

/** @deprecated Usar buildAccionesCatalogoDinamico. */
export function buildAccionesCatalogo(
  configs: GobernanzaModuloConfigApi[] = [],
  catalogoAcciones: GobernanzaAccionCatalogItem[] = [],
  _moduloTipos: GobernanzaModuloTipoApi[] = []
): GobernanzaAccionCatalogItem[] {
  return buildAccionesCatalogoDinamico(configs, catalogoAcciones);
}

/** Opciones para el multi-select de acciones. */
export function buildAccionesOpciones(
  catalogo: GobernanzaAccionCatalogItem[] = []
): GobernanzaSelectOpcion[] {
  return catalogo.map((a) => ({
    value: a.accionId,
    label: `${a.method} · ${a.title || a.accionId}`,
    hint: a.accionId,
  }));
}
