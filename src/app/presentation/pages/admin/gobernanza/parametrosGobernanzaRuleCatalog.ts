/** Digest y búsquedas sobre catálogo de reglas (ParametrosGobernanza). */



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

  const matchSa = (r: any) => {

    const gens = Array.isArray(r?.generacionTenatGlobales) ? r.generacionTenatGlobales : [];

    return gens.some((g: any) => String(g?._id || g || '').trim() === tenantSuperAdminId);

  };

  return (

    rows.find((r: any) => r?.securityPlatform === true && matchSa(r)) ||

    rows.find((r: any) => r?.securityPlatform === false && matchSa(r))

  );

}



export type DominioPorSaMap = Record<string, string> | Map<string, string>;



function getDominioFromMap(map: DominioPorSaMap, saId: string): string {

  const key = String(saId || '').trim();

  if (!key) return '';

  if (map instanceof Map) return String(map.get(key) || '').trim();

  return String(map[key] || '').trim();

}



/** Dominio apisDominios del tenant SuperAdmin (no de reglas previas). */

export function resolveDominioTenatPorSa(

  dominioPorSa: DominioPorSaMap,

  tenantSuperAdminId: string,

): string {

  return getDominioFromMap(dominioPorSa, tenantSuperAdminId);

}



/** Varios tenants SA solo si comparten dominio; si no, conserva el último seleccionado. */

export function normalizarTenantsSaMismoDominio(

  tenantIds: string[],

  dominioPorSa: DominioPorSaMap,

): { tenants: string[]; reducido: boolean; dominioComun: string } {

  const ids = tenantIds.map((id) => String(id || '').trim()).filter(Boolean);

  if (ids.length <= 1) {

    const dominioComun = ids.length ? resolveDominioTenatPorSa(dominioPorSa, ids[0]) : '';

    return { tenants: ids, reducido: false, dominioComun };

  }

  const dominios = ids.map((id) => resolveDominioTenatPorSa(dominioPorSa, id));

  const dominioComun = dominios[0] || '';

  const allSame = dominios.every((d) => d === dominioComun && Boolean(d));

  if (allSame) {

    return { tenants: ids, reducido: false, dominioComun };

  }

  const last = ids[ids.length - 1];

  return {

    tenants: [last],

    reducido: true,

    dominioComun: resolveDominioTenatPorSa(dominioPorSa, last),

  };

}



/** Construye mapa saId → dominioTenant desde metadatos de jerarquía counters. */

export function buildDominioPorSaMapFromSaMetas(

  metas: Array<{ id?: string; dominioTenant?: string | null }>,

): Map<string, string> {

  const m = new Map<string, string>();

  for (const meta of metas) {

    const id = String(meta?.id || '').trim();

    const dom = String(meta?.dominioTenant || '').trim();

    if (id && dom) m.set(id, dom);

  }

  return m;

}



/** Reglas cuyo arreglo `generacionTenatGlobales` referencia el tenantSuperAdmin (listar en herencia asociada como respaldo). */

export function findReglasPorTenantSuperAdmin(ruleCatalog: Record<string, any>, tenantSuperAdminId: string): any[] {

  if (!tenantSuperAdminId) return [];

  const sa = String(tenantSuperAdminId).trim();

  return Object.values(ruleCatalog || {}).filter((r: any) => {

    const gens = Array.isArray(r?.generacionTenatGlobales) ? r.generacionTenatGlobales : [];

    return gens.some((g: any) => String(g?._id || g || '').trim() === sa);

  });

}


