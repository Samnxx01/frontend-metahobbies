import { apiFetch } from './api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SyncColeccion {
  coleccion: string;
  autoSync: boolean;
  modo: 'full' | 'incremental';
  filtro: Record<string, unknown> | null;
  ultimoSyncAt: string | null;
  estado: boolean;
}

export interface TenantDbConfig {
  iud: string;
  tenantGlobal: string | { iud: string; coporativo?: string };
  dbName: string;
  urlBase: string | null;
  estado: boolean;
  migrationStatus: 'pendiente' | 'en_proceso' | 'completada' | 'fallida';
  migrationCompletadoEl: string | null;
  migrationError: string | null;
  coleccionesSync: SyncColeccion[];
  createdAt: string;
  updatedAt: string;
}

export interface GuardarConexionPayload {
  tenantGlobalId: string;
  mongoUri: string;
  dbName: string;
  urlBase?: string | null;
}

export interface ConfigurarSyncPayload {
  coleccion: string;
  autoSync: boolean;
  modo: 'full' | 'incremental';
  filtro?: Record<string, unknown> | null;
}

export interface EjecutarSyncPayload {
  coleccion: string;
  modo?: 'full' | 'incremental';
  filtro?: Record<string, unknown> | null;
}

export interface SyncResult {
  coleccion: string;
  copiados: number;
  modo: string;
}

export interface PoolConexion {
  readyState: 0 | 1 | 2 | 3;
  nombre: string;
}

export interface PoolEstado {
  pool: Record<string, PoolConexion>;
  watchersActivos: string[];
}

export interface ApiDominio {
  iud: string;
  etiquetas: string;
  dominio: string;
  proovedor: string;
  estadoDominio: boolean;
}

export interface ContenedorParametrizacion {
  iud: string;
  tenantGlobal: string;
  corporativo: { iud: string; razon_social: string; nit_ruc_rtn: string } | null;
  nombre: string;
  secuencia: number;
  apisDominios: ApiDominio | null;
  descripcion: string;
  estado: boolean;
  creadoEl: string;
  actualizadoEl: string;
  creadoPor?: { iud: string; nombre_cliente: string; correo: string };
}

export interface CrearContenedorPayload {
  nombre: string;
  apisDominios: string;
  descripcion?: string;
}

export interface ActualizarContenedorPayload {
  nombre?: string;
  apisDominios?: string;
  descripcion?: string;
  estado?: boolean;
}

export interface TenantConContenedores {
  tenantGlobal: { iud: string; corporativo: any };
  contenedores: ContenedorParametrizacion[];
  total: number;
}

export interface TenantDisponible {
  iud: string;
  corporativo: any;
  estado: boolean;
  tenantGlobalAdmin?: string | null;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const tenantDbService = {
  /** Lista todas las configs activas de BD (sin mongoUri) */
  listarActivos: (): Promise<{ ok: boolean; total: number; data: TenantDbConfig[] }> =>
    apiFetch('/api/tenant-db/config', { method: 'GET' }),

  /** Obtiene la config de BD de un tenant específico */
  obtenerConfig: (tenantGlobalId: string): Promise<{ ok: boolean; data: TenantDbConfig }> =>
    apiFetch(`/api/tenant-db/config/${tenantGlobalId}`, { method: 'GET' }),

  /** Guarda/actualiza la URI de BD para un tenant y migra schemas */
  guardarConexion: (
    payload: GuardarConexionPayload
  ): Promise<{ ok: boolean; msg: string; data: TenantDbConfig; migracionFallida?: boolean }> =>
    apiFetch('/api/tenant-db/config', { method: 'POST', body: payload }),

  /** Desactiva la config y cierra la conexión del tenant */
  desactivar: (tenantGlobalId: string): Promise<{ ok: boolean; msg: string }> =>
    apiFetch(`/api/tenant-db/config/${tenantGlobalId}`, { method: 'DELETE' }),

  /** Configura o actualiza una colección para sync */
  configurarSync: (
    tenantGlobalId: string,
    payload: ConfigurarSyncPayload
  ): Promise<{ ok: boolean; msg: string; data: TenantDbConfig }> =>
    apiFetch(`/api/tenant-db/sync/${tenantGlobalId}/coleccion`, { method: 'POST', body: payload }),

  /** Ejecuta sincronización manual de una colección */
  ejecutarSync: (
    tenantGlobalId: string,
    payload: EjecutarSyncPayload
  ): Promise<{ ok: boolean; msg: string; data: SyncResult }> =>
    apiFetch(`/api/tenant-db/sync/${tenantGlobalId}/ejecutar`, { method: 'POST', body: payload }),

  /** Elimina una colección del sync y detiene su watcher */
  removerSync: (
    tenantGlobalId: string,
    coleccion: string
  ): Promise<{ ok: boolean; msg: string; data: TenantDbConfig }> =>
    apiFetch(`/api/tenant-db/sync/${tenantGlobalId}/coleccion/${encodeURIComponent(coleccion)}`, {
      method: 'DELETE',
    }),

  /** Estado del pool de conexiones y watchers activos */
  estadoPool: (): Promise<{ ok: boolean } & PoolEstado> =>
    apiFetch('/api/tenant-db/pool', { method: 'GET' }),

  // ─── CONTENEDOR PARAMETRIZACION ─────────────────────────────────────────────

  /** Lista todos los tenantGlobals disponibles para parametrización */
  listarTenantDisponibles: (): Promise<{ ok: boolean; total: number; data: TenantDisponible[] }> =>
    apiFetch('/api/tenant-db/tenants-disponibles', { method: 'GET' }),

  /** Obtiene tenantGlobal con sus contenedores parametrizados */
  obtenerTenantConContenedores: (
    tenantGlobalId: string
  ): Promise<{ ok: boolean; data: TenantConContenedores }> =>
    apiFetch(`/api/tenant-db/contenedores/tenant/${tenantGlobalId}/preview`, { method: 'GET' }),

  /** Crea un nuevo contenedor parametrizado */
  crearContenedor: (
    tenantGlobalId: string,
    payload: CrearContenedorPayload
  ): Promise<{ ok: boolean; msg: string; data: ContenedorParametrizacion }> =>
    apiFetch(`/api/tenant-db/contenedores/${tenantGlobalId}`, { method: 'POST', body: payload }),

  /** Lista todos los dominios registrados en apisDominios */
  listarApisDominios: (): Promise<{ ok: boolean; total: number; data: ApiDominio[] }> =>
    apiFetch('/api/seguridad/listar/dominios', { method: 'GET' }),

  /** Lista contenedores de un tenantGlobal */
  listarContenedores: (
    tenantGlobalId: string,
    estado?: boolean
  ): Promise<{ ok: boolean; total: number; data: ContenedorParametrizacion[] }> =>
    apiFetch(`/api/tenant-db/contenedores/${tenantGlobalId}${estado !== undefined ? `?estado=${estado}` : ''}`, { method: 'GET' }),

  /** Obtiene un contenedor por ID */
  obtenerContenedor: (contenedorId: string): Promise<{ ok: boolean; data: ContenedorParametrizacion }> =>
    apiFetch(`/api/tenant-db/contenedores/${contenedorId}`, { method: 'GET' }),

  /** Actualiza un contenedor */
  actualizarContenedor: (
    contenedorId: string,
    payload: ActualizarContenedorPayload
  ): Promise<{ ok: boolean; msg: string; data: ContenedorParametrizacion }> =>
    apiFetch(`/api/tenant-db/contenedores/${contenedorId}`, { method: 'PUT', body: payload }),

  /** Desactiva un contenedor */
  desactivarContenedor: (contenedorId: string): Promise<{ ok: boolean; msg: string }> =>
    apiFetch(`/api/tenant-db/contenedores/${contenedorId}`, { method: 'DELETE' }),

  /** Activa un contenedor */
  activarContenedor: (contenedorId: string): Promise<{ ok: boolean; msg: string; data: ContenedorParametrizacion }> =>
    apiFetch(`/api/tenant-db/contenedores/${contenedorId}/activar`, { method: 'POST' }),

  /** Resuelve contenedor por slug (para URL parametrizadas) */
  resolverPorSlug: (
    tenantGlobalId: string,
    slug: string
  ): Promise<{ ok: boolean; data: ContenedorParametrizacion }> =>
    apiFetch(`/api/tenant-db/contenedores/${tenantGlobalId}/slug/${slug}`, { method: 'GET' }),
};
