import { formatSaUsuarioParametrizarLabel, type SaJerarquiaLabelMeta } from './SaJerarquiaUsuariosPanel';

export type DiosReglaUsuarioParametrizable = {
  id: string;
  label: string;
  esPrincipal?: boolean;
};

export type DiosReglaAlcancePayload = {
  tenantSuperAdmin: string;
  usuariosIds?: string[];
};

export type DiosReglaSaMeta = SaJerarquiaLabelMeta & {
  id: string;
  usuarioId?: string | null;
  /** _id generacionglobalnvlrolesconfigs enlazado en tenantsupertenants.nvlGeneracionTenant */
  nvlGeneracionTenantId?: string | null;
  /** Desde generacionglobalnvlrolesconfigs.securityPlatform */
  securityPlatform?: boolean;
  /** apisDominios.dominio del tenant SuperAdmin */
  dominioTenant?: string | null;
  apisDominiosId?: string | null;
  apisDominiosEtiqueta?: string | null;
  usuariosJerarquia?: {
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    correo?: string | null;
  }[];
};

function formatUsuarioLabel(
  nombre?: string | null,
  apellido?: string | null,
  correo?: string | null,
): string {
  const nom = [nombre, apellido].filter(Boolean).join(' ').trim();
  if (nom) return `${nom}${correo ? ` (${correo})` : ''}`;
  return String(correo || '').trim();
}

/** Usuarios parametrizables de un tenant SA (principal + jerarquía, sin duplicados). */
export function getUsuariosParametrizablesSa(meta: DiosReglaSaMeta | null | undefined): DiosReglaUsuarioParametrizable[] {
  if (!meta) return [];
  const out: DiosReglaUsuarioParametrizable[] = [];
  const seen = new Set<string>();

  const push = (id: string, label: string, esPrincipal = false) => {
    const key = String(id || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ id: key, label: label || key, esPrincipal });
  };

  const principalId = String(meta.usuarioId || '').trim();
  if (principalId || meta.usuarioNombre || meta.usuarioCorreo) {
    push(
      principalId || `principal-${meta.id}`,
      formatUsuarioLabel(meta.usuarioNombre, null, meta.usuarioCorreo) || formatSaUsuarioParametrizarLabel(meta),
      true,
    );
  }

  for (const u of meta.usuariosJerarquia || []) {
    const uid = String(u?.id || '').trim();
    if (!uid) continue;
    push(uid, formatUsuarioLabel(u.nombre, u.apellido, u.correo));
  }

  if (!out.length) {
    push(String(meta.id), formatSaUsuarioParametrizarLabel(meta), true);
  }

  return out;
}

export function requiereSelectorUsuariosSa(meta: DiosReglaSaMeta | null | undefined): boolean {
  return getUsuariosParametrizablesSa(meta).length > 1;
}

export function buildDiosReglaAlcancesPayload(
  tenantIds: string[],
  usuariosPorTenant: Record<string, string[]>,
  metasById: Map<string, DiosReglaSaMeta>,
): DiosReglaAlcancePayload[] {
  const alcances: DiosReglaAlcancePayload[] = [];
  for (const saId of tenantIds) {
    const id = String(saId || '').trim();
    if (!id) continue;
    const meta = metasById.get(id);
    const usuarios = getUsuariosParametrizablesSa(meta);
    const seleccionados = (usuariosPorTenant[id] ?? []).map((u) => String(u).trim()).filter(Boolean);
    const usuariosIds =
      usuarios.length > 1
        ? seleccionados.length
          ? seleccionados
          : usuarios.map((u) => u.id)
        : usuarios.length === 1
          ? [usuarios[0].id]
          : seleccionados.length
            ? seleccionados
            : undefined;
    alcances.push({
      tenantSuperAdmin: id,
      ...(usuariosIds?.length ? { usuariosIds } : {}),
    });
  }
  return alcances;
}
