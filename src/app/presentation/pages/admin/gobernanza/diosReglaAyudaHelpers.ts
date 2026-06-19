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
