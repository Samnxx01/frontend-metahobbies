import { apiFetch } from './api';

/** POST `/api/config/global/creacion/superAdmin/tenant/global` — contrato solo tenantSuperAdmin («Crear tenant Administrador del sistema»). */
const CREAR_TENANT_GLOBAL_SUPER_ADMIN = '/api/config/global/creacion/superAdmin/tenant/global';

/**
 * Cuerpo JSON para el flujo exclusivo **tenantSuperAdmin** (sin contrato tenantGlobal en este endpoint).
 * Campos opcionales coinciden con selects del formulario de gobernanza.
 */
export interface CrearTenantGlobalDesdeTenantSuperAdminPayload {
    nvlGeneracionTenant: string;
    tipo_tenant: string;
    apisDominios: string;
    /** Una o varias acciones (IDs); el backend normaliza arrays. */
    accionesUsu: string | string[];
    rolesMabs: string;
    coporativo?: string;
    tenantGlobalRef?: string;
    rolesCorporativos?: string;
}

export interface CrearTenantGlobalDesdeTenantSuperAdminResponse {
    msg?: string;
    data?: unknown;
}

/**
 * Crea vía API superAdmin (JWT con tenantSuperAdmin). Validación de scope en servidor.
 */
export async function crearTenantGlobalDesdeTenantSuperAdmin(
    payload: CrearTenantGlobalDesdeTenantSuperAdminPayload
): Promise<CrearTenantGlobalDesdeTenantSuperAdminResponse> {
    return apiFetch(CREAR_TENANT_GLOBAL_SUPER_ADMIN, {
        method: 'POST',
        body: payload,
    });
}
