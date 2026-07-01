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

/** Lista unificada TG para combos de reglas globales (selects JWT + organigrama usuarios). */
export function buildTenantGlobalesListaFromSelectsJerarquia(
  selectsData: Record<string, unknown>,
  jerarquiaUsuarios?: JerarquiaResponse | null,
): TenantGlobalFromJerarquiaRow[] {
  const byId = new Map<string, TenantGlobalFromJerarquiaRow>();
  const merge = (rows: TenantGlobalFromJerarquiaRow[]) => {
    rows.forEach((r) => {
      const id = String(r.id || '').trim();
      if (!id) return;
      const prev = byId.get(id);
      byId.set(
        id,
        prev
          ? {
              ...prev,
              ...r,
              label:
                (prev.label && prev.label.length >= (r.label || '').length ? prev.label : r.label) ||
                prev.label ||
                id,
              tenantSuperAdmin: prev.tenantSuperAdmin || r.tenantSuperAdmin,
              tenantGlobalAdmin: prev.tenantGlobalAdmin || r.tenantGlobalAdmin,
            }
          : r,
      );
    });
  };

  const jerarquiaTg = Array.isArray(selectsData.tenantGlobalesDesdeJerarquiaCounters)
    ? selectsData.tenantGlobalesDesdeJerarquiaCounters
    : [];
  if (jerarquiaTg.length) {
    merge(
      jerarquiaTg
        .map((row: { id?: string; label?: string; coporativoNombre?: string; tenantSuperAdminId?: string }) => {
          const id = String(row?.id || '').trim();
          if (!id) return null;
          return {
            id,
            label: String(row?.label || id),
            corporativo: row?.coporativoNombre || undefined,
            tenantSuperAdmin: row?.tenantSuperAdminId ? String(row.tenantSuperAdminId) : undefined,
          };
        })
        .filter(Boolean) as TenantGlobalFromJerarquiaRow[],
    );
  }

  const registrados = Array.isArray(selectsData.tenantGlobalesRegistrados)
    ? selectsData.tenantGlobalesRegistrados
    : [];
  merge(
    registrados
      .map((row: { id?: string; _id?: string; rol?: string; coporativoNombre?: string }) => {
        const id = String(row?.id || row?._id || '').trim();
        if (!id) return null;
        const rol = String(row?.rol || 'TENANT').trim();
        const corp = String(row?.coporativoNombre || '').trim();
        return {
          id,
          label: `${rol}${corp ? ` · ${corp}` : ''} · …${id.slice(-8)}`,
          corporativo: corp || undefined,
        };
      })
      .filter(Boolean) as TenantGlobalFromJerarquiaRow[],
  );

  merge(tenantGlobalOptionsFromJerarquiaUsuarios(jerarquiaUsuarios));

  return Array.from(byId.values());
}

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
  seedIds: string[],
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
 * Filtrado de tenant globales para sesión SuperAdmin según rama del SA efectivo
 * (tenantjerarquiacounters: ancla + descendientes por tenantSuperAdmin).
 */
export function filtrarTenantGlobalesPorJerarquiaSuperAdmin(
  tenantGlobales: TenantGlobalJerarquiaRow[],
  actorTenantSuper: string,
  _saJerarquiaTieneCorporativoEnCounters?: boolean,
): TenantGlobalJerarquiaRow[] {
  const sa = String(actorTenantSuper || '').trim();
  if (!sa) {
    return tenantGlobales;
  }

  const roots = tenantGlobales
    .filter((t) => String(t.tenantSuperAdmin || '').trim() === sa)
    .map((t) => String(t.id || '').trim())
    .filter(Boolean);
  const allowed = expandTenantGlobalDescendants(tenantGlobales, roots);
  tenantGlobales.forEach((t) => {
    const id = String(t.id || '').trim();
    if (id && String(t.tenantSuperAdmin || '').trim() === sa) {
      allowed.add(id);
    }
  });
  const visibles = tenantGlobales.filter((t) => allowed.has(String(t.id || '').trim()));

  return visibles.length > 0 ? visibles : tenantGlobales.filter((t) => String(t.tenantSuperAdmin || '').trim() === sa);
}

export type TenantGlobalCadenaRamaNodo = {
  id: string;
  label: string;
  corporativo?: string;
  tenantSuperAdmin?: string;
  esRaizRama: boolean;
};

/** Cadena ascendente TG → padre → … hasta raíz de rama (`tenantGlobalAdmin`). */
export function buildTenantGlobalCadenaRamaAscendente(
  tenantGlobalId: string,
  tenants: TenantGlobalJerarquiaRow[],
): TenantGlobalCadenaRamaNodo[] {
  const chain: TenantGlobalCadenaRamaNodo[] = [];
  const seen = new Set<string>();
  let current = String(tenantGlobalId || '').trim();
  while (current && !seen.has(current)) {
    seen.add(current);
    const row = tenants.find((t) => String(t.id || '').trim() === current);
    if (!row) break;
    const parentId = String(row.tenantGlobalAdmin || '').trim();
    chain.unshift({
      id: current,
      label: String(row.label || current),
      corporativo: row.corporativo,
      tenantSuperAdmin: row.tenantSuperAdmin,
      esRaizRama: !parentId,
    });
    current = parentId;
  }
  return chain;
}

export type FiltrarTenantGlobalesAlcanceJwtInput = {
  fuente: TenantGlobalJerarquiaRow[];
  actorTenantSuperAdminId?: string;
  actorTenantGlobalId?: string;
  actorTenantCorporativoId?: string;
  saJerarquiaTieneCorporativoEnCounters: boolean;
  /** TGs vinculados al corporativo del JWT (herencias / contexto). */
  tenantGlobalIdsCorporativo?: string[];
};

/** Opciones TG visibles en crear/actualizar reglas globales según alcance JWT (SA / TG / TC). */
export function filtrarTenantGlobalesAlcanceJwtReglasGlobales(
  input: FiltrarTenantGlobalesAlcanceJwtInput,
): TenantGlobalJerarquiaRow[] {
  const base = input.fuente;
  const sa = String(input.actorTenantSuperAdminId || '').trim();
  const tg = String(input.actorTenantGlobalId || '').trim();
  const tc = String(input.actorTenantCorporativoId || '').trim();

  if (tg && !sa) {
    const allowed = expandTenantGlobalDescendants(base, [tg]);
    return base.filter((t) => allowed.has(String(t.id || '').trim()));
  }

  if (tc && !sa && !tg) {
    const ids = new Set((input.tenantGlobalIdsCorporativo || []).map((x) => String(x).trim()).filter(Boolean));
    if (ids.size) {
      return base.filter((t) => ids.has(String(t.id || '').trim()));
    }
    return base;
  }

  if (sa) {
    let filtered = filtrarTenantGlobalesPorJerarquiaSuperAdmin(
      base,
      sa,
      input.saJerarquiaTieneCorporativoEnCounters,
    );
    if (!filtered.length && base.length) {
      filtered = base.filter((t) => String(t.tenantSuperAdmin || '').trim() === sa);
    }
    if (tg) {
      const allowed = expandTenantGlobalDescendants(filtered, [tg]);
      filtered = filtered.filter((t) => allowed.has(String(t.id || '').trim()));
    }
    return filtered;
  }

  return base;
}

/** TGs visibles para un SA elegido en actualizar reglas (sub-ramas incluidas). */
export function filtrarTenantGlobalesPorSaElegido(
  fuente: TenantGlobalJerarquiaRow[],
  saId: string,
  _saJerarquiaTieneCorporativoEnCounters?: boolean,
): TenantGlobalJerarquiaRow[] {
  const sa = String(saId || '').trim();
  if (!sa || !fuente.length) return [];

  const filtered = filtrarTenantGlobalesPorJerarquiaSuperAdmin(fuente, sa);
  if (filtered.length) return filtered;

  return fuente.filter((t) => String(t.tenantSuperAdmin || '').trim() === sa);
}
