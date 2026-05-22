import type {
  CorpNode,
  JerarquiaResponse,
  TenantGlobalNode,
  TenantSuperTenantSinCorporativoItem,
  TenantUsuario,
} from '@/app/services/tenantUsuariosService';
import { collectJerarquiaUsuariosPool } from '@/app/presentation/utils/jerarquiaUsuariosFlatten';

export type GestionRutasOrganigramaTipo =
  | 'GRUPO'
  | 'SA_LIBRE'
  | 'USUARIO'
  | 'TG'
  | 'CORP';

export type GestionRutasOrganigramaNodo = {
  id: string;
  tipo: GestionRutasOrganigramaTipo;
  titulo: string;
  detalle?: string;
  codigo?: string | null;
  codigoPadre?: string | null;
  usuario?: TenantUsuario;
  children: GestionRutasOrganigramaNodo[];
};

type BuildCtx = {
  pool: Map<string, TenantUsuario>;
  placed: Set<string>;
};

function usuarioNodo(u: TenantUsuario, prefijo: string, ctx: BuildCtx): GestionRutasOrganigramaNodo {
  const id = String(u.iud).trim();
  if (id) ctx.placed.add(id);
  const nombre = [u.perfil?.nombre, u.perfil?.apellido].filter(Boolean).join(' ').trim();
  return {
    id: `${prefijo}-u-${id}`,
    tipo: 'USUARIO',
    titulo: nombre || u.correo || 'Usuario',
    detalle: u.correo ?? undefined,
    usuario: u,
    children: [],
  };
}

function usuarioPrincipalNodo(
  principal: { iud: string; correo: string | null },
  prefijo: string,
  ctx: BuildCtx,
): GestionRutasOrganigramaNodo {
  const id = String(principal.iud).trim();
  const full = ctx.pool.get(id);
  if (full) {
    return usuarioNodo(full, prefijo, ctx);
  }
  if (id) ctx.placed.add(id);
  return {
    id: `${prefijo}-principal-${id}`,
    tipo: 'USUARIO',
    titulo: principal.correo || 'Usuario principal',
    detalle: 'Usuario principal del documento SA (sin ficha completa en respuesta)',
    usuario: {
      iud: id,
      correo: principal.correo ?? '',
      estado: true,
      verificado: false,
      tiempoSesion: null,
      rol: null,
      createdAt: '',
      perfil: null,
    },
    children: [],
  };
}

function saLibreNodo(item: TenantSuperTenantSinCorporativoItem, ctx: BuildCtx): GestionRutasOrganigramaNodo {
  const titulo =
    item.corporativoPerfil?.razon_social
    ?? item.corporativoPerfil?.titulo
    ?? item.codigoJerarquia
    ?? 'SuperAdmin';
  const hijos: GestionRutasOrganigramaNodo[] = (item.subTenantSuperAdmins ?? []).map((s) => saLibreNodo(s, ctx));

  if (item.usuarioPrincipal?.iud) {
    hijos.unshift(usuarioPrincipalNodo(item.usuarioPrincipal, `sa-libre-${item.iud}`, ctx));
  }

  return {
    id: `sa-libre-${item.iud}`,
    tipo: 'SA_LIBRE',
    titulo: String(titulo),
    detalle: item.ramaAsociada.esRaiz ? 'Raíz SA sin corporativo en counter' : 'Sub-rama SA',
    codigo: item.codigoJerarquia ?? null,
    codigoPadre: item.codigoPadre ?? null,
    children: hijos,
  };
}

function isRolSuperAdminBranch(rol: string | null | undefined): boolean {
  const r = String(rol ?? '').toUpperCase();
  return r === 'SUPERADMIN' || r === 'SUPER_ADMIN';
}

/**
 * RegisUsu de la rama SA materializada en el TG (p. ej. Rene · SUPERADMIN).
 * Misma regla que Usuarios Tenant → `usuariosTenantSuperAdmin`.
 */
function usuariosRamaSaParaTg(
  n: TenantGlobalNode,
  jerarquia: JerarquiaResponse,
  ctx: BuildCtx,
): TenantUsuario[] {
  const idsTgGlobal = new Set((n.usuarios ?? []).map((u) => String(u.iud)));
  const idsSaLibre = new Set((jerarquia.superAdmins ?? []).map((u) => String(u.iud)));
  const tieneSaMaterializado = Boolean(n.tenantSuperAdmin?.iud || n.tenantSuperAdmin?.codigoJerarquia);
  if (!tieneSaMaterializado) return n.usuariosTenantSuperAdmin ?? [];

  const out: TenantUsuario[] = [];
  const seen = new Set<string>();

  const push = (u: TenantUsuario) => {
    const id = String(u.iud);
    if (!id || seen.has(id) || idsTgGlobal.has(id) || idsSaLibre.has(id)) return;
    if (!isRolSuperAdminBranch(u.rol)) return;
    seen.add(id);
    out.push(u);
  };

  (n.usuariosTenantSuperAdmin ?? []).forEach(push);
  for (const u of ctx.pool.values()) {
    push(u);
  }

  return out;
}

/** Usuarios con rol tenant global en este TG (ADMINISTRADORA, etc.). */
function usuariosTgGlobalParaTg(n: TenantGlobalNode): TenantUsuario[] {
  const out = [...(n.usuarios ?? [])];
  const seen = new Set(out.map((u) => String(u.iud)));

  for (const u of n.usuariosTenantSuperAdmin ?? []) {
    const id = String(u.iud);
    if (!id || seen.has(id)) continue;
    if (isRolSuperAdminBranch(u.rol)) continue;
    seen.add(id);
    out.push(u);
  }

  return out;
}

function corpNodo(c: CorpNode, ctx: BuildCtx): GestionRutasOrganigramaNodo {
  const tc = c.tenantCorporativo;
  const children: GestionRutasOrganigramaNodo[] = [
    ...(c.usuarios ?? []).map((u) => usuarioNodo(u, `corp-${tc?.iud}`, ctx)),
    ...(c.clientes ?? []).map((u) => usuarioNodo(u, `cliente-${tc?.iud}`, ctx)),
    ...(c.hijos ?? []).map((h) => corpNodo(h, ctx)),
  ];
  return {
    id: `corp-${tc?.iud ?? Math.random()}`,
    tipo: 'CORP',
    titulo: tc?.razon_social ?? tc?.titulo ?? 'Corporativo',
    detalle: tc?.nit_ruc_rtn ? `NIT ${tc.nit_ruc_rtn}` : undefined,
    children,
  };
}

function tgNodo(n: TenantGlobalNode, jerarquia: JerarquiaResponse, ctx: BuildCtx): GestionRutasOrganigramaNodo {
  const tg = n.tenantGlobal;
  const sa = n.tenantSuperAdmin;
  const children: GestionRutasOrganigramaNodo[] = [];
  const tgId = tg?.iud ?? 'tg';

  if (sa?.codigoJerarquia || sa?.iud) {
    children.push({
      id: `tg-sa-meta-${sa.iud ?? tgId}`,
      tipo: 'SA_LIBRE',
      titulo: sa.corporativoPerfil?.razon_social ?? sa.corporativoPerfil?.titulo ?? sa.codigoJerarquia ?? 'SuperAdmin (rama)',
      detalle: sa.saResueltoPorCountersGlobal
        ? 'SA↔TG materializado en tenantJerarquiaCountersGlobal'
        : 'vínculo SA–corporativo–TG en tenantJerarquiaCounter',
      codigo: sa.codigoJerarquia ?? null,
      codigoPadre: sa.codigoPadre ?? null,
      children: [],
    });
  }

  const usuariosRamaSa = usuariosRamaSaParaTg(n, jerarquia, ctx);
  if (usuariosRamaSa.length) {
    children.push({
      id: `tg-ramasa-${tgId}`,
      tipo: 'GRUPO',
      titulo: `RegisUsu · rama SuperAdmin (${usuariosRamaSa.length})`,
      detalle: 'TG sin rol global aquí — incluye SUPERADMIN de la rama SA-0002 (p. ej. Rene Cantillo)',
      children: usuariosRamaSa.map((u) => usuarioNodo(u, `tg-ramasa-u-${tgId}`, ctx)),
    });
  }

  const usuariosTg = usuariosTgGlobalParaTg(n);
  if (usuariosTg.length) {
    children.push({
      id: `tg-global-${tgId}`,
      tipo: 'GRUPO',
      titulo: `Usuarios con rol Tenant Global (${usuariosTg.length})`,
      children: usuariosTg.map((u) => usuarioNodo(u, `tg-global-u-${tgId}`, ctx)),
    });
  }

  children.push(...(n.corporativos ?? []).map((c) => corpNodo(c, ctx)));
  children.push(...(n.subTenantGlobales ?? []).map((sub) => tgNodo(sub, jerarquia, ctx)));

  return {
    id: `tg-${tgId}`,
    tipo: 'TG',
    titulo: tg?.razon_social ?? tg?.titulo ?? 'Tenant global',
    detalle: tg?.codigoJerarquia ? `Código ${tg.codigoJerarquia}` : undefined,
    codigo: tg?.codigoJerarquia ?? null,
    codigoPadre: tg?.codigoPadre ?? null,
    children,
  };
}

function agregarGrupoHuerfanos(raiz: GestionRutasOrganigramaNodo[], ctx: BuildCtx): void {
  const huerfanos = [...ctx.pool.values()].filter((u) => u.iud && !ctx.placed.has(String(u.iud)));
  if (!huerfanos.length) return;

  raiz.push({
    id: 'grupo-huerfanos',
    tipo: 'GRUPO',
    titulo: `Usuarios en alcance no ubicados en rama (${huerfanos.length})`,
    detalle: 'Incluye SUPERADMIN u otros RegisUsu visibles en JWT que no quedaron bajo SA/TG del árbol',
    children: huerfanos.map((u) => usuarioNodo(u, 'huerfano', ctx)),
  });
}

/** Árbol propio de Gestión de Rutas (independiente de Usuarios Tenant). */
export function buildGestionRutasOrganigramaTree(
  jerarquia: JerarquiaResponse | null | undefined,
): GestionRutasOrganigramaNodo[] {
  if (!jerarquia) return [];

  const ctx: BuildCtx = {
    pool: collectJerarquiaUsuariosPool(jerarquia),
    placed: new Set<string>(),
  };

  const raiz: GestionRutasOrganigramaNodo[] = [];
  const ocultarSaLibre = jerarquia.jerarquiaAlcance?.ocultarColumnaSaSinJerarquiaCorporativa === true;

  if (!ocultarSaLibre) {
    const saLibres = jerarquia.tenantSuperTenantsSinCorporativoEnCounter ?? [];
    const saUsuarios = jerarquia.superAdmins ?? [];
    if (saLibres.length || saUsuarios.length) {
      raiz.push({
        id: 'grupo-sa-libre',
        tipo: 'GRUPO',
        titulo: 'SuperAdmin sin corporativo en counter',
        detalle: 'tenantSuperTenant · codigoPadre en emisiones hijas',
        children: [
          ...saLibres.map((t) => saLibreNodo(t, ctx)),
          ...saUsuarios.map((u) => usuarioNodo(u, 'sa-sueltos', ctx)),
        ],
      });
    }
  }

  const rolCorp = jerarquia.usuariosRolCorporativo ?? [];
  if (rolCorp.length) {
    raiz.push({
      id: 'grupo-rol-corp',
      tipo: 'GRUPO',
      titulo: 'Usuarios con rol corporativo',
      children: rolCorp.map((u) => usuarioNodo(u, 'rol-corp', ctx)),
    });
  }

  const tgs = jerarquia.tenantsGlobales ?? [];
  if (tgs.length) {
    raiz.push({
      id: 'grupo-tg',
      tipo: 'GRUPO',
      titulo: 'Tenant global y ramas',
      detalle: 'tenantJerarquiaCounter / tenantJerarquiaCountersGlobal',
      children: tgs.map((tg) => tgNodo(tg, jerarquia, ctx)),
    });
  }

  agregarGrupoHuerfanos(raiz, ctx);

  return raiz;
}

export function filtrarOrganigramaPorTexto(
  nodos: GestionRutasOrganigramaNodo[],
  q: string,
): GestionRutasOrganigramaNodo[] {
  const term = q.trim().toLowerCase();
  if (!term) return nodos;

  const walk = (n: GestionRutasOrganigramaNodo): GestionRutasOrganigramaNodo | null => {
    const selfMatch =
      n.titulo.toLowerCase().includes(term)
      || (n.detalle?.toLowerCase().includes(term) ?? false)
      || (n.codigo?.toLowerCase().includes(term) ?? false)
      || (n.usuario?.correo?.toLowerCase().includes(term) ?? false)
      || (n.usuario?.rol?.toLowerCase().includes(term) ?? false);

    const hijos = n.children.map(walk).filter(Boolean) as GestionRutasOrganigramaNodo[];
    if (selfMatch || hijos.length) {
      return { ...n, children: hijos.length ? hijos : n.children.filter(() => selfMatch) };
    }
    return null;
  };

  return nodos.map(walk).filter(Boolean) as GestionRutasOrganigramaNodo[];
}

/** Cuenta usuarios con iud (incluye principales y huérfanos). */
export function contarUsuariosEnOrganigrama(nodos: GestionRutasOrganigramaNodo[]): number {
  let n = 0;
  const walk = (arr: GestionRutasOrganigramaNodo[]) => {
    for (const node of arr) {
      if (node.tipo === 'USUARIO' && node.usuario?.iud) n++;
      walk(node.children);
    }
  };
  walk(nodos);
  return n;
}

/** Total en pool (mismo universo que el contador del banner). */
export function contarUsuariosPoolJerarquia(jerarquia: JerarquiaResponse | null | undefined): number {
  return collectJerarquiaUsuariosPool(jerarquia).size;
}
