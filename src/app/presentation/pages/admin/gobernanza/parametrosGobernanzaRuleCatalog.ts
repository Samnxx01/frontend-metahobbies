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

/** Reglas cuyo arreglo `generacionTenatGlobales` referencia el tenantSuperAdmin (listar en herencia asociada como respaldo). */
export function findReglasPorTenantSuperAdmin(ruleCatalog: Record<string, any>, tenantSuperAdminId: string): any[] {
  if (!tenantSuperAdminId) return [];
  const sa = String(tenantSuperAdminId).trim();
  return Object.values(ruleCatalog || {}).filter((r: any) => {
    const gens = Array.isArray(r?.generacionTenatGlobales) ? r.generacionTenatGlobales : [];
    return gens.some((g: any) => String(g?._id || g || '').trim() === sa);
  });
}
