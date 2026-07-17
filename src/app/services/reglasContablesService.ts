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
  /** Relación con el catálogo DIAN (catalogosDian, dominio DIAN_TRIBUTOS). Vacío = sin efecto DIAN. */
  codigoDian?: string;
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
  /** Relación con el catálogo de ámbitos (ambitoreglacontables). Vacío = sin ámbito asociado. */
  ambitoCodigo?: string;
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
  /** Relación con el catálogo de tipos (tiporeglacontablecatalogos). Vacío = sin tipo asociado. */
  tipoReglaCodigo?: string;
  orden: number;
  estado: boolean;
  esSistema?: boolean;
}

/** Entrada del catálogo genérico de códigos por dominio (piloto: DIAN_TRIBUTOS, scope global). */
export interface CatalogoCodigo {
  iud?: string;
  _id?: string;
  dominio: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  alias?: string[];
  metadata?: {
    /** Lista DIAN: 5=impuestos, 9=retenciones, 13=ICA, 48=responsabilidades, ZZ=sin lista. */
    lista?: string;
    /** true = suma al total (impuesto), false = resta (retención). */
    chargeIndicator?: boolean;
    [key: string]: unknown;
  };
  orden: number;
  estado: boolean;
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
  tarifaCodigo?: string;
  montoFijo?: number;
  baseCalculo: BaseCalculoRegla;
  aplicaEn: AplicaEnRegla;
  aplicaEnCarrito?: boolean;
  /**
   * Derivados de `ReglaContableAplicacion` (colección propia). Ya no se persisten en `ReglaContable`;
   * úsense `listarAplicacionesRegla`/`reemplazarAplicacionesRegla` para leer/escribir esta relación.
   */
  categoriasAplicacion?: string[];
  /** Productos específicos (catálogo Producto) sobre los que aplica la regla; usado en ámbito COMPRA. */
  productosAplicacion?: string[];
  orden: number;
  codigoDian?: string;
  estado: boolean;
  esSistema?: boolean;
}

export interface ProductoEnCategoria {
  _id?: string;
  iud?: string;
  nombre?: string;
  categoria?: { _id?: string; iud?: string; nombre: string; nivel?: string };
  reglasContables?: { codigo: string; aplica?: boolean }[];
  tieneRegla: boolean;
  productoVentaId?: { _id?: string; iud?: string; sku?: string; nombre?: string };
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
    /** Relación con el catálogo de tipos (tiporeglacontablecatalogos); vacío = sin tipo asociado. */
    tipoReglaCodigo?: string;
    orden?: number;
    estado?: boolean;
    /** Tenants autorizados para el ámbito; sin enviar, aplica solo al tenant actual. */
    tenantIds?: string[];
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
      tipoReglaCodigo?: string;
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

  /**
   * Tenants de la rama del JWT (tenantjerarquiacounters) para el multi-select de
   * "Tenants autorizados" en parametrización contable. Incluye siempre el tenant actual.
   */
  async listarTenantsAutorizables(): Promise<Array<{ tenantId: string; label: string; esActual: boolean; esRaiz: boolean }>> {
    const resp = await apiFetch('/api/inventario/config/reglas-contables/tenants-autorizables', { method: 'GET' });
    return (resp?.data ?? []) as Array<{ tenantId: string; label: string; esActual: boolean; esRaiz: boolean }>;
  },

  // ──── Catálogo genérico de códigos (piloto DIAN_TRIBUTOS) ────────────

  async listarCatalogoCodigos(dominio: string): Promise<CatalogoCodigo[]> {
    const resp = await apiFetch(`/api/inventario/config/catalogo-codigos?dominio=${encodeURIComponent(dominio)}`, {
      method: 'GET',
    });
    return (resp?.data ?? []) as CatalogoCodigo[];
  },

  async listarCatalogoCodigosAdmin(dominio: string): Promise<CatalogoCodigo[]> {
    const resp = await apiFetch(`/api/inventario/config/catalogo-codigos/admin?dominio=${encodeURIComponent(dominio)}`, {
      method: 'GET',
    });
    return (resp?.data ?? []) as CatalogoCodigo[];
  },

  async crearCatalogoCodigo(payload: {
    dominio: string;
    codigo: string;
    nombre: string;
    descripcion?: string;
    alias?: string[];
    metadata?: CatalogoCodigo['metadata'];
    estado?: boolean;
  }): Promise<ReglaContableApiResult<CatalogoCodigo>> {
    const resp = await apiFetch('/api/inventario/config/catalogo-codigos', {
      method: 'POST',
      body: payload,
    }) as ApiResponsePayload<CatalogoCodigo>;
    return { data: resp.data as CatalogoCodigo, msg: resp.msg };
  },

  async actualizarCatalogoCodigo(
    dominio: string,
    codigo: string,
    payload: {
      nombre?: string;
      descripcion?: string;
      alias?: string[];
      metadata?: CatalogoCodigo['metadata'];
      estado?: boolean;
    }
  ): Promise<ReglaContableApiResult<CatalogoCodigo>> {
    const resp = await apiFetch(
      `/api/inventario/config/catalogo-codigos/${encodeURIComponent(dominio)}/${encodeURIComponent(codigo)}`,
      { method: 'PUT', body: payload }
    ) as ApiResponsePayload<CatalogoCodigo>;
    return { data: resp.data as CatalogoCodigo, msg: resp.msg };
  },

  /** Carga explícita (botón) de los códigos oficiales DIAN del Anexo 20; idempotente. */
  async sembrarCatalogoCodigosOficiales(): Promise<ReglaContableApiResult<Record<string, { creados: number; omitidos: number }>>> {
    const resp = await apiFetch('/api/inventario/config/catalogo-codigos/seed-oficiales', {
      method: 'POST',
      body: {},
    }) as ApiResponsePayload<Record<string, { creados: number; omitidos: number }>>;
    return { data: resp.data as Record<string, { creados: number; omitidos: number }>, msg: resp.msg };
  },

  async eliminarCatalogoCodigo(dominio: string, codigo: string): Promise<ReglaContableApiResult<{ codigo: string }>> {
    const resp = await apiFetch(
      `/api/inventario/config/catalogo-codigos/${encodeURIComponent(dominio)}/${encodeURIComponent(codigo)}`,
      { method: 'DELETE' }
    ) as ApiResponsePayload<{ codigo: string }>;
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
    /** Código del catálogo DIAN (dominio DIAN_TRIBUTOS); vacío = sin efecto DIAN. */
    codigoDian?: string;
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
    payload: { nombre?: string; descripcion?: string; codigoDian?: string; orden?: number; estado?: boolean }
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
    /** Código del catálogo de ámbitos; vacío = sin ámbito asociado. */
    ambitoCodigo?: string;
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
      ambitoCodigo?: string;
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

  async listarAdmin(params: { alcance?: 'OC' } = {}): Promise<ReglaContable[]> {
    const query = params.alcance ? `?alcance=${encodeURIComponent(params.alcance)}` : '';
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/admin${query}`, { method: 'GET' });
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
    productosAplicacion?: string[];
    orden?: number;
    codigoDian?: string;
    estado?: boolean;
    /** Tenants autorizados para la regla; sin enviar, aplica solo al tenant actual. */
    tenantIds?: string[];
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
      productosAplicacion?: string[];
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

  async obtenerTarifaAplicable(params: {
    aplicaEn: AplicaEnRegla;
    codigoDian?: string;
    proveedorId?: string;
  }): Promise<{ tarifa: number; codigo: string | null; montoFijo: number; baseCalculo: BaseCalculoRegla | null; esGeneral: boolean; sinReglas?: boolean; motivo?: string }> {
    const query = new URLSearchParams();
    query.set('aplicaEn', params.aplicaEn);
    if (params.codigoDian) query.set('codigoDian', params.codigoDian);
    if (params.proveedorId) query.set('proveedorId', params.proveedorId);
    const resp = await apiFetch(`/api/inventario/config/reglas-contables/tarifa-aplicable?${query.toString()}`, {
      method: 'GET',
    }) as ApiResponsePayload<{ tarifa: number; codigo: string | null; montoFijo: number; baseCalculo: BaseCalculoRegla | null; esGeneral: boolean; sinReglas?: boolean; motivo?: string }>;
    return resp?.data ?? { tarifa: 0, codigo: null, montoFijo: 0, baseCalculo: null, esGeneral: true, sinReglas: true, motivo: 'RESPUESTA_VACIA' };
  },

  async listarProductosPorRegla(
    codigo: string,
    categorias: string[],
    ambito?: AplicaEnRegla,
    catalogo?: 'GENERAL' | 'VENTA'
  ): Promise<ProductoEnCategoria[]> {
    const query = new URLSearchParams();
    if (categorias.length > 0) query.set('categorias', categorias.join(','));
    if (ambito) query.set('ambito', ambito);
    if (catalogo) query.set('catalogo', catalogo);
    const q = query.toString() ? `?${query.toString()}` : '';
    const resp = await apiFetch(
      `/api/inventario/config/reglas-contables/${encodeURIComponent(codigo)}/productos${q}`,
      { method: 'GET' }
    );
    return (resp?.data ?? []) as ProductoEnCategoria[];
  },

  /** Categorías/productos actualmente asociados a la regla (colección `ReglaContableAplicacion`). */
  async listarAplicacionesRegla(codigo: string): Promise<{
    categoriasAplicacion: string[];
    productosAplicacion: string[];
    proveedoresAplicacion: string[];
    responsabilidadesRequeridas: string[];
  }> {
    const resp = await apiFetch(
      `/api/inventario/config/reglas-contables/${encodeURIComponent(codigo)}/aplicaciones`,
      { method: 'GET' }
    ) as ApiResponsePayload<{
      categoriasAplicacion: string[];
      productosAplicacion: string[];
      proveedoresAplicacion: string[];
      responsabilidadesRequeridas: string[];
    }>;
    return resp?.data ?? {
      categoriasAplicacion: [],
      productosAplicacion: [],
      proveedoresAplicacion: [],
      responsabilidadesRequeridas: [],
    };
  },

  /** Reemplaza TODO el set de categorías/productos asociados a la regla. */
  async reemplazarAplicacionesRegla(
    codigo: string,
    payload: {
      categoriasAplicacion?: string[];
      productosAplicacion?: string[];
      proveedoresAplicacion?: string[];
      responsabilidadesRequeridas?: string[];
    }
  ): Promise<ReglaContableApiResult<{
    codigo: string;
    categoriasAplicacion: string[];
    productosAplicacion: string[];
    proveedoresAplicacion: string[];
    responsabilidadesRequeridas: string[];
  }>> {
    const resp = await apiFetch(
      `/api/inventario/config/reglas-contables/${encodeURIComponent(codigo)}/aplicaciones`,
      { method: 'PUT', body: payload }
    );
    return { data: resp.data, msg: resp.msg };
  },
};

export default reglasContablesService;
