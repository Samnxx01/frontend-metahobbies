import { apiFetch } from '@/app/services/api';

/** Código del tipo parametrizado (catálogo `/config/reglas-ventas/tipos`). */
export type TipoReglaVenta = string;

export type ComportamientoTipoReglaVenta =
  | 'LIMITE_CANTIDAD'
  | 'DESCUENTO_PORCENTAJE'
  | 'DESCUENTO_FIJO';

export interface TipoReglaVentaCatalogo {
  iud?: string;
  _id?: string;
  tenantId?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  comportamiento: ComportamientoTipoReglaVenta;
  orden: number;
  estado: boolean;
  esSistema?: boolean;
}

export interface ReglaVenta {
  iud?: string;
  _id?: string;
  tenantId?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoReglaVenta;
  valor: number;
  aplicaEnCarrito?: boolean;
  categoriasAplicacion?: string[];
  orden: number;
  estado: boolean;
  esSistema?: boolean;
}

export interface ReglaVentaPayload {
  codigo?: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoReglaVenta;
  valor: number;
  aplicaEnCarrito?: boolean;
  categoriasAplicacion?: string[];
  orden?: number;
  estado?: boolean;
}

type ApiResponsePayload<T> = { ok?: boolean; data?: T; msg?: string; total?: number };

export type ReglaVentaApiResult<T> = { data: T; msg?: string };

const reglasVentasService = {
  async listarTiposActivos(): Promise<TipoReglaVentaCatalogo[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-ventas/tipos', { method: 'GET' });
    return (resp?.data ?? []) as TipoReglaVentaCatalogo[];
  },

  async listarTiposAdmin(): Promise<TipoReglaVentaCatalogo[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-ventas/tipos/admin', { method: 'GET' });
    return (resp?.data ?? []) as TipoReglaVentaCatalogo[];
  },

  async crearTipo(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
    comportamiento: ComportamientoTipoReglaVenta;
    orden?: number;
    estado?: boolean;
  }): Promise<ReglaVentaApiResult<TipoReglaVentaCatalogo>> {
    const resp = await apiFetch('/api/inventario/config/reglas-ventas/tipos', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<TipoReglaVentaCatalogo>;
    return { data: resp.data as TipoReglaVentaCatalogo, msg: resp.msg };
  },

  async actualizarTipo(
    codigo: string,
    payload: {
      nombre?: string;
      descripcion?: string;
      comportamiento?: ComportamientoTipoReglaVenta;
      orden?: number;
      estado?: boolean;
    },
  ): Promise<ReglaVentaApiResult<TipoReglaVentaCatalogo>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-ventas/tipos/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<TipoReglaVentaCatalogo>;
    return { data: resp.data as TipoReglaVentaCatalogo, msg: resp.msg };
  },

  async eliminarTipo(codigo: string): Promise<ReglaVentaApiResult<{ codigo: string }>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-ventas/tipos/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    }) as ApiResponsePayload<{ codigo: string }>;
    return { data: resp.data as { codigo: string }, msg: resp.msg };
  },

  async listarActivas(): Promise<ReglaVenta[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-ventas', { method: 'GET' });
    return (resp?.data ?? []) as ReglaVenta[];
  },

  async listarAdmin(): Promise<ReglaVenta[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-ventas/admin', { method: 'GET' });
    return (resp?.data ?? []) as ReglaVenta[];
  },

  async crear(payload: ReglaVentaPayload): Promise<ReglaVenta> {
    const resp = await apiFetch('/api/inventario/config/reglas-ventas', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<ReglaVenta>;
    return resp.data as ReglaVenta;
  },

  async actualizar(codigo: string, payload: Partial<ReglaVentaPayload>): Promise<ReglaVenta> {
    const resp = await apiFetch(`/api/inventario/config/reglas-ventas/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<ReglaVenta>;
    return resp.data as ReglaVenta;
  },

  async eliminar(codigo: string): Promise<void> {
    await apiFetch(`/api/inventario/config/reglas-ventas/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    });
  },
};

export default reglasVentasService;

export const etiquetaComportamientoTipoReglaVenta = (
  comportamiento: ComportamientoTipoReglaVenta,
): string => {
  if (comportamiento === 'LIMITE_CANTIDAD') return 'Limite de cantidad';
  if (comportamiento === 'DESCUENTO_PORCENTAJE') return 'Calculo de porcentaje';
  return 'Descuento fijo';
};

export const etiquetaTipoReglaVenta = (
  tipo: TipoReglaVenta,
  tipos: TipoReglaVentaCatalogo[] = [],
): string => tipos.find((item) => item.codigo === tipo)?.nombre ?? tipo;

/** Texto en el catalogo global: el valor se define por producto. */
export const resumenValorReglaVentaCatalogo = (
  regla: Pick<ReglaVenta, 'tipo'>,
  tipos: TipoReglaVentaCatalogo[] = [],
): string => {
  const comportamiento = resolverComportamientoDesdeReglaVenta(regla, tipos);
  if (comportamiento === 'LIMITE_CANTIDAD') return 'Cantidad max. por producto';
  if (comportamiento === 'DESCUENTO_PORCENTAJE') return 'Calculo de porcentaje por producto';
  if (comportamiento === 'DESCUENTO_FIJO') return 'Monto por producto';
  return 'Valor por producto';
};

export const resumenValorReglaVenta = (
  regla: ReglaVenta,
  tipos: TipoReglaVentaCatalogo[] = [],
): string => {
  const comportamiento = tipos.find((item) => item.codigo === regla.tipo)?.comportamiento;
  if (comportamiento === 'LIMITE_CANTIDAD') return `${Number(regla.valor || 0)} uds`;
  if (comportamiento === 'DESCUENTO_PORCENTAJE') return `${Number(regla.valor || 0)}%`;
  if (comportamiento === 'DESCUENTO_FIJO') {
    return `$${Number(regla.valor || 0).toLocaleString('es-CO')}`;
  }
  if (regla.tipo === 'CANTIDAD_MAXIMA') return `${Number(regla.valor || 0)} uds`;
  if (regla.tipo === 'PORCENTAJE') return `${Number(regla.valor || 0)}%`;
  return `$${Number(regla.valor || 0).toLocaleString('es-CO')}`;
};

export const placeholderValorPorComportamiento = (
  comportamiento?: ComportamientoTipoReglaVenta | null,
): string => {
  if (comportamiento === 'LIMITE_CANTIDAD') return 'Ej: 10 unidades';
  if (comportamiento === 'DESCUENTO_PORCENTAJE') return 'Ej: 15 (%)';
  if (comportamiento === 'DESCUENTO_FIJO') return 'Ej: 5000 (COP por unidad)';
  return 'Valor segun tipo';
};

export const resolverComportamientoDesdeReglaVenta = (
  regla: Pick<ReglaVenta, 'tipo'>,
  tipos: TipoReglaVentaCatalogo[] = [],
): ComportamientoTipoReglaVenta | null => {
  const tipoCodigo = String(regla.tipo || '').trim().toUpperCase();
  const catalogo = tipos.find((item) => item.codigo === tipoCodigo);
  if (catalogo?.comportamiento) return catalogo.comportamiento;
  if (tipoCodigo === 'CANTIDAD_MAXIMA') return 'LIMITE_CANTIDAD';
  if (tipoCodigo === 'PORCENTAJE' || tipoCodigo === 'PORCENTAJE_CALCULO') return 'DESCUENTO_PORCENTAJE';
  if (tipoCodigo === 'FIJO') return 'DESCUENTO_FIJO';
  return null;
};

export const reglaVentaPermiteValorEnProducto = (
  comportamiento?: ComportamientoTipoReglaVenta | null,
): boolean =>
  comportamiento === 'LIMITE_CANTIDAD'
  || comportamiento === 'DESCUENTO_PORCENTAJE'
  || comportamiento === 'DESCUENTO_FIJO';

export const etiquetaCampoValorReglaVentaProducto = (
  comportamiento?: ComportamientoTipoReglaVenta | null,
): string => {
  if (comportamiento === 'LIMITE_CANTIDAD') return 'Cantidad max.';
  if (comportamiento === 'DESCUENTO_PORCENTAJE') return 'Calculo de porcentaje';
  if (comportamiento === 'DESCUENTO_FIJO') return 'Descuento fijo (COP)';
  return 'Valor';
};

export const normalizarValorReglaVentaProducto = (
  comportamiento: ComportamientoTipoReglaVenta | null,
  raw: number,
): number | null => {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return null;
  if (comportamiento === 'LIMITE_CANTIDAD') {
    const entero = Math.floor(num);
    return entero >= 1 ? entero : null;
  }
  if (comportamiento === 'DESCUENTO_PORCENTAJE') {
    return Math.min(100, Math.max(0, num));
  }
  if (comportamiento === 'DESCUENTO_FIJO') {
    return Math.max(0, Math.round(num));
  }
  return null;
};
