import type { JerarquiaResponse, SuperAdminNode, TenantGlobalNode } from '@/app/services/tenantUsuariosService';

/** Fila mínima para selects alineados al organigrama «Tenant global y ramas». */
export type TenantGlobalFromJerarquiaRow = {
  id: string;
  label: string;
  corporativo?: string;
  /** SA de la rama mostrada en organigrama (materialización counters global / rama). */
  tenantSuperAdmin?: string;
  tenantGlobalAdmin?: string;
};

function collectFromTenantGlobalNodes(
  nodes: TenantGlobalNode[] | undefined,
  out: TenantGlobalFromJerarquiaRow[],
  seen: Set<string>,
): void {
  if (!Array.isArray(nodes)) return;
  for (const n of nodes) {
    const tg = n?.tenantGlobal;
    const id = tg?.iud ? String(tg.iud).trim() : '';
    if (id && !seen.has(id)) {
      seen.add(id);
      const corp = String(tg?.razon_social || tg?.titulo || '').trim();
      const codigo = String(tg?.codigoJerarquia || '').trim();
      const nit = String(tg?.nit_ruc_rtn || '').trim();
      const meta = [codigo, corp || 'Tenant global', nit ? `NIT ${nit}` : '']
        .filter(Boolean)
        .join(' · ');
      const label = meta ? `${meta} · …${id.slice(-8)}` : `${corp || 'Tenant global'} · …${id.slice(-8)}`;
      const saBranch = n?.tenantSuperAdmin?.iud ? String(n.tenantSuperAdmin.iud).trim() : undefined;
      const parent = tg?.parent ? String(tg.parent).trim() : '';
      out.push({
        id,
        label,
        corporativo: corp || undefined,
        tenantSuperAdmin: saBranch,
        tenantGlobalAdmin: parent || undefined,
      });
    }
    if (n?.subTenantGlobales?.length) {
      collectFromTenantGlobalNodes(n.subTenantGlobales, out, seen);
    }
  }
}

function collectFromSuperAdminTree(nodes: SuperAdminNode[] | undefined, out: TenantGlobalFromJerarquiaRow[], seen: Set<string>): void {
  if (!Array.isArray(nodes)) return;
  for (const sn of nodes) {
    collectFromTenantGlobalNodes(sn?.tenantsGlobales, out, seen);
    if (sn?.subSuperAdmins?.length) {
      collectFromSuperAdminTree(sn.subSuperAdmins, out, seen);
    }
  }
}

/**
 * Tenant globales visibles en el mismo árbol que `GET /api/registro/jerarquia/usuarios`
 * (JWT scope, preferencia `tenantJerarquiaCountersGlobal`, sub-TG recursivos).
 */
export function tenantGlobalOptionsFromJerarquiaUsuarios(
  j: JerarquiaResponse | null | undefined,
): TenantGlobalFromJerarquiaRow[] {
  if (!j) return [];
  const seen = new Set<string>();
  const out: TenantGlobalFromJerarquiaRow[] = [];
  collectFromTenantGlobalNodes(j.tenantsGlobales, out, seen);
  collectFromSuperAdminTree(j.superAdminTree, out, seen);
  return out;
}

/**
 * Filtrado de tenant globales según `tenantJerarquiaCounter` para el SuperAdmin en sesión.
 * Misma semántica que menú admin / `routeService.debeAplicarFiltroHerenciaSuperAdmin`:
 * - Sin fila SA↔corporativo en counters → sin acotar (lista completa).
 * - Con corporativo asociado → solo TG raíz con ese `tenantSuperAdmin` y descendientes por `tenantGlobalAdmin`.
 */

export type TenantGlobalJerarquiaRow = {
  id: string;
  tenantGlobalAdmin?: string;
  tenantSuperAdmin?: string;
  label?: string;
  corporativo?: string;
};

/** Expande IDs semilla incluyendo todos los TG descendientes (árbol por tenantGlobalAdmin). */
export function expandTenantGlobalDescendants(
  tenants: TenantGlobalJerarquiaRow[],
  seedIds: string[]
): Set<string> {
  const allowed = new Set(seedIds.filter(Boolean));
  let changed = true;
  while (changed) {
    changed = false;
    tenants.forEach((t) => {
      const id = String(t.id || '').trim();
      const parent = String(t.tenantGlobalAdmin || '').trim();
      if (!id || !parent) return;
      if (allowed.has(parent) && !allowed.has(id)) {
        allowed.add(id);
        changed = true;
      }
    });
  }
  return allowed;
}

/**
 * @param saJerarquiaTieneCorporativoEnCounters `true` si existe al menos un `tenantjerarquiacounter`
 *        con `tenantSuperAdmin` del JWT y `corporativo` no nulo (GET selects).
 */
export function filtrarTenantGlobalesPorJerarquiaSuperAdmin(
  tenantGlobales: TenantGlobalJerarquiaRow[],
  actorTenantSuper: string,
  saJerarquiaTieneCorporativoEnCounters: boolean
): TenantGlobalJerarquiaRow[] {
  if (!actorTenantSuper) return tenantGlobales;
  if (!saJerarquiaTieneCorporativoEnCounters) {
    return tenantGlobales;
  }
  const roots = tenantGlobales
    .filter((t) => String(t.tenantSuperAdmin || '').trim() === actorTenantSuper)
    .map((t) => String(t.id || '').trim())
    .filter(Boolean);
  const allowed = expandTenantGlobalDescendants(tenantGlobales, roots);
  const visibles = tenantGlobales.filter((t) => allowed.has(String(t.id || '').trim()));
  return visibles.length ? visibles : tenantGlobales;
}
