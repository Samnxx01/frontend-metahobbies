import { apiFetch } from './api';
import type { DocumentoSoporteTipoConfig } from '@/app/presentation/pages/admin/components/InventarioDocumentoSoporteConfigModal';

export type TipoLimiteRegistros = 'CON_LIMITE' | 'SIN_LIMITE';
export type TipoSecuenciaEmision = string;

export type BillingSecuencialTipoConfig = DocumentoSoporteTipoConfig & {
  tipoLimiteRegistros?: TipoLimiteRegistros;
  limiteAlcanzado?: boolean;
  facturacionSoporteDocumentoId?: string;
  secuencia?: number;
  proximoConsecutivo?: number;
  reset?: {
    siguiente?: number;
    proximoConsecutivo?: number;
  };
  recalculo?: {
    ultimaEmitida?: number;
    secuencia?: number;
    siguiente?: number;
    proximoConsecutivo?: number;
    totalEmitidos?: number;
  };
};

const billingSecuencialService = {
  async listarTiposConfig(): Promise<BillingSecuencialTipoConfig[]> {
    const resp = await apiFetch('/api/billing/facturacion-soporte-documento', { method: 'GET' });
    return (resp?.data ?? []) as BillingSecuencialTipoConfig[];
  },

  async crearTipoConfig(payload: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    prefijo?: string;
    padding?: number;
    tipoSecuencia?: TipoSecuenciaEmision;
    clasificacionEmisionId?: number | string | null;
    tipoLimiteRegistros?: TipoLimiteRegistros;
    maxRegistrosSecuencia?: number | null;
    dominioSecuencia?: 'VENTA' | 'INVENTARIO';
  }): Promise<BillingSecuencialTipoConfig> {
    const resp = await apiFetch('/api/billing/facturacion-soporte-documento', {
      method: 'POST',
      body: payload,
    });
    return resp?.data as BillingSecuencialTipoConfig;
  },

  async actualizarTipoConfig(
    codigo: string,
    payload: Partial<Pick<
      BillingSecuencialTipoConfig,
      | 'codigo'
      | 'nombre'
      | 'descripcion'
      | 'prefijo'
      | 'padding'
      | 'tipoSecuencia'
      | 'clasificacionEmisionId'
      | 'tipoLimiteRegistros'
      | 'maxRegistrosSecuencia'
      | 'dominioSecuencia'
      | 'activo'
    >>,
  ): Promise<BillingSecuencialTipoConfig> {
    const resp = await apiFetch(`/api/billing/facturacion-soporte-documento/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    });
    return resp?.data as BillingSecuencialTipoConfig;
  },

  async recalcularTipoConfig(codigo: string): Promise<BillingSecuencialTipoConfig> {
    const resp = await apiFetch(
      `/api/billing/facturacion-soporte-documento/${encodeURIComponent(codigo)}/recalcular`,
      { method: 'POST' },
    );
    return resp?.data as BillingSecuencialTipoConfig;
  },

  async resetearTipoConfig(
    codigo: string,
    payload?: { prefijo?: string; padding?: number },
  ): Promise<BillingSecuencialTipoConfig> {
    const resp = await apiFetch(
      `/api/billing/facturacion-soporte-documento/${encodeURIComponent(codigo)}/resetear`,
      { method: 'POST', body: payload ?? {} },
    );
    return resp?.data as BillingSecuencialTipoConfig;
  },

  async resetearTodosTiposConfig(): Promise<{
    total: number;
    reseteados: number;
    resultados: Array<{ codigo: string; nombre: string }>;
    errores: Array<{ codigo: string; msg: string }>;
  }> {
    const resp = await apiFetch('/api/billing/facturacion-soporte-documento/resetear-todos', {
      method: 'POST',
      body: { dominioSecuencia: 'VENTA' },
    });
    return resp?.data;
  },

  async recalcularTodosTiposConfig(): Promise<{
    total: number;
    recalculados: number;
    resultados: Array<{ codigo: string; nombre: string }>;
    errores: Array<{ codigo: string; msg: string }>;
  }> {
    const resp = await apiFetch('/api/billing/facturacion-soporte-documento/recalcular-todos', {
      method: 'POST',
      body: { dominioSecuencia: 'VENTA' },
    });
    return resp?.data;
  },
};

export default billingSecuencialService;
