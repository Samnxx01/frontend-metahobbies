import { apiFetch } from './api';

// ─── Tipos base ───────────────────────────────────────────────────────────────

export interface Dominio {
  iud?: string;
  _id?: string;
  dominio: string;
  etiquetas: string;
  proovedor?: string;
  estadoDominio: boolean;
}

export interface TenantDisponible {
  iud: string;
  estado: boolean;
  corporativo: {
    iud: string;
    razon_social: string;
    nit_ruc_rtn: string;
    titulo: string;
  } | null;
}

export interface Contenedor {
  iud: string;
  nombre: string;
  slug: string | null;
  nivel: number;
  secuencia: number;
  estado: boolean;
  descripcion: string;
  dominioFrontend: string | null;
  parentContenedorId: string | null;
  rootContenedorId: string | null;
  esRaiz: boolean;
  displayLabel: string;
  pathLabels: string[];
  secuenciaJerarquica: string;
  pathMeta: { id: string; nombre: string; secuencia: number }[];
  corporativo: { _id?: string; iud?: string; razon_social: string; nit_ruc_rtn: string } | null;
  apisDominios: { _id?: string; iud?: string; dominio: string; etiquetas: string; estadoDominio: boolean } | null;
  creadoPor: { nombre_cliente: string; correo: string } | null;
  parentContenedor: { nombre: string; slug: string | null; secuencia: number; nivel: number } | null;
  createdAt?: string;
}

export type MigrationStatus = 'pendiente' | 'en_proceso' | 'completada' | 'fallida';

export interface TenantDbConfig {
  iud: string;
  tenantGlobal: string | { iud?: string; _id?: string };
  corporativo: string | null;
  contenedorId: string | { iud?: string; _id?: string } | null;
  parentTenantDbConfig: string | null;
  rootTenantDbConfig: string | null;
  nivelJerarquico: number;
  secuenciaHijo: number[];
  secuenciaHijoLabel: string | null;
  poolName: string;
  // mongoUri NO viene en respuesta safe — solo en /editable
  mongoUri?: string;
  dbName: string;
  backupReplicaDbName: string | null;
  urlBase: string | null;
  estado: boolean;
  migrationStatus: MigrationStatus;
  migrationCompletadoEl: string | null;
  migrationError: string | null;
  createdAt?: string;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CrearContenedorPayload {
  nombre: string;
  slug?: string | null;
  parentContenedorId?: string | null;
  apisDominios: string;
  dominioFrontend?: string | null;
  descripcion?: string;
}

export interface ActualizarContenedorPayload {
  nombre?: string;
  slug?: string | null;
  apisDominios?: string;
  dominioFrontend?: string | null;
  descripcion?: string;
  estado?: boolean;
}

export interface GuardarConexionPayload {
  tenantGlobalId: string;
  contenedorId: string;
  poolName: string;
  mongoUri: string;
  dbName: string;
  urlBase?: string | null;
  parentTenantDbConfigId?: string | null;
  backupReplicaDbName?: string | null;
  configId?: string | null;
}

// ─── Respuestas ───────────────────────────────────────────────────────────────

interface OkResponse<T> { ok: boolean; data: T; total?: number; msg?: string; }
interface MsgResponse { ok: boolean; msg: string; }

// ─── Contenedores ─────────────────────────────────────────────────────────────

const BASE = '/api/tenant-db';

export const contenedorService = {
  listarTenantsDisponibles: (): Promise<OkResponse<TenantDisponible[]>> =>
    apiFetch(`${BASE}/tenants-disponibles`, { method: 'GET' }),

  listarPorTenant: (tenantGlobalId: string): Promise<OkResponse<Contenedor[]>> =>
    apiFetch(`${BASE}/contenedores/${tenantGlobalId}`, { method: 'GET' }),

  crear: (tenantGlobalId: string, payload: CrearContenedorPayload): Promise<OkResponse<Contenedor>> =>
    apiFetch(`${BASE}/contenedores/${tenantGlobalId}`, { method: 'POST', body: payload }),

  actualizar: (contenedorId: string, payload: ActualizarContenedorPayload): Promise<OkResponse<Contenedor>> =>
    apiFetch(`${BASE}/contenedores/${contenedorId}`, { method: 'PUT', body: payload }),

  desactivar: (contenedorId: string): Promise<MsgResponse> =>
    apiFetch(`${BASE}/contenedores/${contenedorId}`, { method: 'DELETE' }),

  activar: (contenedorId: string): Promise<OkResponse<Contenedor>> =>
    apiFetch(`${BASE}/contenedores/${contenedorId}/activar`, { method: 'POST' }),
};

// ─── DB Config ────────────────────────────────────────────────────────────────

export const dbConfigService = {
  /** Lista todas las configs activas (sin mongoUri). */
  listarActivos: (): Promise<OkResponse<TenantDbConfig[]>> =>
    apiFetch(`${BASE}/config`, { method: 'GET' }),

  /** Config editable de un contenedor/tenant (incluye mongoUri). */
  obtenerEditable: (configId: string): Promise<OkResponse<TenantDbConfig>> =>
    apiFetch(`${BASE}/config/id/${configId}/editable`, { method: 'GET' }),

  /**
   * Crear o actualizar la conexión de un contenedor.
   * El servidor prueba la conexión antes de guardar.
   */
  guardarConexion: (payload: GuardarConexionPayload): Promise<OkResponse<TenantDbConfig>> =>
    apiFetch(`${BASE}/config`, { method: 'POST', body: payload }),

  /** Descubrir bases de datos disponibles en un cluster dado el mongoUri. */
  descubrirBases: (mongoUri: string, tenantGlobalId: string): Promise<{ ok: boolean; bases: string[] }> =>
    apiFetch(`${BASE}/listar-bases`, { method: 'POST', body: { mongoUri, tenantGlobalId } }),

  /** Migrar/re-migrar todos los schemas de master a la BD del tenant. */
  migrarSchemas: (configId: string): Promise<OkResponse<TenantDbConfig>> =>
    apiFetch(`${BASE}/config/id/${configId}/migrar`, { method: 'POST' }),

  desactivar: (configId: string): Promise<MsgResponse> =>
    apiFetch(`${BASE}/config/id/${configId}`, { method: 'DELETE' }),
};

// ─── Dominios ─────────────────────────────────────────────────────────────────

export const listarDominios = (): Promise<{ success: boolean; total: number; data: Dominio[] }> =>
  apiFetch('/api/seguridad/listar/dominios', { method: 'GET' });
