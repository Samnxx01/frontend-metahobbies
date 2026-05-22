import type {
  CorpNode,
  JerarquiaResponse,
  SuperAdminNode,
  TenantGlobalNode,
  TenantSuperTenantSinCorporativoItem,
  TenantUsuario,
} from '@/app/services/tenantUsuariosService';

/** Fila plana para tablas (Gestión de Rutas, listados admin, etc.). */
export type UsuarioListaJerarquiaRow = {
  iud: string;
  _id: string;
  id: string;
  nombre: string;
  correo: string;
  email: string;
  rol: string;
  estado: boolean | string;
  verificado?: boolean;
  perfil?: TenantUsuario['perfil'];
};

function nombreDesdeUsuario(u: TenantUsuario): string {
  const perf = u.perfil;
  const compuesto = [perf?.nombre, perf?.apellido].filter(Boolean).join(' ').trim();
  return compuesto || '-';
}

/** Pool RegisUsu del mismo alcance que la lista plana (para organigrama Gestión de Rutas). */
export function collectJerarquiaUsuariosPool(
  jerarquia: JerarquiaResponse | null | undefined,
): Map<string, TenantUsuario> {
  const out = new Map<string, TenantUsuario>();
  const add = (u: TenantUsuario | undefined | null) => {
    if (!u?.iud) return;
    const id = String(u.iud).trim();
    if (id) out.set(id, u);
  };

  if (!jerarquia) return out;

  (jerarquia.superAdmins ?? []).forEach(add);
  (jerarquia.usuariosRolCorporativo ?? []).forEach(add);

  const walkTg = (n: TenantGlobalNode) => {
    (n.usuarios ?? []).forEach(add);
    (n.usuariosTenantSuperAdmin ?? []).forEach(add);
    (n.corporativos ?? []).forEach((c) => {
      (c.usuarios ?? []).forEach(add);
      (c.clientes ?? []).forEach(add);
      (c.hijos ?? []).forEach((h) => walkCorp(h));
    });
    (n.subTenantGlobales ?? []).forEach(walkTg);
  };
  const walkCorp = (c: CorpNode) => {
    (c.usuarios ?? []).forEach(add);
    (c.clientes ?? []).forEach(add);
    (c.hijos ?? []).forEach(walkCorp);
  };

  (jerarquia.tenantsGlobales ?? []).forEach(walkTg);
  recorrerSuperAdminTreeUsuarios(jerarquia.superAdminTree, add);

  const walkSaLibre = (items: TenantSuperTenantSinCorporativoItem[] | undefined) => {
    if (!items) return;
    for (const item of items) {
      const pid = item.usuarioPrincipal?.iud;
      if (pid) {
        const id = String(pid).trim();
        if (id && !out.has(id)) {
          out.set(id, {
            iud: id,
            correo: item.usuarioPrincipal?.correo ?? '',
            estado: true,
            verificado: false,
            tiempoSesion: null,
            rol: null,
            createdAt: '',
            perfil: null,
          });
        }
      }
      walkSaLibre(item.subTenantSuperAdmins);
    }
  };
  walkSaLibre(jerarquia.tenantSuperTenantsSinCorporativoEnCounter);

  return out;
}

function agregarUsuario(u: TenantUsuario | undefined | null, out: Map<string, UsuarioListaJerarquiaRow>): void {
  if (!u?.iud) return;
  const id = String(u.iud).trim();
  if (!id || out.has(id)) return;
  out.set(id, {
    iud: id,
    _id: id,
    id,
    nombre: nombreDesdeUsuario(u),
    correo: String(u.correo ?? ''),
    email: String(u.correo ?? ''),
    rol: String(u.rol ?? '-'),
    estado: u.estado ?? true,
    verificado: u.verificado,
    perfil: u.perfil ?? undefined,
  });
}

function recorrerCorporativo(corp: CorpNode, out: Map<string, UsuarioListaJerarquiaRow>): void {
  (corp.usuarios ?? []).forEach((u) => agregarUsuario(u, out));
  (corp.clientes ?? []).forEach((u) => agregarUsuario(u, out));
  (corp.hijos ?? []).forEach((h) => recorrerCorporativo(h, out));
}

function recorrerTenantGlobal(nodo: TenantGlobalNode, out: Map<string, UsuarioListaJerarquiaRow>): void {
  (nodo.usuarios ?? []).forEach((u) => agregarUsuario(u, out));
  (nodo.usuariosTenantSuperAdmin ?? []).forEach((u) => agregarUsuario(u, out));
  (nodo.corporativos ?? []).forEach((c) => recorrerCorporativo(c, out));
  (nodo.subTenantGlobales ?? []).forEach((sub) => recorrerTenantGlobal(sub, out));
}

function recorrerSuperAdminTree(
  nodos: SuperAdminNode[] | undefined,
  out: Map<string, UsuarioListaJerarquiaRow>,
): void {
  if (!Array.isArray(nodos)) return;
  for (const sn of nodos) {
    (sn.usuarios ?? []).forEach((u) => agregarUsuario(u, out));
    (sn.tenantsGlobales ?? []).forEach((tg) => recorrerTenantGlobal(tg, out));
    recorrerSuperAdminTree(sn.subSuperAdmins, out);
  }
}

function recorrerSuperAdminTreeUsuarios(
  nodos: SuperAdminNode[] | undefined,
  add: (u: TenantUsuario) => void,
): void {
  if (!Array.isArray(nodos)) return;
  for (const sn of nodos) {
    (sn.usuarios ?? []).forEach(add);
    (sn.tenantsGlobales ?? []).forEach((tg) => {
      (tg.usuarios ?? []).forEach(add);
      (tg.usuariosTenantSuperAdmin ?? []).forEach(add);
    });
    recorrerSuperAdminTreeUsuarios(sn.subSuperAdmins, add);
  }
}

/** Usuario principal enlazado al doc SA sin emisión SA+corporativo en counter. */
function recorrerSaSinCorporativoEnCounter(
  items: TenantSuperTenantSinCorporativoItem[] | undefined,
  out: Map<string, UsuarioListaJerarquiaRow>,
): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const up = item.usuarioPrincipal;
    if (up?.iud) {
      const id = String(up.iud).trim();
      if (id && !out.has(id)) {
        const correo = String(up.correo ?? '');
        out.set(id, {
          iud: id,
          _id: id,
          id,
          nombre: correo || '-',
          correo,
          email: correo,
          rol: '-',
          estado: true,
        });
      }
    }
    recorrerSaSinCorporativoEnCounter(item.subTenantSuperAdmins, out);
  }
}

/**
 * Lista plana de usuarios visibles según `GET /api/registro/jerarquia/usuarios` (alcance JWT).
 *
 * - tenantSuperAdmin **sin** corporativo en counters → superAdmins + todos los TG/ramas del alcance.
 * - tenantSuperAdmin **con** corporativo → usuarios de la rama materializada (TG + corporativos).
 * - tenantGlobal → su rama y descendientes (`tenantJerarquiaCountersGlobal` / counters).
 */
export function flattenJerarquiaUsuariosParaLista(
  jerarquia: JerarquiaResponse | null | undefined,
): UsuarioListaJerarquiaRow[] {
  if (!jerarquia) return [];

  const out = new Map<string, UsuarioListaJerarquiaRow>();

  (jerarquia.superAdmins ?? []).forEach((u) => agregarUsuario(u, out));
  (jerarquia.usuariosRolCorporativo ?? []).forEach((u) => agregarUsuario(u, out));
  (jerarquia.tenantsGlobales ?? []).forEach((tg) => recorrerTenantGlobal(tg, out));
  recorrerSuperAdminTree(jerarquia.superAdminTree, out);
  recorrerSaSinCorporativoEnCounter(jerarquia.tenantSuperTenantsSinCorporativoEnCounter, out);

  return Array.from(out.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
  );
}

export type JerarquiaUsuariosListaMeta = {
  scope: JerarquiaResponse['scope'];
  total: number;
  vistaDios: boolean;
  /** SA del JWT con fila SA+corporativo en tenantJerarquiaCounter. */
  saConJerarquiaCorporativa: boolean;
  mensajeAlcance: string;
};

/**
 * Lista + metadatos de alcance (misma regla que GET /api/registro/jerarquia/usuarios).
 */
export function buildJerarquiaUsuariosListaParaModal(
  jerarquia: JerarquiaResponse | null | undefined,
): { usuarios: UsuarioListaJerarquiaRow[]; meta: JerarquiaUsuariosListaMeta } {
  const usuarios = flattenJerarquiaUsuariosParaLista(jerarquia);
  const scope = jerarquia?.scope ?? null;
  const vistaDios = jerarquia?.vistaDios === true;
  const saConJerarquiaCorporativa =
    jerarquia?.jerarquiaAlcance?.ocultarColumnaSaSinJerarquiaCorporativa === true;

  let mensajeAlcance = 'Alcance según tu sesión (JWT tenantScope).';
  if (vistaDios) {
    mensajeAlcance = 'Vista DIOS: usuarios de todas las ramas tenant visibles.';
  } else if (scope === 'SUPER_ADMIN') {
    mensajeAlcance = saConJerarquiaCorporativa
      ? 'SuperAdmin con corporativo en tenantJerarquiaCounter: solo usuarios de la rama materializada (tenant global y corporativos).'
      : 'SuperAdmin sin corporativo en counter: usuarios de todas las ramas hijas (tenant global, corporativo y superAdmins de la rama).';
  } else if (scope === 'TENANT_GLOBAL') {
    mensajeAlcance = 'Tenant global: usuarios de tu rama y sub-tenant globales (tenantJerarquiaCountersGlobal).';
  } else if (scope === 'CORPORATIVO') {
    mensajeAlcance = 'Corporativo: usuarios del corporativo y descendientes en tu alcance.';
  }

  if (!usuarios.length) {
    mensajeAlcance = `${mensajeAlcance} No hay usuarios registrados en esta rama.`;
  }

  return {
    usuarios,
    meta: {
      scope,
      total: usuarios.length,
      vistaDios,
      saConJerarquiaCorporativa,
      mensajeAlcance,
    },
  };
}
