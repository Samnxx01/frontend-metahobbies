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
};
