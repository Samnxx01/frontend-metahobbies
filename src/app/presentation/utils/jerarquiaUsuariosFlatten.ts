import type {
  CorpNode,
  JerarquiaResponse,
  JerarquiaUsuarioNivelApiRow,
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
  resumenCounters?: JerarquiaResponse['resumenCounters'];
  jerarquiaSaCounters?: JerarquiaResponse['jerarquiaSaCounters'];
  jerarquiaEvaluacion?: JerarquiaResponse['jerarquiaEvaluacion'];
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
      resumenCounters: jerarquia?.resumenCounters,
      jerarquiaSaCounters: jerarquia?.jerarquiaSaCounters,
      jerarquiaEvaluacion: jerarquia?.jerarquiaEvaluacion,
    },
  };
}

export type NivelJerarquiaTenant = 'SA' | 'TG' | 'TC';

export type UsuarioJerarquiaNivelRow = UsuarioListaJerarquiaRow & {
  nivel: NivelJerarquiaTenant;
  contexto: string;
  corporativoAsociado?: {
    id: string;
    razon_social?: string | null;
    titulo?: string | null;
    nit_ruc_rtn?: string | null;
    label: string;
  } | null;
};

function rowConNivel(
  u: TenantUsuario,
  nivel: NivelJerarquiaTenant,
  contexto: string,
): UsuarioJerarquiaNivelRow | null {
  if (!u?.iud) return null;
  const id = String(u.iud).trim();
  if (!id) return null;
  return {
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
    nivel,
    contexto,
  };
}

function agregarPorNivel(
  map: Map<string, UsuarioJerarquiaNivelRow>,
  u: TenantUsuario | undefined | null,
  nivel: NivelJerarquiaTenant,
  contexto: string,
): void {
  const row = rowConNivel(u, nivel, contexto);
  if (!row || map.has(row.iud)) return;
  map.set(row.iud, row);
}

function recorrerCorporativoPorNivel(
  corp: CorpNode,
  tc: Map<string, UsuarioJerarquiaNivelRow>,
): void {
  const label =
    corp.tenantCorporativo?.razon_social ||
    corp.tenantCorporativo?.titulo ||
    'Tenant corporativo';
  (corp.usuarios ?? []).forEach((u) => agregarPorNivel(tc, u, 'TC', label));
  (corp.clientes ?? []).forEach((u) => agregarPorNivel(tc, u, 'TC', `${label} · cliente`));
  (corp.hijos ?? []).forEach((h) => recorrerCorporativoPorNivel(h, tc));
}

function recorrerTenantGlobalPorNivel(
  nodo: TenantGlobalNode,
  sa: Map<string, UsuarioJerarquiaNivelRow>,
  tg: Map<string, UsuarioJerarquiaNivelRow>,
  tc: Map<string, UsuarioJerarquiaNivelRow>,
): void {
  const tgLabel =
    nodo.tenantGlobal?.razon_social ||
    nodo.tenantGlobal?.titulo ||
    nodo.tenantGlobal?.codigoJerarquia ||
    'Tenant global';
  const saLabel = nodo.tenantSuperAdmin?.corporativoPerfil?.razon_social
    ? `Rama SA · ${nodo.tenantSuperAdmin.corporativoPerfil.razon_social}`
    : `Rama SA · ${tgLabel}`;

  (nodo.usuarios ?? []).forEach((u) => agregarPorNivel(tg, u, 'TG', tgLabel));
  (nodo.usuariosTenantSuperAdmin ?? []).forEach((u) => agregarPorNivel(sa, u, 'SA', saLabel));
  (nodo.corporativos ?? []).forEach((c) => recorrerCorporativoPorNivel(c, tc));
  (nodo.subTenantGlobales ?? []).forEach((sub) => recorrerTenantGlobalPorNivel(sub, sa, tg, tc));
}

function recorrerSuperAdminTreePorNivel(
  nodos: SuperAdminNode[] | undefined,
  sa: Map<string, UsuarioJerarquiaNivelRow>,
  tg: Map<string, UsuarioJerarquiaNivelRow>,
  tc: Map<string, UsuarioJerarquiaNivelRow>,
): void {
  if (!Array.isArray(nodos)) return;
  for (const sn of nodos) {
    const saLabel = sn.superAdmin?.nombre || 'Super Admin';
    (sn.usuarios ?? []).forEach((u) => agregarPorNivel(sa, u, 'SA', saLabel));
    (sn.tenantsGlobales ?? []).forEach((tg) => recorrerTenantGlobalPorNivel(tg, sa, tg, tc));
    recorrerSuperAdminTreePorNivel(sn.subSuperAdmins, sa, tg, tc);
  }
}

function recorrerSaSinCorporativoPorNivel(
  items: TenantSuperTenantSinCorporativoItem[] | undefined,
  sa: Map<string, UsuarioJerarquiaNivelRow>,
): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const label =
      item.corporativoPerfil?.razon_social ||
      item.corporativoPerfil?.titulo ||
      item.codigoJerarquia ||
      'Tenant SuperAdmin';
    const up = item.usuarioPrincipal;
    if (up?.iud) {
      agregarPorNivel(
        sa,
        {
          iud: String(up.iud),
          correo: up.correo ?? '',
          estado: true,
          verificado: false,
          tiempoSesion: null,
          rol: 'SUPER_ADMIN',
          createdAt: '',
          perfil: null,
        },
        'SA',
        label,
      );
    }
    recorrerSaSinCorporativoPorNivel(item.subTenantSuperAdmins, sa);
  }
}

const sortRows = (rows: UsuarioJerarquiaNivelRow[]) =>
  [...rows].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
  );

/** Usuarios del organigrama agrupados por nivel SA / TG / TC (alcance JWT). */
export function buildUsuariosSaTgTcDesdeJerarquia(
  jerarquia: JerarquiaResponse | null | undefined,
): {
  sa: UsuarioJerarquiaNivelRow[];
  tg: UsuarioJerarquiaNivelRow[];
  tc: UsuarioJerarquiaNivelRow[];
  meta: JerarquiaUsuariosListaMeta;
} {
  const normalizarFilaApi = (row: JerarquiaUsuarioNivelApiRow): UsuarioJerarquiaNivelRow => {
    const iud = String(row?.iud || '').trim();
    return {
      iud,
      _id: iud,
      id: iud,
      nombre: String(row?.nombre ?? '-'),
      correo: String(row?.correo ?? ''),
      email: String(row?.correo ?? ''),
      rol: String(row?.rol ?? '-'),
      estado: row?.estado ?? true,
      verificado: row?.verificado,
      perfil: row?.perfil ?? undefined,
      nivel: row?.nivel ?? 'SA',
      contexto: String(row?.contexto ?? '-'),
      corporativoAsociado: row?.corporativoAsociado ?? null,
    };
  };

  if (jerarquia?.usuariosPorNivel) {
    const { meta } = buildJerarquiaUsuariosListaParaModal(jerarquia);
    const saRows = sortRows((jerarquia.usuariosPorNivel.sa ?? []).map(normalizarFilaApi));
    const tgRows = sortRows((jerarquia.usuariosPorNivel.tg ?? []).map(normalizarFilaApi));
    const tcRows = sortRows((jerarquia.usuariosPorNivel.tc ?? []).map(normalizarFilaApi));
    const usuariosUnicos = new Set([...saRows, ...tgRows, ...tcRows].map((u) => u.iud));
    return {
      sa: saRows,
      tg: tgRows,
      tc: tcRows,
      meta: {
        ...meta,
        resumenCounters: jerarquia.resumenCounters ?? {
          sa: saRows.length,
          tg: tgRows.length,
          tc: tcRows.length,
          total: usuariosUnicos.size,
          fuente: 'regis_usu_roles_counters_jwt',
          entidadesEnCounters: undefined,
        },
        jerarquiaEvaluacion: jerarquia.jerarquiaEvaluacion,
      },
    };
  }

  const sa = new Map<string, UsuarioJerarquiaNivelRow>();
  const tg = new Map<string, UsuarioJerarquiaNivelRow>();
  const tc = new Map<string, UsuarioJerarquiaNivelRow>();

  if (jerarquia) {
    (jerarquia.superAdmins ?? []).forEach((u) =>
      agregarPorNivel(sa, u, 'SA', 'Super Admin'),
    );
    (jerarquia.tenantsGlobales ?? []).forEach((n) =>
      recorrerTenantGlobalPorNivel(n, sa, tg, tc),
    );
    recorrerSuperAdminTreePorNivel(jerarquia.superAdminTree, sa, tg, tc);
    recorrerSaSinCorporativoPorNivel(jerarquia.tenantSuperTenantsSinCorporativoEnCounter, sa);
  }

  const saRows = sortRows(Array.from(sa.values()));
  const tgRows = sortRows(Array.from(tg.values()));
  const tcRows = sortRows(Array.from(tc.values()));
  const usuariosUnicos = new Set([...sa.keys(), ...tg.keys(), ...tc.keys()]);

  const { meta } = buildJerarquiaUsuariosListaParaModal(jerarquia);

  return {
    sa: saRows,
    tg: tgRows,
    tc: tcRows,
    meta: {
      ...meta,
      /** Badges del modal: usuarios visibles (no suma de entidades SA+TG+TC en counters). */
      resumenCounters: {
        sa: saRows.length,
        tg: tgRows.length,
        tc: tcRows.length,
        total: usuariosUnicos.size,
        fuente: 'usuarios_jerarquia',
        entidadesEnCounters: jerarquia?.resumenCounters?.entidadesEnCounters,
      },
    },
  };
}
