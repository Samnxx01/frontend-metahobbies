import { apiFetch } from '@/app/services/api';

/** Código parametrizado de la Lista 15A DIAN (ej. 10, 48, 49). */
export type MedioPagoDian = string;
export type ModoBancosMetodoPago = 'NINGUNO' | 'UNICO' | 'MULTIPLE';

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
  esPse?: boolean;
  bancosPse?: string[];
  modoBancos?: ModoBancosMetodoPago;
  bancosAsociados?: string[];
  metodoPagoId?: string | { iud?: string; _id?: string; codigo?: string; nombreMetodoPago?: string };
}
export interface MetodoPagoPadre {
  iud?: string;
  _id?: string;
  codigo: string;
  nombreMetodoPago: string;
  catalogoMetodoCodigo?: string;
  pasarelaPago?: string;
  descripcion?: string;
  estado: boolean;
}

type ApiResponsePayload<T> = { ok?: boolean; data?: T; msg?: string; total?: number };
export type MetodoPagoApiResult<T> = { data: T; msg?: string };

const metodoPagoService = {
  async listarActivos(): Promise<MetodoPagoCatalogo[]> {
    const resp = await apiFetch('/api/inventario/config/metodos-pago', { method: 'GET' });
    return (resp?.data ?? []) as MetodoPagoCatalogo[];
  },

  async listarAdmin(metodoPagoId?: string): Promise<MetodoPagoCatalogo[]> {
    const query = metodoPagoId ? `?metodoPagoId=${encodeURIComponent(metodoPagoId)}` : '';
    const resp = await apiFetch(`/api/inventario/config/metodos-pago/admin${query}`, { method: 'GET' });
    return (resp?.data ?? []) as MetodoPagoCatalogo[];
  },

  async crear(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
    medioPagoDian?: MedioPagoDian;
    metodoPagoId?: string;
    orden?: number;
    estado?: boolean;
    esPse?: boolean;
    bancosPse?: string[];
    modoBancos?: ModoBancosMetodoPago;
    bancosAsociados?: string[];
  }): Promise<MetodoPagoApiResult<MetodoPagoCatalogo>> {
    const resp = await apiFetch('/api/inventario/config/metodos-pago', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<MetodoPagoCatalogo>;
    return { data: resp.data as MetodoPagoCatalogo, msg: resp.msg };
  },

  async listarPadres(): Promise<MetodoPagoPadre[]> {
    const resp = await apiFetch('/api/inventario/config/metodos-pago/padres', { method: 'GET' });
    return (resp?.data ?? []) as MetodoPagoPadre[];
  },

  async crearPadre(payload: {
    codigo?: string;
    nombreMetodoPago: string;
    catalogoMetodoCodigo: string;
    pasarelaPago: string;
    descripcion?: string;
    estado?: boolean;
  }): Promise<MetodoPagoApiResult<MetodoPagoPadre>> {
    const resp = await apiFetch('/api/inventario/config/metodos-pago/padres', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<MetodoPagoPadre>;
    return { data: resp.data as MetodoPagoPadre, msg: resp.msg };
  },

  async actualizarPadre(
    id: string,
    payload: { nombreMetodoPago?: string; descripcion?: string; estado?: boolean }
  ): Promise<MetodoPagoApiResult<MetodoPagoPadre>> {
    const resp = await apiFetch(`/api/inventario/config/metodos-pago/padres/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<MetodoPagoPadre>;
    return { data: resp.data as MetodoPagoPadre, msg: resp.msg };
  },

  async actualizar(
    codigo: string,
    payload: { nombre?: string; descripcion?: string; medioPagoDian?: MedioPagoDian; orden?: number; estado?: boolean; esPse?: boolean; bancosPse?: string[]; modoBancos?: ModoBancosMetodoPago; bancosAsociados?: string[] }
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
