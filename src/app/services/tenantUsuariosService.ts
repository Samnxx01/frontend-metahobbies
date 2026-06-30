import { apiFetch, apiFetchPublic } from './api';
import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantUsuario {
    iud: string;
    correo: string;
    estado: boolean | string;
    verificado: boolean;
    tiempoSesion: string | null;
    rol: string | null;
    createdAt: string;
    canReferir?: boolean;
    perfil?: {
        iud: string;
        nombre: string | null;
        apellido: string | null;
        cc: string | null;
        telefono: string | null;
        direccion: string | null;
        rh: string | null;
        fecha_nacimiento: string | null;
        tenantGlobalId?: string | null;
        cargo?: string | null;
    } | null;
}

export interface TenantCorporativoInfo {
    iud: string;
    razon_social: string | null;
    nit_ruc_rtn: string | null;
    titulo: string | null;
    nvlNombre: string | null;
    nvlGeneracion: number | null;
    parent: string | null;
    profundidad: number;
    estado: boolean | string;
}

export interface TenantGlobalInfo {
    iud: string;
    _id?: string;
    id?: string;
    razon_social: string | null;
    nit_ruc_rtn: string | null;
    titulo: string | null;
    nvlGeneracion: number | null;
    estado: boolean | string;
    codigoJerarquia?: string | null;
    codigoPadre?: string | null;
    secuenciaJerarquia?: number | null;
    // Jerarquía (sub-TenantGlobals)
    parent: string | null;
    profundidad: number;
}

export interface SuperAdminInfo {
    iud: string;
    nombre: string | null;
    estado: boolean | string;
    // Jerarquía (sub-SuperAdmins)
    parent: string | null;
    profundidad: number;
}

export interface UsuarioTenantPrincipalInfo {
    iud: string;
    correo: string | null;
    rol: string | null;
    nombre: string | null;
    apellido: string | null;
    estado?: boolean | null;
    verificado?: boolean | null;
}

export interface TenantSuperAdminOption {
    iud: string;
    codigoJerarquia?: string | null;
    codigoPadre?: string | null;
    secuenciaJerarquia?: number | null;
    estado: boolean | string;
    /** Registro público sin JWT (colección tenantsupertenants). */
    estadoPublico?: boolean;
    coporativo?: {
        razon_social?: string | null;
        nit_ruc_rtn?: string | null;
        titulo?: string | null;
    } | null;
    nvlGeneracionTenant?: {
        nvl?: string | number | null;
        generation_tenant?: string | number | null;
    } | null;
    /** Usuario enlazado al tenant (p.ej. DIOS — campo usuarioId en tenantSuperTenant); la opción se etiqueta por corporativo asociado */
    usuarioTenantPrincipal?: UsuarioTenantPrincipalInfo | null;
}

export interface CorpNode {
    tenantCorporativo: TenantCorporativoInfo;
    usuarios: TenantUsuario[];
    clientes: TenantUsuario[];
    hijos: CorpNode[];
}

/** Rama tenantSuperTenant asociada al TG (preferente `tenantJerarquiaCountersGlobal`, fallback counter plano). */
export interface TenantSuperAdminBranchInfo {
    iud: string;
    codigoJerarquia?: string | null;
    codigoPadre?: string | null;
    secuenciaJerarquia?: number | null;
    estado: boolean | string;
    corporativoPerfil?: {
        razon_social?: string | null;
        nit_ruc_rtn?: string | null;
        titulo?: string | null;
    } | null;
    nvlGeneracion?: string | number | null;
    /** TG padre jerárquico cuando viene de tenantJerarquiaCountersGlobal. */
    tenantGlobalPadreId?: string | null;
    /** true si el SA se resolvió desde colección global materializada. */
    saResueltoPorCountersGlobal?: boolean;
}

export interface TenantGlobalNode {
    tenantGlobal: TenantGlobalInfo | null;
    /** Documento `tenantSuperTenant` alineado al perfil corporativo del TG (emisión en tenantJerarquiaCounter). */
    tenantSuperAdmin?: TenantSuperAdminBranchInfo | null;
    /** RegisUsu con alcance SA en la rama del `tenantSuperAdmin` (mismo criterio que el bloque Super Administradores). */
    usuariosTenantSuperAdmin?: TenantUsuario[];
    usuarios: TenantUsuario[];
    corporativos: CorpNode[];
    // Sub-TenantGlobals (jerarquía recursiva)
    subTenantGlobales: TenantGlobalNode[];
}

export interface SuperAdminNode {
    superAdmin: SuperAdminInfo;
    usuarios: TenantUsuario[];
    // Sub-SuperAdmins (jerarquía recursiva)
    subSuperAdmins: SuperAdminNode[];
    // TenantGlobals que pertenecen a este SuperAdmin
    tenantsGlobales: TenantGlobalNode[];
}

export interface PublicChecks {
    diosRolExists: boolean;
    diosUserExists: boolean;
}

/** tenantSuperTenant (colección `tenantsupertenants`) sin fila en tenantJerarquiaCounter con `corporativo`. */
export interface TenantSuperTenantSinCorporativoItem {
    iud: string;
    codigoJerarquia?: string | null;
    codigoPadre?: string | null;
    secuenciaJerarquia?: number | null;
    estado: boolean | string;
    corporativoPerfil?: {
        razon_social?: string | null;
        nit_ruc_rtn?: string | null;
        titulo?: string | null;
    } | null;
    ramaAsociada: {
        tenantSuperAdminPadreId: string | null;
        codigoJerarquiaPadre: string | null;
        esRaiz: boolean;
        /** Padre existe en BD pero no está en esta lista (p. ej. SA con TG+corporativo en counter). */
        padreFueraDeListaJerarquiaLibre?: boolean;
    };
    usuarioPrincipal?: { iud: string; correo: string | null } | null;
    /** Sub–tenantSuperTenant (`parent` → este `iud`), ordenados por secuencia/código. */
    subTenantSuperAdmins?: TenantSuperTenantSinCorporativoItem[];
}

export interface CorporativoAsociadoJerarquia {
    id: string;
    razon_social?: string | null;
    titulo?: string | null;
    nit_ruc_rtn?: string | null;
    label: string;
}

export interface JerarquiaSaCounterIndice {
    tenantSuperAdminId: string;
    codigoJerarquia?: string | null;
    codigoPadre?: string | null;
    secuenciaJerarquia?: number | null;
    corporativoId?: string | null;
    corporativoAsociado?: CorporativoAsociadoJerarquia | null;
}

export interface JerarquiaUsuarioNivelApiRow {
    iud: string;
    _id?: string;
    id?: string;
    nombre: string;
    correo: string;
    email?: string;
    rol: string;
    estado: boolean | string;
    verificado?: boolean;
    perfil?: TenantUsuario['perfil'];
    nivel: 'SA' | 'TG' | 'TC';
    contexto: string;
    tenantSuperAdminId?: string | null;
    tenantGlobalId?: string | null;
    tenantCorporativoId?: string | null;
    corporativoCounterId?: string | null;
    corporativoAsociado?: CorporativoAsociadoJerarquia | null;
}

export interface JerarquiaEvaluacionUsuarios {
    saIdsEnRama?: string[];
    tgIdsEnRama?: string[];
    corpIdsEnRama?: string[];
    totalRolesEnRama?: number;
    totalCandidatos?: number;
    rechazados?: number;
    saAncla?: string | null;
    jwtScope?: { jwtSa?: string | null; jwtTg?: string | null; jwtTc?: string | null };
}

export interface JerarquiaEntidadesCounters {
    sa: number;
    tg: number;
    tc: number;
    total: number;
    fuente: 'tenantjerarquiacounters';
}

export interface JerarquiaResumenCounters {
    sa: number;
    tg: number;
    tc: number;
    total: number;
    fuente: 'tenantjerarquiacounters' | 'usuarios_jerarquia' | 'regis_usu_roles_counters_jwt';
    /** Conteo de emisiones en counters (puede ser mayor que usuarios listados). */
    entidadesEnCounters?: JerarquiaEntidadesCounters;
}

export interface JerarquiaResponse {
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO' | null;
    /**
     * JWT con tenantSuperAdmin: solo subárbol descendente desde el ancla (sin padres SA ni ramas paralelas).
     */
    jerarquiaAlcance?: {
        tipo: 'SUPER_ADMIN_SOLO_DESCENDIENTES';
        anclaTenantSuperAdminId: string;
        /** true si el SA del JWT tiene jerarquía corporativa en counters: no columna «sin corporativo». */
        ocultarColumnaSaSinJerarquiaCorporativa?: boolean;
    };
    /** Solo rol DIOS: jerarquía completa de todas las ramas tenantSuperAdmin */
    vistaDios?: boolean;
    /** Docs SA en alcance JWT sin emisión SA+corporativo en counters (rama “libre”). */
    tenantSuperTenantsSinCorporativoEnCounter?: TenantSuperTenantSinCorporativoItem[];
    superAdmins: TenantUsuario[];
    /** Usuarios con rolesCorporativos asignados (rolCorporativoId) en el alcance del árbol */
    usuariosRolCorporativo?: TenantUsuario[];
    tenantsGlobales: TenantGlobalNode[];
    superAdminTree?: SuperAdminNode[];
    publicChecks?: PublicChecks;
    /** Índice SA materializado en tenantjerarquiacounters (alcance JWT). */
    jerarquiaSaCounters?: JerarquiaSaCounterIndice[];
    /** Conteo usuarios vs emisiones counters. */
    resumenCounters?: JerarquiaResumenCounters;
    /** Usuarios filtrados: RegisUsu + roles + tenantSuperAdmin + counters (scope JWT). */
    usuariosPorNivel?: {
        sa: JerarquiaUsuarioNivelApiRow[];
        tg: JerarquiaUsuarioNivelApiRow[];
        tc: JerarquiaUsuarioNivelApiRow[];
    };
    jerarquiaEvaluacion?: JerarquiaEvaluacionUsuarios;
}

export interface TenantGlobalRegistroItem {
    iud: string;
    estado?: boolean | string;
    codigoJerarquia?: string | null;
    codigoPadre?: string | null;
    tenantSuperAdmin?: unknown;
    coporativo?: {
        razon_social?: string | null;
        titulo?: string | null;
        nit_ruc_rtn?: string | null;
    } | null;
}

export interface CreateUsuarioGlobalData {
    tenantGlobalId?: string;
    correo: string;
    password: string;
    nombre: string;
    apellido: string;
    cc: string;
    telefono: string;
    direccion: string;
    rh: string;
    fecha_nacimiento: string;
    canReferir?: boolean;
}

export interface CreateUsuarioSuperAdminData {
    tenantSuperAdminId?: string;
    correo: string;
    password: string;
    nombre: string;
    apellido: string;
    cc: string;
    telefono: string;
    direccion: string;
    rh: string;
    fecha_nacimiento: string;
    canReferir?: boolean;
}

export interface SincronizarCanReferirData {
    tenantId?: string;
    tenantGlobalId?: string;
    tenantCorporativoId?: string;
    canReferir: boolean;
}

// ─── Selectores / etiquetas jerárquicos ───────────────────────────────────────

/** Texto para listas de TenantSuperAdmin: código jerárquico + corporativo / contacto principal. */
export function describeTenantSuperAdminOption(
    sa: TenantSuperAdminOption,
    options?: {
        ocultarRamaJerarquia?: boolean;
        ocultarUsuarioPrincipal?: boolean;
    },
): {
    primary: string;
    principalLine: string;
} {
    const codigo = String(sa.codigoJerarquia ?? '').trim();
    const padre = String(sa.codigoPadre ?? '').trim();
    const corpNombre = String(sa.coporativo?.razon_social ?? sa.coporativo?.titulo ?? '').trim();

    const jerarquiaLabel = codigo
        ? (options?.ocultarRamaJerarquia
            ? codigo
            : (padre ? `${codigo} (rama de ${padre})` : `${codigo} (raíz)`))
        : '';

    const p = sa.usuarioTenantPrincipal;
    if (p) {
        const rolUp = (p.rol ?? '').toUpperCase();
        const rolEt = rolUp === 'DIOS' ? 'DIOS' : (p.rol ?? 'Usuario');
        const nombre = [p.nombre, p.apellido].filter(Boolean).join(' ').trim();
        const primary = jerarquiaLabel
            ? `${jerarquiaLabel}${corpNombre ? ` · ${corpNombre}` : ''}`
            : `${rolEt}: ${corpNombre || codigo || String(sa.iud)}`;
        const principalLine = options?.ocultarUsuarioPrincipal
            ? ''
            : (nombre
                ? `${rolEt}: ${nombre}${p.correo ? ` (${p.correo})` : ''}`
                : (p.correo ?? ''));
        return { primary, principalLine };
    }

    const primary = jerarquiaLabel
        ? (corpNombre ? `${jerarquiaLabel} · ${corpNombre}` : jerarquiaLabel)
        : (corpNombre || codigo || String(sa.iud));
    return {
        primary,
        principalLine: corpNombre ? '' : 'Sin corporativo asociado en perfil del tenant',
    };
}

export function sortTenantsSuperAdminOptions(
    tenants: TenantSuperAdminOption[],
): TenantSuperAdminOption[] {
    return [...tenants].sort((a, b) => {
        const sa = a.secuenciaJerarquia ?? 0;
        const sb = b.secuenciaJerarquia ?? 0;
        if (sa !== sb) return Number(sa) - Number(sb);
        return String(a.codigoJerarquia ?? '').localeCompare(String(b.codigoJerarquia ?? ''));
    });
}

/** Solo `auth.tenantScope.tenantSuperAdminId` del JWT (no fallback a rol.tenantSuperAdmin). */
export function resolverTenantSuperAdminIdDesdeJwtScope(
    token: string | null | undefined,
    user?: { auth?: { tenantScope?: { tenantSuperAdminId?: string } } } | null,
): string {
    const fromUser = String(user?.auth?.tenantScope?.tenantSuperAdminId || '').trim();
    if (fromUser) return fromUser;
    if (!token) return '';

    try {
        const [, payloadBase64] = token.split('.');
        if (!payloadBase64) return '';
        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
        const payload = JSON.parse(globalThis.atob(padded));
        return String(
            payload?.auth?.tenantScope?.tenantSuperAdminId
            || payload?.tenantScope?.tenantSuperAdminId
            || '',
        ).trim();
    } catch {
        return '';
    }
}

/**
 * Opciones visibles al crear SuperAdmin.
 * - Sin JWT: solo tenants con estadoPublico true (lista del API, sin filtros de rama JWT).
 * - Con JWT: confía en la lista del API (ancla + descendientes del scope).
 */
export function esTenantSuperAdminRegistroPublico(tenant: TenantSuperAdminOption): boolean {
    return tenant.estadoPublico === true;
}

export function filtrarTenantsSuperAdminDestinoRegistro(
    tenants: TenantSuperAdminOption[],
    opts: { token?: string | null; tenantScopeSaId?: string | null } = {},
): TenantSuperAdminOption[] {
    if (!tenants.length) return tenants;

    if (!opts.token) {
        return tenants.filter(esTenantSuperAdminRegistroPublico);
    }

    const scopeId = normalizePublicIdForApi(opts.tenantScopeSaId);
    if (scopeId) {
        return tenants;
    }

    const ramas = tenants.filter((t) => Boolean(String(t.codigoPadre ?? '').trim()));
    if (ramas.length > 0 && tenants.length > ramas.length) {
        return ramas;
    }

    return tenants;
}

// ─── Service functions ────────────────────────────────────────────────────────

const normalizeTenantGlobalInfo = (tg: TenantGlobalInfo | null): TenantGlobalInfo | null => {
    if (!tg) return null;
    const iud = resolveEntityPublicId(tg);
    return iud ? { ...tg, iud } : tg;
};

const normalizeTenantGlobalNode = (node: TenantGlobalNode): TenantGlobalNode => ({
    ...node,
    tenantGlobal: normalizeTenantGlobalInfo(node.tenantGlobal),
    subTenantGlobales: (node.subTenantGlobales || []).map(normalizeTenantGlobalNode),
});

const normalizeJerarquiaResponse = (res: JerarquiaResponse): JerarquiaResponse => ({
    ...res,
    tenantsGlobales: (res.tenantsGlobales || []).map(normalizeTenantGlobalNode),
    superAdminTree: (res.superAdminTree || []).map((saNode) => ({
        ...saNode,
        tenantsGlobales: (saNode.tenantsGlobales || []).map(normalizeTenantGlobalNode),
    })),
});

export const getTenantsSuperAdmin = async (
    useAuth = true,
    opts?: { bajoTenantSuperAdminId?: string },
): Promise<{ tenants: TenantSuperAdminOption[] }> => {
    const fetcher = useAuth ? apiFetch : apiFetchPublic;
    const ancla = normalizePublicIdForApi(opts?.bajoTenantSuperAdminId);
    const q = ancla
        ? `?bajoTenantSuperAdminId=${encodeURIComponent(ancla)}`
        : '';
    const res = await fetcher(`/api/registro/tenants/superadmin${q}`, { method: 'GET' });
    const tenants = Array.isArray(res?.tenants) ? res.tenants : [];
    return { tenants: sortTenantsSuperAdminOptions(tenants) };
};

/** Lista TenantGlobal para formularios de registro (alcance jerárquico). Sin JWT exige tenantSuperAdminId en query. */
export const getTenantsGlobalRegistro = async (
    useAuth: boolean,
    tenantSuperAdminId?: string | null,
): Promise<{ tenantsGlobales: TenantGlobalRegistroItem[] }> => {
    const fetcher = useAuth ? apiFetch : apiFetchPublic;
    const ancla = normalizePublicIdForApi(tenantSuperAdminId);
    const q = ancla
        ? `?tenantSuperAdminId=${encodeURIComponent(ancla)}`
        : '';
    return fetcher(`/api/registro/tenants/global/registro${q}`, { method: 'GET' });
};

export const getJerarquiaUsuarios = async (
    opts?: { useAuth?: boolean },
): Promise<JerarquiaResponse> => {
    const fetcher = opts?.useAuth === false ? apiFetchPublic : apiFetch;
    const res = await fetcher('/api/registro/jerarquia/usuarios', { method: 'GET' });
    return normalizeJerarquiaResponse(res as JerarquiaResponse);
};

export const createUsuarioGlobal = async (data: CreateUsuarioGlobalData): Promise<any> => {
    const body = { ...data };
    if (body.tenantGlobalId) body.tenantGlobalId = normalizePublicIdForApi(body.tenantGlobalId);
    return apiFetch('/api/registro/usuario/global', {
        method: 'POST',
        body,
    });
};

export const createUsuarioCorporativo = async (data: CreateUsuarioCorporativoData): Promise<any> => {
    const body = { ...data };
    if (body.tenantCorporativoId) {
        body.tenantCorporativoId = normalizePublicIdForApi(body.tenantCorporativoId);
    }
    return apiFetch('/api/registro/usuario/corporativo', {
        method: 'POST',
        body,
    });
};

export const createUsuarioSuperAdmin = async (
    data: CreateUsuarioSuperAdminData,
    opts?: { useAuth?: boolean }
): Promise<any> => {
    const useAuth = opts?.useAuth ?? true;
    const body = { ...data };
    if (body.tenantSuperAdminId) {
        body.tenantSuperAdminId = normalizePublicIdForApi(body.tenantSuperAdminId);
    }
    return apiFetch('/api/registro/usuario/superadmin', {
        method: 'POST',
        body,
        useAuth,
        logoutOn401: useAuth,
    });
};

export const sincronizarCanReferir = async (data: SincronizarCanReferirData): Promise<any> => {
    const body: SincronizarCanReferirData = { ...data, canReferir: data.canReferir };
    if (body.tenantId) body.tenantId = normalizePublicIdForApi(body.tenantId);
    if (body.tenantGlobalId) body.tenantGlobalId = normalizePublicIdForApi(body.tenantGlobalId);
    if (body.tenantCorporativoId) {
        body.tenantCorporativoId = normalizePublicIdForApi(body.tenantCorporativoId);
    }
    return apiFetch('/api/registro/sincronizar/canReferir', {
        method: 'POST',
        body,
    });
};

export const sincronizarCanReferirTodos = async (canReferir: boolean): Promise<any> => {
    return apiFetch('/api/registro/sincronizar/canReferir', {
        method: 'PUT',
        body: { canReferir },
    });
};
