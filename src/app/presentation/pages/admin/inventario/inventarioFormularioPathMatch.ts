/**
 * Cruza paths del catalogo de inventario (ConfigInventario / modal) con filas de rutasSeguridad
 * devueltas por GET formularios-autorizacion/opciones.
 */

export type InventarioPathRow = { path: string; id?: string; name?: string; tipoNodo?: string };

export const normalizePathKey = (path: string): string => path.trim().replace(/\/+$/, '').toLowerCase();

export type ModuleRouteMatchKind = 'exact' | 'fuzzy' | 'none';

export function resolveModuleCatalogToPathRow<T extends InventarioPathRow>(
  modulePath: string,
  rows: T[],
  opts?: { tab?: string },
): { row: T | null; kind: ModuleRouteMatchKind } {
  const byPath = new Map(rows.map((r) => [normalizePathKey(r.path), r]));
  const k = normalizePathKey(modulePath);
  const exact = byPath.get(k);
  if (exact) return { row: exact, kind: 'exact' };

  const segs = k.split('/').filter(Boolean);
  const last = segs[segs.length - 1] || '';
  if (!last) return { row: null, kind: 'none' };

  const candidates = rows.filter((r) => {
    const rk = normalizePathKey(r.path);
    if (rk === k) return true;
    if (rk.endsWith(`/${last}`) || rk.endsWith(last)) return true;
    return rk.includes(`/${last}/`) || rk.includes(`/${last}`);
  });

  if (candidates.length === 0) {
    const tab = String(opts?.tab || '').trim().toLowerCase();
    if (tab) {
      const tabSeg = tab.replace(/-/g, '');
      const tabCandidates = rows.filter((r) => {
        const rk = normalizePathKey(r.path);
        const name = normalizePathKey(String(r.name || ''));
        return (
          rk.includes(`/${tab}/`)
          || rk.includes(`/${tab}`)
          || rk.includes(tabSeg)
          || name.includes(tab.replace(/-/g, ' '))
          || name.includes(tab)
        );
      });
      if (tabCandidates.length === 1) return { row: tabCandidates[0]!, kind: 'fuzzy' };
      if (tabCandidates.length > 1) {
        tabCandidates.sort((a, b) => normalizePathKey(a.path).length - normalizePathKey(b.path).length);
        return { row: tabCandidates[0]!, kind: 'fuzzy' };
      }
    }
    return { row: null, kind: 'none' };
  }
  if (candidates.length === 1) return { row: candidates[0], kind: 'fuzzy' };

  const scored = candidates.map((r) => {
    const rk = normalizePathKey(r.path);
    let score = 0;
    if (rk.includes('inventario')) score += 2;
    if (rk.includes('administracion')) score += 2;
    if (rk.endsWith(`/${last}`) || rk.endsWith(last)) score += 4;
    const dist = Math.abs(rk.length - k.length);
    return { r, score, dist };
  });
  scored.sort((a, b) => b.score - a.score || a.dist - b.dist);
  const top = scored[0];
  const second = scored[1];
  if (second && top.score === second.score && top.dist === second.dist) {
    return { row: null, kind: 'none' };
  }
  return { row: top.r, kind: 'fuzzy' };
}

/**
 * Path de menú para mostrar en ConfigInventario: prioriza coincidencia exacta con el catalogo,
 * luego rutas que terminan en `/segmento`, luego segmento compuesto (p.ej. parametrizacion-bodegas).
 * No usa subrutas tipo .../stock/proveedores como sustituto de .../stock.
 */
export function resolveMenuPathForCatalogModule<T extends InventarioPathRow>(
  catalogPath: string,
  pathSegment: string,
  rows: T[],
): string | null {
  const nk = normalizePathKey(catalogPath);
  const seg = normalizePathKey(pathSegment).replace(/^\/+|\/+$/g, '');
  if (!seg) return null;

  const exact = rows.find((r) => normalizePathKey(r.path) === nk);
  if (exact) return exact.path;

  const tier1 = rows.filter((r) => {
    const rk = normalizePathKey(r.path);
    return rk.endsWith(`/${seg}`) || rk === seg;
  });
  if (tier1.length) {
    tier1.sort((a, b) => normalizePathKey(a.path).length - normalizePathKey(b.path).length);
    return tier1[0]!.path;
  }

  const tier2 = rows.filter((r) => {
    const parts = normalizePathKey(r.path).split('/').filter(Boolean);
    return parts.some((p) => p === seg || p.endsWith(`-${seg}`) || p.endsWith(`_${seg}`));
  });
  if (!tier2.length) return null;
  tier2.sort((a, b) => normalizePathKey(a.path).length - normalizePathKey(b.path).length);
  return tier2[0]!.path;
}
