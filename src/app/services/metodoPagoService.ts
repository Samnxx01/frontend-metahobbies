import { apiFetch } from '@/app/services/api';

export type MedioPagoDian = 'EFECTIVO' | 'TARJETA';

export interface MetodoPagoCatalogo {
  iud?: string;
  _id?: string;
  tenantId?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  /** Código DIAN (Lista 15A) al que mapea este método al facturar electrónicamente. */
  medioPagoDian: MedioPagoDian;
  orden: number;
  estado: boolean;
  esSistema?: boolean;
}

type ApiResponsePayload<T> = { ok?: boolean; data?: T; msg?: string; total?: number };
export type MetodoPagoApiResult<T> = { data: T; msg?: string };

const metodoPagoService = {
  async listarActivos(): Promise<MetodoPagoCatalogo[]> {
    const resp = await apiFetch('/api/inventario/config/metodos-pago', { method: 'GET' });
    return (resp?.data ?? []) as MetodoPagoCatalogo[];
  },

  async listarAdmin(): Promise<MetodoPagoCatalogo[]> {
    const resp = await apiFetch('/api/inventario/config/metodos-pago/admin', { method: 'GET' });
    return (resp?.data ?? []) as MetodoPagoCatalogo[];
  },

  async crear(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
    medioPagoDian?: MedioPagoDian;
    orden?: number;
    estado?: boolean;
  }): Promise<MetodoPagoApiResult<MetodoPagoCatalogo>> {
    const resp = await apiFetch('/api/inventario/config/metodos-pago', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<MetodoPagoCatalogo>;
    return { data: resp.data as MetodoPagoCatalogo, msg: resp.msg };
  },

  async actualizar(
    codigo: string,
    payload: { nombre?: string; descripcion?: string; medioPagoDian?: MedioPagoDian; orden?: number; estado?: boolean }
  ): Promise<MetodoPagoApiResult<MetodoPagoCatalogo>> {
    const resp = await apiFetch(`/api/inventario/config/metodos-pago/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<MetodoPagoCatalogo>;
    return { data: resp.data as MetodoPagoCatalogo, msg: resp.msg };
  },

  async eliminar(codigo: string): Promise<MetodoPagoApiResult<{ codigo: string }>> {
    const resp = await apiFetch(`/api/inventario/config/metodos-pago/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    }) as ApiResponsePayload<{ codigo: string }>;
    return { data: resp.data as { codigo: string }, msg: resp.msg };
  },
};

export default metodoPagoService;
