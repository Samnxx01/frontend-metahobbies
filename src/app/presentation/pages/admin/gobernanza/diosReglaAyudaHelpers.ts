import type { SaJerarquiaCounterIndice } from './saJerarquiaCounterFilter';
import type { DiosReglaSaMeta } from './diosReglaAlcanceHelpers';
import { formatSaTenantJerarquiaSelectLabel } from './SaJerarquiaUsuariosPanel';

export type DiosReglaSaAccesoHelpRow = {
  id: string;
  label: string;
  accesoFull: boolean;
  motivo: string;
  esJwt: boolean;
};

export type SaPosicionJerarquia = {
  /** SA raíz primaria: codigoPadre null Y primera emisión global (min secuenciaJerarquia). */
  esRaizPrimera: boolean;
  /** SA hijo: tiene codigoPadre definido en tenantjerarquiacounters. */
  esHijo: boolean;
  codigoPadre: string | null;
};

/**
 * Determina si el SA del JWT es la raíz primaria de la jerarquía o un SA hijo.
 * Raíz primaria: codigoPadre null + secuenciaJerarquia mínima entre todas las raíces.
 * Hijo: tiene codigoPadre definido.
 */
export function resolverSaJerarquiaPosicion(
  jwtSaId: string,
  jerarquiaSaCounters: SaJerarquiaCounterIndice[] = [],
): SaPosicionJerarquia {
  const id = String(jwtSaId || '').trim();
  const vacia: SaPosicionJerarquia = { esRaizPrimera: false, esHijo: false, codigoPadre: null };
  if (!id || !jerarquiaSaCounters.length) return vacia;

  const row = jerarquiaSaCounters.find((r) => String(r.tenantSuperAdminId || '') === id);
  if (!row) return vacia;

  const codigoPadre = String(row.codigoPadre || '').trim() || null;
  if (codigoPadre) return { esRaizPrimera: false, esHijo: true, codigoPadre };

  const raices = jerarquiaSaCounters
    .filter((r) => !String(r.codigoPadre || '').trim())
    .sort(
      (a, b) =>
        (a.secuenciaJerarquia ?? Number.MAX_SAFE_INTEGER) -
        (b.secuenciaJerarquia ?? Number.MAX_SAFE_INTEGER),
    );
  const esRaizPrimera = raices.length > 0 && String(raices[0].tenantSuperAdminId) === id;
  return { esRaizPrimera, esHijo: false, codigoPadre: null };
}

/** Alguna fila counters del SA tiene corporativo (misma regla que el backend). */
export function saTieneCorporativoEnJerarquiaCounter(
  saId: string,
  jerarquiaSaCounters: SaJerarquiaCounterIndice[] = [],
): boolean {
  const id = String(saId || '').trim();
  if (!id) return false;
  return jerarquiaSaCounters.some(
    (r) => String(r.tenantSuperAdminId) === id && Boolean(String(r.corporativoId || '').trim()),
  );
}

/** Actor API o fallback desde jerarquiaSaCounters cuando el GET destino pisa el flag. */
export function resolverSaJerarquiaTieneCorporativoEnCounters(
  jwtSaId: string,
  jerarquiaSaCounters: SaJerarquiaCounterIndice[] = [],
  fromActor?: boolean,
): boolean | undefined {
  if (typeof fromActor === 'boolean') return fromActor;
  const id = String(jwtSaId || '').trim();
  if (!id || !jerarquiaSaCounters.length) return undefined;
  return saTieneCorporativoEnJerarquiaCounter(id, jerarquiaSaCounters);
}

/** Resuelve securityPlatform desde meta SA (API) o fallback a selects NVL config. */
export function resolverSecurityPlatformDesdeTenantSa(
  saId: string,
  saMetas: Array<Pick<DiosReglaSaMeta, 'id' | 'securityPlatform' | 'nvlGeneracionTenantId'>> = [],
  nvlOptions: Array<{ id: string; meta?: Record<string, string | number | undefined> }> = [],
): boolean {
  const id = String(saId || '').trim();
  if (!id) return false;
  const meta = saMetas.find((m) => String(m.id || '').trim() === id);
  if (meta && typeof meta.securityPlatform === 'boolean') {
    return meta.securityPlatform;
  }
  const nvlId = String(meta?.nvlGeneracionTenantId || '').trim();
  if (nvlId) {
    const opt = nvlOptions.find((o) => o.id === nvlId);
    if (opt) {
      return String(opt.meta?.securityPlatform || '').toLowerCase() === 'true';
    }
  }
  return false;
}

/** Ramas SA visibles para parametrizar regla DIOS y si califican acceso full (sin corporativo en counters). */
export function buildDiosReglaSaAccesoHelpRows(
  metas: DiosReglaSaMeta[] = [],
  jerarquiaSaCounters: SaJerarquiaCounterIndice[] = [],
  jwtSaId = '',
): DiosReglaSaAccesoHelpRow[] {
  const jwt = String(jwtSaId || '').trim();
  const byId = new Map<string, DiosReglaSaMeta>();

  for (const m of metas) {
    const id = String(m.id || '').trim();
    if (id) byId.set(id, m);
  }
  if (jwt && !byId.has(jwt)) {
    byId.set(jwt, { id: jwt });
  }

  return Array.from(byId.entries()).map(([id, meta]) => {
    const conCorp = saTieneCorporativoEnJerarquiaCounter(id, jerarquiaSaCounters);
    const accesoFull = !conCorp;
    return {
      id,
      label: formatSaTenantJerarquiaSelectLabel(meta),
      accesoFull,
      esJwt: jwt === id,
      motivo: accesoFull
        ? 'Sin corporativo en tenantJerarquiaCounter: acceso full (crear/sincronizar regla DIOS con todas las vistas activas).'
        : 'Con corporativo en counters: solo referencia de la regla parametrizada (sin sync total).',
    };
  });
}
