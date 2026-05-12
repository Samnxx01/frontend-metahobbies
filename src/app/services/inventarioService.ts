import { apiFetch } from './api';
import type { UsuarioOption } from './routesService';

export type MetodoValuacion = 'PROMEDIO' | 'FIFO';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'REVERSA';
export type MotivoMovimiento = 'COMPRA' | 'VENTA' | 'MERMA' | 'DANO' | 'ERROR_CONTEO' | 'PERDIDA' | 'REVERSA' | 'OTRO';
export type TipoAjuste = 'POSITIVO' | 'NEGATIVO';
export type EstadoAjuste = 'SOLICITADO' | 'APROBADO' | 'RECHAZADO';

export type InventarioFormularioRutaOpcion = {
  id: string;
  name: string;
  path: string;
  tipoNodo: string;
  component?: string | null;
};

/** Tenant global visible segun JWT o tenantSuperAdminId (DIOS). */
export type InventarioTenantGlobalOpcion = {
  iud: string;
  label: string;
  codigoJerarquia?: string | null;
};

/** tenantJerarquiaCounter con corporativo + tenantSuperAdmin (misma regla que jerarquia de usuarios). */
export type InventarioTenantSuperAdminOpcion = {
  iud: string;
  label: string;
  codigoJerarquia?: string | null;
};

export type InventarioFormulariosAutorizacionPolicy = {
  esDios?: boolean;
  esTenantSuperAdmin?: boolean;
  puedeEditarAccionesTenant?: boolean;
};

export interface InventarioConfig {
  _id?: string;
  metodoValuacion: MetodoValuacion;
  metodoBloqueadoDesdeAnioFiscal?: number | null;
  periodosCerrados: string[];
  documentosSoporte?: DocumentoSoporteTipoConfig[];
  monedaInventario?: MonedaInventarioConfig;
}

export interface MonedaInventarioConfig {
  monedaBase: string;
  monedaCompra: string;
  simbolo: string;
  decimales: number;
  formato: string;
  convertirPorTrm: boolean;
  conversionesMoneda?: ConversionMonedaConfig[];
}

export interface ConversionMonedaConfig {
  id: string;
  monedaOrigen: string;
  monedaDestino: string;
  tasa: number;
  fuente: string;
  fechaVigencia?: string | null;
  activo: boolean;
}

export interface DocumentoSoporteTipoConfig {
  id: string;
  codigo: string;
  prefijo: string;
  padding: number;
  siguiente: number;
  activo: boolean;
}

export interface DocumentoRelacionado {
  tipo: string;
  numero: string;
  idExterno?: string | null;
}

export interface InventarioTipoMovimiento {
  _id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  naturaleza: 'ENTRADA' | 'SALIDA';
  estado: boolean;
}

export type TipoUnidadMedida = string;

export interface InventarioTipoUnidadMedida {
  _id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: boolean;
}

export interface InventarioUnidadMedida {
  _id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  tipoUnidad?: TipoUnidadMedida;
  esUnidadBaseInventario?: boolean;
  unidadBaseRelacionada?: { _id: string; codigo: string; nombre: string } | null;
  factorConversionHaciaBase?: number | null;
}

export interface InventarioProveedor {
  _id?: string;
  iud?: string;
  nombre: string;
  nit: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  tipoProveedorId?: InventarioTipoProveedor | string | null;
  tipoProveedorNombre?: string;
  paisId?: string;
  paisNombre?: string;
  departamentoId?: string;
  departamentoNombre?: string;
  ciudadId?: string;
  ciudadNombre?: string;
  estado?: boolean;
}

export interface InventarioTipoProveedor {
  _id: string;
  iud?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: boolean;
}

export interface UbicacionInventario {
  pasillo?: string | null;
  estante?: string | null;
  nivel?: string | null;
  descripcion?: string;
}

export interface OrdenCompraItemLinea {
  sku: string;
  nombreProducto?: string;
  descripcion?: string;
  cantidadOrdenada: number;
  costoUnitario: number;
  descuentoPorcentaje?: number;
  descuento?: number;
  impuestoPorcentaje?: number;
  impuestos?: number;
  subtotal?: number;
  bodega: string;
  ubicacion?: UbicacionInventario;
}

export interface RecepcionOrdenCompraPayload {
  numeroRecepcion: string;
  documentoSoporte: { tipo: string; numero: string };
  items: Array<{
    ordenItemIndex?: number;
    sku: string;
    cantidadRecibida: number;
  }>;
}

export interface RecepcionOrdenCompraResponse {
  orden: InventarioOrdenCompra;
  recepcion: {
    _id: string;
    numeroRecepcion: string;
    items: Array<{
      sku: string;
      cantidadRecibida: number;
      costoUnitario: number;
      bodega: string;
      movimientoKardexId?: string | null;
      estadoKardex?: 'NO_CONFIRMADO' | 'CONFIRMADO';
    }>;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface InventarioOrdenCompra {
  _id: string;
  numeroOrden: string;
  numeroRemision?: string;
  numeroFacturaElectronico?: string;
  concepto?: string;
  justificacion?: string;
  fechaOrden?: string;
  proveedor: { nombre: string; nit: string };
  documentoLegalCompra: { tipo: string; numero: string; fecha: string };
  estado: string;
  items: Array<OrdenCompraItemLinea & { cantidadRecibida?: number }>;
  createdAt?: string;
  updatedAt?: string;
  auditoriaUltimaEdicion?: {
    concepto?: string;
    justificacion?: string;
    timestamp?: string;
  };
}

export interface SiguienteNumeroOrdenCompra {
  year: number;
  secuencial: number;
  numeroOrden: string;
}

export interface InventarioSaldo {
  _id?: string;
  sku: string;
  bodega: string;
  ubicacion?: UbicacionInventario;
  cantidadDisponible: number;
  costoPromedioUnitario: number;
  lotesFifo?: Array<{
    movimientoId: string;
    fecha: string;
    cantidad: number;
    costoUnitario: number;
  }>;
}

export interface InventarioMovimiento {
  _id: string;
  sku: string;
  tipoMovimiento: TipoMovimiento;
  tipoMovimientoConfigId?: InventarioTipoMovimiento | string | null;
  motivo: MotivoMovimiento;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  metodoValuacionAplicado: MetodoValuacion;
  bodega: string;
  ubicacion?: UbicacionInventario;
  documentoRelacionado: DocumentoRelacionado;
  auditoriaRelacion?: {
    origenColeccion?: string | null;
    origenId?: string | null;
    estadoRelacion?: 'NO_CONFIRMADO' | 'CONFIRMADO';
    confirmadoEn?: string | null;
  };
  referenciaMovimientoOriginal?: string | null;
  esReversion: boolean;
  hashPrevio?: string | null;
  hashIntegridad: string;
  createdAt?: string;
}

export interface MovimientoPayload {
  sku: string;
  tipoMovimientoConfigId?: string | null;
  bodega: string;
  cantidad: number;
  costoUnitario?: number;
  motivo?: MotivoMovimiento;
  ubicacion?: UbicacionInventario;
  documentoRelacionado: DocumentoRelacionado;
}

export interface BodegaInventario {
  _id: string;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  ubicaciones?: Array<UbicacionInventario & { _id?: string }>;
  departamentoId?: string;
  ciudadId?: string;
  departamentoNombre?: string;
  ciudadNombre?: string;
  municipiosSubnodo?: Array<{ ciudadId: string; nombre: string }>;
}

export interface AjusteInventario {
  _id: string;
  sku: string;
  bodega: string;
  tipoAjuste: TipoAjuste;
  causal: string;
  cantidad: number;
  costoUnitarioReferencia?: number;
  observacion?: string;
  estado: EstadoAjuste;
  movimientoId?: string | null;
  createdAt?: string;
}

export interface AjustePayload {
  sku: string;
  bodega: string;
  tipoAjuste: TipoAjuste;
  causal: string;
  cantidad: number;
  costoUnitarioReferencia?: number;
  observacion?: string;
  ubicacion?: UbicacionInventario;
}

export interface StockActualItem {
  sku: string;
  bodega: string;
  ubicacion?: UbicacionInventario;
  cantidadDisponible: number;
  costoPromedioUnitario: number;
  valorTotal?: number;
}

export interface InventoryLedgerMovement {
  _id: string;
  tenantId: string;
  productId: string;
  direction: 'IN' | 'OUT';
  movementType: 'PURCHASE' | 'SALE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'REVERSAL';
  quantity: number;
  unitCost: number;
  totalCost: number;
  referenceDocument: {
    type: string;
    number: string;
    invoiceId?: string | null;
    issuedAt?: string | null;
  };
  cufe: string;
  parentTransactionId?: string | null;
  reason: string;
  transactionHash: string;
  previousHash?: string | null;
  audit?: { userId?: string; ipOrigen?: string; timestamp?: string };
  createdAt?: string;
  updatedAt?: string;
  parent?: InventoryLedgerMovement | null;
}

export interface LedgerByInvoiceResponse {
  invoiceId: string;
  tenantId: string;
  documento: Record<string, unknown> | null;
  documentoTipo: 'FACTURA_PROVEEDOR_LEGACY' | 'ORDEN_COMPRA' | 'FACTURA_DIAN_COMPRA' | 'FACTURA_DIAN_VENTA' | null;
  estadoValidacion: string | null;
  mensajeValidacion: string | null;
  validada: boolean;
  total: number;
  movements: InventoryLedgerMovement[];
}

const buildQuery = (params: Record<string, string | number | undefined | null>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

const inventarioService = {
  async obtenerConfig(): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config', { method: 'GET' });
    return resp?.data as InventarioConfig;
  },

  async actualizarMetodoValuacion(metodoValuacion: MetodoValuacion): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config/metodo-valuacion', {
      method: 'PUT',
      body: { metodoValuacion },
    });
    return resp?.data as InventarioConfig;
  },

  async actualizarMonedaInventario(monedaInventario: MonedaInventarioConfig): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config/moneda', {
      method: 'PUT',
      body: monedaInventario,
    });
    return resp?.data as InventarioConfig;
  },

  async listarDocumentosSoporte(): Promise<DocumentoSoporteTipoConfig[]> {
    const resp = await apiFetch('/api/inventario/config/documentos-soporte', { method: 'GET' });
    return (resp?.data ?? []) as DocumentoSoporteTipoConfig[];
  },

  async guardarDocumentosSoporte(documentos: DocumentoSoporteTipoConfig[]): Promise<DocumentoSoporteTipoConfig[]> {
    const resp = await apiFetch('/api/inventario/config/documentos-soporte', {
      method: 'PUT',
      body: { documentos },
    });
    return (resp?.data ?? []) as DocumentoSoporteTipoConfig[];
  },

  async obtenerFormulariosAutorizacionOpciones(tenantSuperAdminId?: string): Promise<{
    formularios: InventarioFormularioRutaOpcion[];
    tenantGlobales: InventarioTenantGlobalOpcion[];
    tenantSuperAdmins: InventarioTenantSuperAdminOpcion[];
    usuarios: UsuarioOption[];
    policy: InventarioFormulariosAutorizacionPolicy;
    meta?: {
      alcance?: string;
      origenResolucion?: string;
      totalRutasActivas?: number;
      totalFormulariosSubformularios?: number;
      totalMostrados?: number;
      ayuda?: string | null;
      inventarioFormulariosModoAlcance?: string;
      requiereParametrizacionTenantSuperAdmin?: boolean;
      tenantSuperAdminAnclaId?: string | null;
      tenantGlobalJerarquiaOk?: boolean;
      totalTenantGlobalEnRama?: number;
      /** true si el ancla JWT tiene SA+ corporativo en tenantJerarquiaCounter (rama restringida). */
      filtroCorporativoCountersActivo?: boolean;
    };
  }> {
    const q =
      tenantSuperAdminId && /^[0-9a-fA-F]{24}$/.test(tenantSuperAdminId)
        ? `?tenantSuperAdminId=${encodeURIComponent(tenantSuperAdminId)}`
        : '';
    const resp = await apiFetch(`/api/inventario/config/formularios-autorizacion/opciones${q}`, { method: 'GET' });
    const data = resp?.data ?? {};
    return {
      formularios: (data.formularios ?? []) as InventarioFormularioRutaOpcion[],
      tenantGlobales: (data.tenantGlobales ?? []) as InventarioTenantGlobalOpcion[],
      tenantSuperAdmins: (data.tenantSuperAdmins ?? []) as InventarioTenantSuperAdminOpcion[],
      usuarios: (data.usuarios ?? []) as UsuarioOption[],
      policy: (data.policy ?? {}) as InventarioFormulariosAutorizacionPolicy,
      meta: data.meta,
    };
  },

  async aplicarFormulariosAutorizacion(body: {
    rutaIds: string[];
    tenantIds: string[];
    usuarioIds: string[];
    tenantSuperAdminId?: string;
  }): Promise<{ actualizadas: number; resultados: Array<{ rutaId: string; ok: boolean; error?: string }> }> {
    const resp = await apiFetch('/api/inventario/config/formularios-autorizacion', {
      method: 'PUT',
      body,
    });
    return {
      actualizadas: Number(resp?.actualizadas ?? 0),
      resultados: Array.isArray(resp?.resultados) ? resp.resultados : [],
    };
  },

  async cerrarPeriodo(periodo: string): Promise<string[]> {
    const resp = await apiFetch('/api/inventario/periodos/cerrar', {
      method: 'POST',
      body: { periodo },
    });
    return (resp?.periodosCerrados ?? []) as string[];
  },

  async obtenerStock(params: { sku: string; bodega: string }): Promise<InventarioSaldo> {
    const resp = await apiFetch(`/api/inventario/stock${buildQuery(params)}`, { method: 'GET' });
    return resp?.data as InventarioSaldo;
  },

  async listarKardex(params: { sku?: string; bodega?: string; limit?: number }): Promise<InventarioMovimiento[]> {
    const resp = await apiFetch(`/api/inventario/kardex${buildQuery(params)}`, { method: 'GET' });
    return (resp?.data ?? []) as InventarioMovimiento[];
  },

  async obtenerLedgerPorInvoice(invoiceId: string): Promise<LedgerByInvoiceResponse> {
    const resp = await apiFetch(`/api/inventario/ledger/by-invoice/${encodeURIComponent(invoiceId)}`, { method: 'GET' });
    return resp?.data as LedgerByInvoiceResponse;
  },

  async registrarEntrada(payload: MovimientoPayload): Promise<InventarioMovimiento> {
    const resp = await apiFetch('/api/inventario/movimientos/entrada', { method: 'POST', body: payload });
    return resp?.data as InventarioMovimiento;
  },

  async registrarSalida(payload: MovimientoPayload): Promise<InventarioMovimiento> {
    const resp = await apiFetch('/api/inventario/movimientos/salida', { method: 'POST', body: payload });
    return resp?.data as InventarioMovimiento;
  },

  async registrarReversion(id: string, documentoRelacionado?: DocumentoRelacionado): Promise<InventarioMovimiento> {
    const resp = await apiFetch(`/api/inventario/movimientos/reversion/${id}`, {
      method: 'POST',
      body: documentoRelacionado ? { documentoRelacionado } : {},
    });
    return resp?.data as InventarioMovimiento;
  },

  async listarTiposMovimiento(params: { naturaleza?: 'ENTRADA' | 'SALIDA' } = {}): Promise<InventarioTipoMovimiento[]> {
    const resp = await apiFetch(`/api/inventario/tipos-movimiento${buildQuery(params)}`, { method: 'GET' });
    return (resp?.data ?? []) as InventarioTipoMovimiento[];
  },

  async listarTiposMovimientoAdmin(): Promise<InventarioTipoMovimiento[]> {
    const resp = await apiFetch('/api/inventario/tipos-movimiento/admin', { method: 'GET' });
    return (resp?.data ?? []) as InventarioTipoMovimiento[];
  },

  async crearTipoMovimiento(payload: Omit<InventarioTipoMovimiento, '_id'>): Promise<InventarioTipoMovimiento> {
    const resp = await apiFetch('/api/inventario/tipos-movimiento', { method: 'POST', body: payload });
    return resp?.data as InventarioTipoMovimiento;
  },

  async actualizarTipoMovimiento(
    id: string,
    payload: Partial<Omit<InventarioTipoMovimiento, '_id'>>
  ): Promise<InventarioTipoMovimiento> {
    const resp = await apiFetch(`/api/inventario/tipos-movimiento/${id}`, { method: 'PUT', body: payload });
    return resp?.data as InventarioTipoMovimiento;
  },

  async listarUnidadesMedida(): Promise<InventarioUnidadMedida[]> {
    const resp = await apiFetch('/api/inventario/unidades-medida', { method: 'GET' });
    return (resp?.data ?? []) as InventarioUnidadMedida[];
  },

  async listarUnidadesMedidaAdmin(): Promise<InventarioUnidadMedida[]> {
    const resp = await apiFetch('/api/inventario/unidades-medida/admin', { method: 'GET' });
    return (resp?.data ?? []) as InventarioUnidadMedida[];
  },

  async listarTiposUnidadMedida(): Promise<InventarioTipoUnidadMedida[]> {
    const resp = await apiFetch('/api/inventario/tipos-unidad-medida/admin', { method: 'GET' });
    return (resp?.data ?? []) as InventarioTipoUnidadMedida[];
  },

  async crearTipoUnidadMedida(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
  }): Promise<InventarioTipoUnidadMedida> {
    const resp = await apiFetch('/api/inventario/tipos-unidad-medida', { method: 'POST', body: payload });
    return resp?.data as InventarioTipoUnidadMedida;
  },

  async crearUnidadMedida(payload: Omit<InventarioUnidadMedida, '_id'>): Promise<InventarioUnidadMedida> {
    const resp = await apiFetch('/api/inventario/unidades-medida', { method: 'POST', body: payload });
    return resp?.data as InventarioUnidadMedida;
  },

  async actualizarUnidadMedida(
    id: string,
    payload: Partial<Omit<InventarioUnidadMedida, '_id'>>
  ): Promise<InventarioUnidadMedida> {
    const resp = await apiFetch(`/api/inventario/unidades-medida/${id}`, { method: 'PUT', body: payload });
    return resp?.data as InventarioUnidadMedida;
  },

  async eliminarUnidadMedida(id: string): Promise<void> {
    await apiFetch(`/api/inventario/unidades-medida/${id}`, { method: 'DELETE' });
  },

  async listarProveedoresCompra(): Promise<InventarioProveedor[]> {
    const resp = await apiFetch('/api/inventario/compras/proveedores', { method: 'GET' });
    return (resp?.data ?? []) as InventarioProveedor[];
  },

  async listarTiposProveedor(): Promise<InventarioTipoProveedor[]> {
    const resp = await apiFetch('/api/inventario/compras/proveedores/tipos', { method: 'GET' });
    return (resp?.data ?? []) as InventarioTipoProveedor[];
  },

  async crearTipoProveedor(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
  }): Promise<InventarioTipoProveedor> {
    const resp = await apiFetch('/api/inventario/compras/proveedores/tipos', { method: 'POST', body: payload });
    return resp?.data as InventarioTipoProveedor;
  },

  async actualizarTipoProveedor(
    id: string,
    payload: Partial<Pick<InventarioTipoProveedor, 'codigo' | 'nombre' | 'descripcion' | 'estado'>>
  ): Promise<InventarioTipoProveedor> {
    const resp = await apiFetch(`/api/inventario/compras/proveedores/tipos/${id}`, { method: 'PUT', body: payload });
    return resp?.data as InventarioTipoProveedor;
  },

  async eliminarTipoProveedor(id: string): Promise<void> {
    await apiFetch(`/api/inventario/compras/proveedores/tipos/${id}`, { method: 'DELETE' });
  },

  async listarOrdenesCompra(params: { limit?: number } = {}): Promise<InventarioOrdenCompra[]> {
    const resp = await apiFetch(`/api/inventario/compras/ordenes${buildQuery(params)}`, { method: 'GET' });
    return (resp?.data ?? []) as InventarioOrdenCompra[];
  },

  async obtenerSiguienteNumeroOrdenCompra(): Promise<SiguienteNumeroOrdenCompra> {
    const resp = await apiFetch('/api/inventario/compras/ordenes/siguiente-numero', { method: 'GET' });
    return resp?.data as SiguienteNumeroOrdenCompra;
  },

  async crearOrdenCompra(payload: {
    numeroRemision?: string;
    numeroFacturaElectronico?: string;
    concepto: string;
    justificacion?: string;
    proveedor: { nombre: string; nit: string };
    items: OrdenCompraItemLinea[];
  }): Promise<InventarioOrdenCompra> {
    const resp = await apiFetch('/api/inventario/compras/ordenes', { method: 'POST', body: payload });
    return resp?.data as InventarioOrdenCompra;
  },

  async actualizarOrdenCompra(
    id: string,
    payload: {
      numeroRemision?: string;
      numeroFacturaElectronico?: string;
      justificacion: string;
      proveedor: { nombre: string; nit: string };
      items: OrdenCompraItemLinea[];
    }
  ): Promise<InventarioOrdenCompra> {
    const resp = await apiFetch(`/api/inventario/compras/ordenes/${id}`, { method: 'PUT', body: payload });
    return resp?.data as InventarioOrdenCompra;
  },

  async eliminarOrdenCompra(id: string, payload: { justificacion: string }): Promise<void> {
    await apiFetch(`/api/inventario/compras/ordenes/${id}`, { method: 'DELETE', body: payload });
  },

  async registrarRecepcionOrdenCompra(
    id: string,
    payload: RecepcionOrdenCompraPayload
  ): Promise<RecepcionOrdenCompraResponse> {
    const resp = await apiFetch(`/api/inventario/compras/ordenes/${id}/recepciones`, { method: 'POST', body: payload });
    return resp?.data as RecepcionOrdenCompraResponse;
  },

  async crearProveedorCompra(payload: {
    nombre: string;
    nit: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
    tipoProveedorId?: string;
    paisId?: string;
    departamentoId?: string;
    ciudadId?: string;
  }): Promise<InventarioProveedor> {
    const resp = await apiFetch('/api/inventario/compras/proveedores', { method: 'POST', body: payload });
    return resp?.data as InventarioProveedor;
  },

  async listarBodegas(): Promise<BodegaInventario[]> {
    const resp = await apiFetch('/api/inventario/bodegas', { method: 'GET' });
    return (resp?.data ?? []) as BodegaInventario[];
  },

  async crearBodega(payload: {
    nombre: string;
    descripcion?: string;
    departamentoId?: string;
    ciudadId?: string;
    municipiosSubnodo?: Array<{ ciudadId: string; nombre: string }>;
  }): Promise<BodegaInventario> {
    const resp = await apiFetch('/api/inventario/bodegas', { method: 'POST', body: payload });
    return resp?.data as BodegaInventario;
  },

  async actualizarBodega(
    id: string,
    payload: {
      nombre?: string;
      descripcion?: string;
      departamentoId?: string;
      ciudadId?: string;
      municipiosSubnodo?: Array<{ ciudadId: string; nombre: string }>;
      estado?: boolean;
    }
  ): Promise<BodegaInventario> {
    const resp = await apiFetch(`/api/inventario/bodegas/${id}`, { method: 'PUT', body: payload });
    return resp?.data as BodegaInventario;
  },

  async eliminarBodega(id: string): Promise<void> {
    await apiFetch(`/api/inventario/bodegas/${id}`, { method: 'DELETE' });
  },

  async listarAjustes(params: { estado?: EstadoAjuste | ''; sku?: string } = {}): Promise<AjusteInventario[]> {
    const resp = await apiFetch(`/api/inventario/ajustes${buildQuery(params)}`, { method: 'GET' });
    return (resp?.data ?? []) as AjusteInventario[];
  },

  async solicitarAjuste(payload: AjustePayload): Promise<AjusteInventario> {
    const resp = await apiFetch('/api/inventario/ajustes', { method: 'POST', body: payload });
    return resp?.data as AjusteInventario;
  },

  async aprobarAjuste(id: string): Promise<AjusteInventario> {
    const resp = await apiFetch(`/api/inventario/ajustes/${id}/aprobar`, { method: 'POST' });
    return resp?.data as AjusteInventario;
  },

  async rechazarAjuste(id: string, motivoRechazo: string): Promise<AjusteInventario> {
    const resp = await apiFetch(`/api/inventario/ajustes/${id}/rechazar`, {
      method: 'POST',
      body: { motivoRechazo },
    });
    return resp?.data as AjusteInventario;
  },

  async stockActual(bodega?: string): Promise<StockActualItem[]> {
    const resp = await apiFetch(`/api/inventario/reportes/stock-actual${buildQuery({ bodega })}`, { method: 'GET' });
    return (resp?.data ?? []) as StockActualItem[];
  },
};

export default inventarioService;
