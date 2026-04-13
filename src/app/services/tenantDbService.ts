import { apiFetch } from './api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SyncColeccion {
  coleccion: string;
  sourceConfigId?: string | { iud?: string; _id?: string; poolName?: string; dbName?: string } | null;
  autoSync: boolean;
  modo: 'full' | 'incremental';
  filtro: Record<string, unknown> | null;
  previewTotalOrigen?: number;
  previewTotalDestino?: number;
  previewPendientes?: number;
  ultimoSyncAt: string | null;
  estado: boolean;
}

export interface TenantDbConfig {
  iud: string;
  tenantGlobal?: string;
  corporativo: string | { iud: string; razon_social?: string };
  contenedorId?: string | { iud?: string; _id?: string; nombre?: string } | null;
  parentTenantDbConfig?: string | { iud?: string; _id?: string; poolName?: string; secuenciaHijoLabel?: string } | null;
  rootTenantDbConfig?: string | { iud?: string; _id?: string; poolName?: string; secuenciaHijoLabel?: string } | null;
  nivelJerarquico?: number;
  secuenciaHijo?: number[];
  secuenciaHijoLabel?: string | null;
  poolName: string;
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

export interface TenantDbConfigEditable extends TenantDbConfig {
  mongoUri: string;
}

export interface GuardarConexionPayload {
  configId?: string;
  corporativoId: string;
  contenedorId: string;
  parentTenantDbConfigId?: string | null;
  poolName: string;
  mongoUri: string;
  dbName: string;
  urlBase?: string | null;
}

export interface ConfigurarSyncPayload {
  sourceConfigId: string;
  coleccion: string;
  autoSync: boolean;
  modo: 'full' | 'incremental';
  filtro?: Record<string, unknown> | null;
}

export interface EjecutarSyncPayload {
  sourceConfigId: string;
  coleccion: string;
  modo?: 'full' | 'incremental';
  filtro?: Record<string, unknown> | null;
  selectedIds?: string[] | null;
}

export interface SyncResult {
  sourceConfigId?: string;
  coleccion: string;
  copiados: number;
  pendientes?: number;
  modo: string;
}

export interface SyncPreview {
  sourceConfigId: string;
  coleccion: string;
  totalOrigen: number;
  totalDestino: number;
  pendientes: number;
  muestraOrigen: Array<Record<string, unknown> & { _id?: string }>;
  muestraDestino: Array<Record<string, unknown> & { _id?: string }>;
  muestraPendientes: Record<string, unknown>[];
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
  tenantGlobal?: string | { iud: string } | null;
  corporativo: { iud: string; razon_social: string; nit_ruc_rtn: string } | null;
  nombre: string;
  slug?: string | null;
  parentContenedor?: { iud: string; nombre: string; secuencia?: number; nivel?: number } | null;
  rootContenedor?: { iud: string; nombre: string; secuencia?: number; nivel?: number } | null;
  parentContenedorId?: string | null;
  rootContenedorId?: string | null;
  nivel?: number;
  esRaiz?: boolean;
  pathLabels?: string[];
  displayLabel?: string;
  secuenciaJerarquica?: string;
  secuencia: number;
  apisDominios: ApiDominio | null;
  dominioFrontend?: string;
  descripcion: string;
  estado: boolean;
  creadoEl: string;
  actualizadoEl: string;
  creadoPor?: { iud: string; nombre_cliente: string; correo: string };
}

export interface CrearContenedorPayload {
  nombre: string;
  apisDominios: string;
  parentContenedorId?: string;
  dominioFrontend?: string;
  descripcion?: string;
}

export interface ActualizarContenedorPayload {
  nombre?: string;
  apisDominios?: string;
  dominioFrontend?: string;
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
  corporativo: { iud: string; razon_social: string; nit_ruc_rtn?: string; titulo?: string } | null;
  estado: boolean;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const tenantDbService = {
  /** Lista todas las configs activas de BD (sin mongoUri) */
  listarActivos: (): Promise<{ ok: boolean; total: number; data: TenantDbConfig[] }> =>
    apiFetch('/api/tenant-db/config', { method: 'GET' }),

  /** Obtiene la config de BD de un corporativo específico */
  obtenerConfig: (corporativoId: string): Promise<{ ok: boolean; data: TenantDbConfig }> =>
    apiFetch(`/api/tenant-db/config/${corporativoId}`, { method: 'GET' }),

  obtenerConfigEditable: (
    configId: string
  ): Promise<{ ok: boolean; data: TenantDbConfigEditable }> =>
    apiFetch(`/api/tenant-db/config/id/${configId}/editable`, { method: 'GET' }),

  /** Guarda/actualiza la URI de BD para un corporativo */
  guardarConexion: (
    payload: GuardarConexionPayload
  ): Promise<{ ok: boolean; msg: string; data: TenantDbConfig }> =>
    apiFetch('/api/tenant-db/config', { method: 'POST', body: payload }),

  /** Actualiza solo la URL parametrizada del tenant */
  actualizarUrlBase: (
    configId: string,
    urlBase?: string | null
  ): Promise<{ ok: boolean; msg: string; data: TenantDbConfig }> =>
    apiFetch(`/api/tenant-db/config/id/${configId}/url-base`, {
      method: 'PUT',
      body: { urlBase: urlBase || null },
    }),

  /** Desactiva la config y cierra la conexión del corporativo */
  desactivar: (configId: string): Promise<{ ok: boolean; msg: string }> =>
    apiFetch(`/api/tenant-db/config/id/${configId}`, { method: 'DELETE' }),

  /** Configura o actualiza una colección para sync */
  configurarSync: (
    configId: string,
    payload: ConfigurarSyncPayload
  ): Promise<{ ok: boolean; msg: string; data: TenantDbConfig }> =>
    apiFetch(`/api/tenant-db/sync/id/${configId}/coleccion`, { method: 'POST', body: payload }),

  /** Ejecuta sincronización manual de una colección */
  ejecutarSync: (
    configId: string,
    payload: EjecutarSyncPayload
  ): Promise<{ ok: boolean; msg: string; data: SyncResult }> =>
    apiFetch(`/api/tenant-db/sync/id/${configId}/ejecutar`, { method: 'POST', body: payload }),

  listarColeccionesSyncDisponibles: (
    configId: string,
    sourceConfigId: string
  ): Promise<{ ok: boolean; total: number; data: string[] }> =>
    apiFetch(`/api/tenant-db/sync/id/${configId}/colecciones-disponibles?sourceConfigId=${encodeURIComponent(sourceConfigId)}`, { method: 'GET' }),

  previewSync: (
    configId: string,
    payload: EjecutarSyncPayload
  ): Promise<{ ok: boolean; data: SyncPreview }> =>
    apiFetch(`/api/tenant-db/sync/id/${configId}/preview`, { method: 'POST', body: payload }),

  /** Elimina una colección del sync y detiene su watcher */
  removerSync: (
    configId: string,
    coleccion: string,
    options?: { dropCollection?: boolean }
  ): Promise<{ ok: boolean; msg: string; data: TenantDbConfig }> =>
    apiFetch(`/api/tenant-db/sync/id/${configId}/coleccion/${encodeURIComponent(coleccion)}?dropCollection=${options?.dropCollection ? 'true' : 'false'}`, {
      method: 'DELETE',
    }),

  /** Lista bases de datos disponibles. Reutiliza pool si corporativoId tiene conexión activa. */
  listarBasesDatos: (
    mongoUri: string,
    corporativoId?: string
  ): Promise<{ ok: boolean; databases: string[]; poolName: string | null; fuentePool: boolean }> =>
    apiFetch('/api/tenant-db/listar-bases', { method: 'POST', body: { mongoUri, corporativoId } }),

  /** Estado del pool de conexiones y watchers activos */
  estadoPool: (): Promise<{ ok: boolean } & PoolEstado> =>
    apiFetch('/api/tenant-db/pool', { method: 'GET' }),

  // ─── CONTENEDOR PARAMETRIZACION ─────────────────────────────────────────────

  /** Lista todos los perfilesCorporativos disponibles para el select Empresa */
  listarTenantDisponibles: (): Promise<{ ok: boolean; total: number; data: TenantDisponible[] }> =>
    apiFetch('/api/tenant-db/tenants-disponibles', { method: 'GET' }),

  /** Obtiene tenantGlobal con sus contenedores parametrizados */
  obtenerTenantConContenedores: (
    tenantGlobalId: string
  ): Promise<{ ok: boolean; data: TenantConContenedores }> =>
    apiFetch(`/api/tenant-db/contenedores/tenant/${tenantGlobalId}/preview`, { method: 'GET' }),

  obtenerCorporativoConContenedores: (
    corporativoId: string
  ): Promise<{ ok: boolean; data: TenantConContenedores }> =>
    apiFetch(`/api/tenant-db/contenedores/corporativo/${corporativoId}/preview`, { method: 'GET' }),

  listarContenedoresVisibles: (): Promise<{ ok: boolean; total: number; data: ContenedorParametrizacion[] }> =>
    apiFetch('/api/tenant-db/contenedores-visibles', { method: 'GET' }),

  /** Crea un nuevo contenedor parametrizado */
  crearContenedor: (
    corporativoId: string,
    payload: CrearContenedorPayload
  ): Promise<{ ok: boolean; msg: string; data: ContenedorParametrizacion }> =>
    apiFetch(`/api/tenant-db/contenedores/corporativo/${corporativoId}`, { method: 'POST', body: payload }),

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
    apiFetch(`/api/tenant-db/contenedores/id/${contenedorId}`, { method: 'GET' }),

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
