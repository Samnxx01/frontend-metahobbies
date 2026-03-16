import { apiFetch } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantUsuario {
    iud: string;
    correo: string;
    estado: boolean | string;
    verificado: boolean;
    tiempoSesion: string | null;
    rol: string | null;
    createdAt: string;
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
}

export interface CorpNode {
    tenantCorporativo: TenantCorporativoInfo;
    usuarios: TenantUsuario[];
    clientes: TenantUsuario[];
    hijos: CorpNode[];
}

export interface TenantGlobalNode {
    tenantGlobal: TenantGlobalInfo | null;
    usuarios: TenantUsuario[];
    corporativos: CorpNode[];
}

export interface JerarquiaResponse {
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
    superAdmins: TenantUsuario[];
    tenantsGlobales: TenantGlobalNode[];
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

// ─── Service functions ────────────────────────────────────────────────────────

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

export const createUsuarioSuperAdmin = async (data: CreateUsuarioSuperAdminData): Promise<any> => {
    return apiFetch('/api/registro/usuario/superadmin', {
        method: 'POST',
        body: data,
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
