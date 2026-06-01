import { apiFetch } from '@/app/services/api';

/** Código del tipo parametrizado (catálogo `/config/reglas-contables/tipos`). */
export type TipoReglaContable = string;

export interface TipoReglaContableCatalogo {
  iud?: string;
  _id?: string;
  tenantId?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  estado: boolean;
  esSistema?: boolean;
}

export interface TarifaReglaContable {
  iud?: string;
  _id?: string;
  tenantId?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  valor: number;
  tipoReglaCodigo?: string;
  orden: number;
  estado: boolean;
  esSistema?: boolean;
}

export type BaseCalculoRegla = 'COSTO' | 'SUBTOTAL_COMERCIAL' | 'IMPUESTO' | 'PRECIO_FINAL';

/** Código del ámbito parametrizado (catálogo `/config/reglas-contables/ambitos`). */
export type AplicaEnRegla = string;

export interface AmbitoReglaContable {
  iud?: string;
  _id?: string;
  tenantId?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  estado: boolean;
  esSistema?: boolean;
}

export interface ReglaContable {
  iud?: string;
  _id?: string;
  tenantId?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoReglaContable;
  tarifa: number;
  montoFijo?: number;
  baseCalculo: BaseCalculoRegla;
  aplicaEn: AplicaEnRegla;
  aplicaEnCarrito?: boolean;
  categoriasAplicacion?: string[];
  orden: number;
  codigoDian?: string;
  estado: boolean;
  esSistema?: boolean;
}

type ApiResponsePayload<T> = { ok?: boolean; data?: T; msg?: string; total?: number };

export type ReglaContableApiResult<T> = { data: T; msg?: string };

const reglasContablesService = {
  async listarAmbitosActivos(): Promise<AmbitoReglaContable[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/ambitos', { method: 'GET' });
    return (resp?.data ?? []) as AmbitoReglaContable[];
  },

  async listarAmbitosAdmin(): Promise<AmbitoReglaContable[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/ambitos/admin', { method: 'GET' });
    return (resp?.data ?? []) as AmbitoReglaContable[];
  },

  async crearAmbito(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
    orden?: number;
    estado?: boolean;
  }): Promise<ReglaContableApiResult<AmbitoReglaContable>> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/ambitos', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<AmbitoReglaContable>;
    return { data: resp.data as AmbitoReglaContable, msg: resp.msg };
  },

  async actualizarAmbito(
    codigo: string,
    payload: {
      nombre?: string;
      descripcion?: string;
      orden?: number;
      estado?: boolean;
    }
  ): Promise<ReglaContableApiResult<AmbitoReglaContable>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/ambitos/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<AmbitoReglaContable>;
    return { data: resp.data as AmbitoReglaContable, msg: resp.msg };
  },

  async eliminarAmbito(codigo: string): Promise<ReglaContableApiResult<{ codigo: string }>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/ambitos/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    }) as ApiResponsePayload<{ codigo: string }>;
    return { data: resp.data as { codigo: string }, msg: resp.msg };
  },

  async listarTiposActivos(): Promise<TipoReglaContableCatalogo[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/tipos', { method: 'GET' });
    return (resp?.data ?? []) as TipoReglaContableCatalogo[];
  },

  async listarTiposAdmin(): Promise<TipoReglaContableCatalogo[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/tipos/admin', { method: 'GET' });
    return (resp?.data ?? []) as TipoReglaContableCatalogo[];
  },

  async crearTipo(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
    orden?: number;
    estado?: boolean;
  }): Promise<ReglaContableApiResult<TipoReglaContableCatalogo>> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/tipos', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<TipoReglaContableCatalogo>;
    return { data: resp.data as TipoReglaContableCatalogo, msg: resp.msg };
  },

  async actualizarTipo(
    codigo: string,
    payload: { nombre?: string; descripcion?: string; orden?: number; estado?: boolean }
  ): Promise<ReglaContableApiResult<TipoReglaContableCatalogo>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/tipos/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<TipoReglaContableCatalogo>;
    return { data: resp.data as TipoReglaContableCatalogo, msg: resp.msg };
  },

  async eliminarTipo(codigo: string): Promise<ReglaContableApiResult<{ codigo: string }>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/tipos/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    }) as ApiResponsePayload<{ codigo: string }>;
    return { data: resp.data as { codigo: string }, msg: resp.msg };
  },

  async listarTarifasActivas(tipoReglaCodigo?: string): Promise<TarifaReglaContable[]> {
    const q = tipoReglaCodigo ? `?tipoReglaCodigo=${encodeURIComponent(tipoReglaCodigo)}` : '';
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/tarifas${q}`, { method: 'GET' });
    return (resp?.data ?? []) as TarifaReglaContable[];
  },

  async listarTarifasAdmin(): Promise<TarifaReglaContable[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/tarifas/admin', { method: 'GET' });
    return (resp?.data ?? []) as TarifaReglaContable[];
  },

  async crearTarifa(payload: {
    codigo?: string;
    nombre: string;
    valor: number;
    descripcion?: string;
    tipoReglaCodigo?: string;
    orden?: number;
    estado?: boolean;
  }): Promise<ReglaContableApiResult<TarifaReglaContable>> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/tarifas', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<TarifaReglaContable>;
    return { data: resp.data as TarifaReglaContable, msg: resp.msg };
  },

  async actualizarTarifa(
    codigo: string,
    payload: {
      nombre?: string;
      valor?: number;
      descripcion?: string;
      tipoReglaCodigo?: string;
      orden?: number;
      estado?: boolean;
    }
  ): Promise<ReglaContableApiResult<TarifaReglaContable>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/tarifas/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<TarifaReglaContable>;
    return { data: resp.data as TarifaReglaContable, msg: resp.msg };
  },

  async eliminarTarifa(codigo: string): Promise<ReglaContableApiResult<{ codigo: string }>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/tarifas/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    }) as ApiResponsePayload<{ codigo: string }>;
    return { data: resp.data as { codigo: string }, msg: resp.msg };
  },

  async listarActivas(): Promise<ReglaContable[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables', { method: 'GET' });
    return (resp?.data ?? []) as ReglaContable[];
  },

  async listarAdmin(): Promise<ReglaContable[]> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/admin', { method: 'GET' });
    return (resp?.data ?? []) as ReglaContable[];
  },

  async crear(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
    tipo: TipoReglaContable;
    tarifa?: number;
    montoFijo?: number;
    baseCalculo?: BaseCalculoRegla;
    aplicaEn?: AplicaEnRegla;
    aplicaEnCarrito?: boolean;
    categoriasAplicacion?: string[];
    orden?: number;
    codigoDian?: string;
    estado?: boolean;
  }): Promise<ReglaContableApiResult<ReglaContable>> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<ReglaContable>;
    return { data: resp.data as ReglaContable, msg: resp.msg };
  },

  async actualizar(
    codigo: string,
    payload: {
      nombre?: string;
      descripcion?: string;
      tipo?: TipoReglaContable;
      tarifa?: number;
      montoFijo?: number;
      baseCalculo?: BaseCalculoRegla;
      aplicaEn?: AplicaEnRegla;
      aplicaEnCarrito?: boolean;
      categoriasAplicacion?: string[];
      orden?: number;
      codigoDian?: string;
      estado?: boolean;
    }
  ): Promise<ReglaContableApiResult<ReglaContable>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<ReglaContable>;
    return { data: resp.data as ReglaContable, msg: resp.msg };
  },

  async eliminar(codigo: string): Promise<ReglaContableApiResult<{ codigo: string }>> {
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    }) as ApiResponsePayload<{ codigo: string }>;
    return { data: resp.data as { codigo: string }, msg: resp.msg };
  },
};

export default reglasContablesService;
