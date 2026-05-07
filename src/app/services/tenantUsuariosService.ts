import { apiFetch, apiFetchPublic } from './api';

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

/** Texto para listas de TenantSuperAdmin: nombre del corporativo (sin correo ni nombre de usuario). */
export function describeTenantSuperAdminOption(sa: TenantSuperAdminOption): {
    primary: string;
    principalLine: string;
} {
    const corpNombre = String(sa.coporativo?.razon_social ?? sa.coporativo?.titulo ?? '').trim();
    const corpFallback = corpNombre || String(sa.codigoJerarquia ?? '').trim() || String(sa.iud);

    const p = sa.usuarioTenantPrincipal;
    if (p) {
        const rolUp = (p.rol ?? '').toUpperCase();
        const rolEt =
            rolUp === 'DIOS'
                ? 'DIOS — corporativo asociado'
                : (p.rol ?? 'Usuario');
        const primary = `${rolEt}: ${corpNombre || corpFallback}`;
        return { primary, principalLine: '' };
    }

    const corpLabel = sa.coporativo?.razon_social ?? sa.coporativo?.titulo ?? '';
    const codigo = sa.codigoJerarquia ?? '';
    const primary = codigo
        ? `${codigo} · ${corpLabel || String(sa.iud)}`
        : (corpLabel || String(sa.iud));
    return {
        primary,
        principalLine: 'Sin contacto DIOS; corporativo asociado según jerarquía',
    };
}

// ─── Service functions ────────────────────────────────────────────────────────

export const getTenantsSuperAdmin = async (
    useAuth = true,
    opts?: { bajoTenantSuperAdminId?: string },
): Promise<{ tenants: TenantSuperAdminOption[] }> => {
    const fetcher = useAuth ? apiFetch : apiFetchPublic;
    const q = opts?.bajoTenantSuperAdminId
        ? `?bajoTenantSuperAdminId=${encodeURIComponent(opts.bajoTenantSuperAdminId)}`
        : '';
    return fetcher(`/api/registro/tenants/superadmin${q}`, { method: 'GET' });
};

/** Lista TenantGlobal para formularios de registro (alcance jerárquico). Sin JWT exige tenantSuperAdminId en query. */
export const getTenantsGlobalRegistro = async (
    useAuth: boolean,
    tenantSuperAdminId?: string | null,
): Promise<{ tenantsGlobales: TenantGlobalRegistroItem[] }> => {
    const fetcher = useAuth ? apiFetch : apiFetchPublic;
    const q = tenantSuperAdminId
        ? `?tenantSuperAdminId=${encodeURIComponent(tenantSuperAdminId)}`
        : '';
    return fetcher(`/api/registro/tenants/global/registro${q}`, { method: 'GET' });
};

export const getJerarquiaUsuarios = async (): Promise<JerarquiaResponse> => {
    return apiFetch('/api/registro/jerarquia/usuarios', { method: 'GET' });
};

export const createUsuarioGlobal = async (data: CreateUsuarioGlobalData): Promise<any> => {
    return apiFetch('/api/registro/usuario/global', {
        method: 'POST',
        body: data,
    });
};

export const createUsuarioCorporativo = async (data: CreateUsuarioCorporativoData): Promise<any> => {
    return apiFetch('/api/registro/usuario/corporativo', {
        method: 'POST',
        body: data,
    });
};

export const createUsuarioSuperAdmin = async (
    data: CreateUsuarioSuperAdminData,
    opts?: { useAuth?: boolean }
): Promise<any> => {
    const useAuth = opts?.useAuth ?? true;
    return apiFetch('/api/registro/usuario/superadmin', {
        method: 'POST',
        body: data,
        useAuth,
        logoutOn401: useAuth,
    });
};

export const sincronizarCanReferir = async (data: SincronizarCanReferirData): Promise<any> => {
    return apiFetch('/api/registro/sincronizar/canReferir', {
        method: 'POST',
        body: data,
    });
};

export const sincronizarCanReferirTodos = async (canReferir: boolean): Promise<any> => {
    return apiFetch('/api/registro/sincronizar/canReferir', {
        method: 'PUT',
        body: { canReferir },
    });
};
