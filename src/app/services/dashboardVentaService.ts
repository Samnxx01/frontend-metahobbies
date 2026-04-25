import { apiFetch } from './api';
import productosService, { type BackendProducto } from './productosService';

export type PipelineBLevel = {
  gen: number;
  percent: number;
};

export type PipelineBOriginConfig = {
  _id?: string;
  iud?: string;
  originType: string;
  originId: string;
  estado?: boolean;
  levels: PipelineBLevel[];
  createdAt?: string;
  updatedAt?: string;
};

export type PipelineBOriginPayload = {
  originType: string;
  originId: string;
  levels: PipelineBLevel[];
  estado?: boolean;
};

const dashboardVentaService = {
  async listarProductos(): Promise<BackendProducto[]> {
    return productosService.listarProductosAdmin({ estadoCatalogo: 'ACTIVO' });
  },

  async listarConfiguraciones(): Promise<PipelineBOriginConfig[]> {
    const response = await apiFetch('/api/comisiones-origen/', { method: 'GET' });
    return (response?.data ?? []) as PipelineBOriginConfig[];
  },

  async crearConfiguracion(payload: PipelineBOriginPayload): Promise<PipelineBOriginConfig> {
    const response = await apiFetch('/api/comisiones-origen/', {
      method: 'POST',
      body: payload,
    });
    return response?.data as PipelineBOriginConfig;
  },

  async actualizarConfiguracion(id: string, payload: Partial<PipelineBOriginPayload>): Promise<PipelineBOriginConfig> {
    const response = await apiFetch(`/api/comisiones-origen/${id}`, {
      method: 'PUT',
      body: payload,
    });
    return response?.data as PipelineBOriginConfig;
  },
};

export default dashboardVentaService;
