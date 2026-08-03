import { apiFetch } from './api';
import type { ApiResponsePayload } from '@/app/utils/apiErrorMessage';
import type { UsuarioOption } from './routesService';
import { isOpaqueDocumentId, normalizePublicIdForApi } from '@/app/utils/entityPublicId';

export type InventarioApiResult<T> = {
  data: T;
  msg?: string;
};

export type MetodoValuacion = 'PROMEDIO' | 'FIFO';

export type MetodoValuacionOpcion = {
  codigo: MetodoValuacion;
  label: string;
  descripcion?: string;
  orden: number;
};

export type MetodosValuacionParametrizacion = {
  metodoActivo: MetodoValuacion;
  metodoBloqueadoDesdeAnioFiscal?: number | null;
  opciones: MetodoValuacionOpcion[];
};
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'REVERSA';
/** Código de causal parametrizada (ajustes/causales) usada como motivo en kardex. */
export type MotivoMovimiento = string;

export interface InventarioMotivoMovimiento {
  codigo: string;
  nombre: string;
}
export type TipoAjuste = 'POSITIVO' | 'NEGATIVO';
export type EstadoAjuste = 'SOLICITADO' | 'APROBADO' | 'RECHAZADO';

export type InventarioFormularioRutaOpcion = {
  id: string;
  name: string;
  path: string;
  tipoNodo: string;
  component?: string | null;
  formulariosConfig?: {
    habilitado?: boolean;
    modoAsignacion?: 'TENANT' | 'USUARIO' | 'NINGUNO' | string;
    tenantIds?: string[];
    usuarioIds?: string[];
    soloDios?: boolean;
  };
};

export type InventarioConfigTarjeta = {
  id: string;
  tenantSuperAdminId?: string | null;
  rutaId: string | null;
  tab?: string | null;
  moduloPath?: string | null;
  titulo: string;
  descripcion: string;
  path: string;
  iconKey?: string | null;
  orden: number;
  contenido?: Record<string, unknown>;
};

export type InventarioConfigTarjetaInput = {
  titulo?: string;
  descripcion?: string;
  path?: string;
  tab?: string | null;
  moduloPath?: string | null;
  iconKey?: string | null;
  orden?: number;
  rutaId?: string | null;
  contenido?: Record<string, unknown>;
};

const tenantSuperAdminIdQuery = (tenantSuperAdminId?: string): string => {
  const ancla = normalizePublicIdForApi(tenantSuperAdminId);
  return ancla && isOpaqueDocumentId(ancla)
    ? `?tenantSuperAdminId=${encodeURIComponent(ancla)}`
    : '';
};

const formulariosAutorizacionOpcionesQuery = (
  tenantSuperAdminId?: string,
  opts?: { soloCatalogo?: boolean },
): string => {
  const params = new URLSearchParams();
  const ancla = normalizePublicIdForApi(tenantSuperAdminId);
  if (ancla && isOpaqueDocumentId(ancla)) {
    params.set('tenantSuperAdminId', ancla);
  }
  if (opts?.soloCatalogo) params.set('soloCatalogo', '1');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

const tarjetasConfigQuery = (tenantSuperAdminId?: string): string =>
  tenantSuperAdminIdQuery(tenantSuperAdminId);

const GET_CACHE_TTL_MS = 15_000;
const getCache = new Map<string, { expiresAt: number; value: unknown }>();
const getEnCurso = new Map<string, Promise<unknown>>();

const getConCache = async <T>(key: string, loader: () => Promise<T>): Promise<T> => {
  const cached = getCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  const pendiente = getEnCurso.get(key);
  if (pendiente) return pendiente as Promise<T>;

  const request = loader()
    .then((value) => {
      getCache.set(key, { expiresAt: Date.now() + GET_CACHE_TTL_MS, value });
      return value;
    })
    .finally(() => {
      getEnCurso.delete(key);
    });
  getEnCurso.set(key, request);
  return request;
};

const invalidarCacheConfiguracionFormularios = (): void => {
  for (const key of getCache.keys()) {
    if (key.startsWith('formularios-opciones:') || key.startsWith('tarjetas-config:')) {
      getCache.delete(key);
    }
  }
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
  codigoPadre?: string | null;
  secuenciaJerarquia?: number | null;
  profundidad?: number;
};

export type InventarioJerarquiaSaCounterIndice = {
  tenantSuperAdminId: string;
  codigoJerarquia?: string | null;
  codigoPadre?: string | null;
  secuenciaJerarquia?: number | null;
  corporativoId?: string | null;
};

export type InventarioFormulariosAutorizacionPolicy = {
  esDios?: boolean;
  esTenantSuperAdmin?: boolean;
  puedeEditarAccionesTenant?: boolean;
};

export interface InventarioConfig {
  _id?: string;
  metodoValuacion: MetodoValuacion;
  metodoValuacionConfigId?: string | null;
  metodoValuacionDetalle?: {
    id: string | null;
    codigo: MetodoValuacion;
    label: string;
    descripcion?: string;
    orden?: number;
  };
  metodoBloqueadoDesdeAnioFiscal?: number | null;
  periodosCerrados: string[];
  compras?: InventarioComprasConfig;
  productos?: InventarioProductosConfig;
  kardex?: InventarioKardexConfig;
  documentosSoporte?: DocumentoSoporteTipoConfig[];
  monedaInventario?: MonedaInventarioConfig;
}

export interface EstadoOrdenCompraConfig {
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  esEstadoInicial?: boolean;
  permiteEditarOrden?: boolean;
  permiteConfirmarOrden?: boolean;
  estadoDestinoConfirmacion?: string;
  permiteComprobanteEntrada?: boolean;
  generaComprobanteContable?: boolean;
}

export interface InventarioComprasConfig {
  recepcionAutomatica: boolean;
  estadosOrdenCompra?: EstadoOrdenCompraConfig[];
  /** Códigos de ámbito cuyas reglas de impuesto aplican a las OC. Vacío = dinámico (todas las reglas IVA activas). */
  ambitosReglaImpuesto?: string[];
  /** Tributo activo de DIAN_TRIBUTOS para la OC. 01 = IVA. */
  codigoDianImpuesto?: string;
}

export interface InventarioProductosConfig {
  /** Ámbitos cuyas reglas aparecen en el formulario. Vacío = todas las activas. */
  ambitosReglaContable?: string[];
}

/** false = validar duplicados (recomendado); true = omitir validación. */
export type InventarioKardexAuditoriaParametro = {
  usuarioId: string | null;
  usuarioCorreo: string | null;
  modificadoEn: string | null;
  valorAnterior: boolean | null;
  valorNuevo: boolean | null;
};

export interface InventarioKardexConfig {
  omitirControlDuplicado: boolean;
  auditoria?: InventarioKardexAuditoriaParametro;
  historial?: InventarioKardexAuditoriaParametro[];
}

export interface MonedaInventarioConfig {
  monedaBase: string;
  monedaBaseId?: string | null;
  monedaCompra: string;
  monedaCompraId?: string | null;
  simbolo: string;
  decimales: number;
  formato: string;
  convertirPorTrm: boolean;
  conversionGrupoId?: string | null;
  conversionesMoneda?: ConversionMonedaConfig[];
}

export interface ConversionMonedaConfig {
  id: string;
  monedaOrigen: string;
  monedaOrigenId?: string | null;
  monedaDestino: string;
  monedaDestinoId?: string | null;
  tasa: number;
  fuente: string;
  fechaVigencia?: string | null;
  activo: boolean;
}

export interface InventarioTrmHistorico {
  id: string;
  monedaBase: string;
  monedaOrigen: string;
  valor: number;
  fechaVigencia: string;
  fuente: string;
  sincronizacionAutomatica: boolean;
  estado: 'ACTIVA' | 'HISTORICA';
  createdAt?: string;
  updatedAt?: string;
}

export interface InventarioTrmHistoricoPayload {
  monedaBase: string;
  monedaOrigen: string;
  valor: number;
  fechaVigencia: string;
  fuente: string;
  sincronizacionAutomatica?: boolean;
}

export interface MonedaCopOption {
  _id?: string;
  iud?: string;
  monedas: string;
  estadoMoneda: boolean;
  activosInventory?: boolean;
  activoWompi?: boolean;
}

export interface HistorialCicloSecuencia {
  ciclo: number;
  prefijo: string;
  consecutivoDesde: number;
  consecutivoHasta: number;
  totalEmitidos: number;
  maxRegistros: number;
  cerradoEn?: string;
}

export interface DocumentoSoporteTipoConfig {
  id: string;
  codigo: string;
  nombre?: string | null;
  descripcion?: string | null;
  dominioSecuencia?: 'VENTA' | 'INVENTARIO' | null;
  prefijo: string;
  padding: number;
  siguiente: number;
  /** Tope de emisiones; null = solo límite por dígitos. */
  maxRegistrosSecuencia?: number | null;
  cicloActual?: number;
  consecutivoInicioCiclo?: number;
  emisionesEnCiclo?: number;
  maxRegistrosCiclo?: number;
  disponiblesEnCiclo?: number;
  cicloCompleto?: boolean;
  historialCiclos?: HistorialCicloSecuencia[];
  activo: boolean;
  totalRecepciones?: number;
  puedeReiniciarSecuencia?: boolean;
}

export interface InventarioLibroFiscalConfig {
  id: string;
  iud?: string | null;
  codigo: string;
  nombre: string;
  tipoLibro: string;
  periodicidad: string;
  formato: 'PDF' | 'EXCEL' | 'XML' | 'CSV';
  monedaId: string;
  moneda?: string;
  prefijo: string;
  padding: number;
  siguiente: number;
  anioFiscal: number;
  descripcion?: string;
  activo: boolean;
}

export interface InventarioLibroFiscalCatalogoHijo {
  id?: string;
  iud?: string | null;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface DocumentoRelacionado {
  tipo: string;
  numero: string;
  idExterno?: string | null;
}

export interface InventarioTipoMovimiento {
  _id?: string;
  iud?: string;
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
  aplicaIva?: boolean;
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
  /** Referencia al catálogo de productos; se resuelve desde el SKU si no se envía. */
  productoId?: string | null;
  nombreProducto?: string;
  descripcion?: string;
  cantidadOrdenada: number;
  costoUnitario: number;
  descuentoPorcentaje?: number;
  descuento?: number;
  impuestoPorcentaje?: number;
  impuestos?: number;
  /** Código de la ReglaContable usada para autocompletar `impuestoPorcentaje`; null si fue manual. */
  codigoReglaImpuesto?: string | null;
  baseCalculoReglaAlGuardar?: string | null;
  baseImpuestoAlGuardar?: number | null;
  tarifaReglaAlGuardar?: number | null;
  montoFijoReglaAlGuardar?: number | null;
  subtotal?: number;
  bodega: string;
  ubicacion?: UbicacionInventario;
}

export interface RecepcionOrdenCompraPayload {
  numeroRecepcion: string;
  documentoSoporte: { tipo: string; numero: string };
  /** true = confirma y ocupa secuencia; false = borrador PENDIENTE_APROBACION sin kardex. */
  confirmar?: boolean;
  /** En subproceso manual: true fuerza kardex aunque recepción no sea automática. */
  aplicarKardex?: boolean;
  estado?: boolean;
  items: Array<{
    ordenItemIndex?: number;
    sku: string;
    cantidadRecibida: number;
  }>;
}

export interface ReporteKardexEntradaLinea {
  sku: string;
  bodega: string;
  movimientoKardexId?: string | null;
  movimientoLedgerId?: string | null;
  estadoKardex?: 'CONFIRMADO' | 'NO_CONFIRMADO';
  movimiento?: {
    tipoMovimiento?: string;
    tipoMovimientoConfig?: { codigo?: string; nombre?: string } | null;
    motivo?: string;
    cantidad?: number;
    costoUnitario?: number;
    costoTotal?: number;
    metodoValuacionAplicado?: string;
    documentoRelacionado?: { tipo?: string; numero?: string } | null;
    saldoBodega?: { cantidadAnterior?: number; cantidadPosterior?: number } | null;
    registradoEn?: string | null;
  } | null;
  saldo?: {
    cantidadDisponible?: number;
    costoPromedioUnitario?: number;
    precioComprobanteEntrada?: number;
    actualizadoEn?: string | null;
  } | null;
}

export interface RecepcionOrdenCompraResponse {
  /** Indica si al confirmar se registró kardex (recepción automática o estado explícito true). */
  aplicoKardex?: boolean;
  aplicoContable?: boolean;
  msg?: string;
  reporteKardex?: ReporteKardexEntradaLinea[];
  comprobanteContable?: {
    tipo?: string;
    numero?: string;
    documentoSoporteId?: string | null;
    confirmadoEn?: string;
    usuario?: { correo?: string; nombre?: string };
  } | null;
  orden: InventarioOrdenCompra;
  recepcion: {
    _id?: string;
    iud?: string;
    id?: string;
    numeroRecepcion: string;
    estado?: 'PENDIENTE_APROBACION' | 'APROBADA' | 'RECHAZADA' | 'ANULADA';
    documentoSoporte?: { tipo: string; numero: string };
    comprobanteContable?: {
      tipo?: string;
      numero?: string;
      documentoSoporteId?: string | null;
      confirmadoEn?: string;
      usuario?: { correo?: string; nombre?: string };
    } | null;
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

export interface EliminarOrdenCompraResponse {
  eliminado: boolean;
  id: string;
  recepcionesAnuladas?: number;
  reversionAutomatica?: boolean;
  modoRecepcion?: 'AUTOMATICA' | 'MANUAL';
  casoOmisoTenant?: boolean;
  auditoriaId?: string;
}

export interface AuditoriaOrdenCompra {
  usuarioId?: string;
  timestamp?: string;
  ipOrigen?: string;
  usuario?: {
    correo?: string;
    nombre?: string;
  };
}

export interface InventarioOrdenCompra {
  _id?: string;
  iud?: string;
  id?: string;
  numeroOrden: string;
  numeroRemision?: string;
  numeroFacturaElectronico?: string;
  concepto?: string;
  justificacion?: string;
  fechaOrden?: string;
  proveedor: { id?: string; nombre: string; nit: string };
  documentoLegalCompra: { tipo: string; numero: string; fecha: string };
  estado: string;
  nRecepciones?: number;
  comprobanteContable?: {
    tipo?: string;
    numero?: string;
    documentoSoporteId?: string | null;
    confirmadoEn?: string;
    usuario?: {
      correo?: string;
      nombre?: string;
    };
  } | null;
  procesoCompra?: {
    recepcionAutomatica?: boolean;
    modoRecepcion?: 'AUTOMATICA' | 'MANUAL';
  };
  items: Array<OrdenCompraItemLinea & { cantidadRecibida?: number }>;
  auditoria?: AuditoriaOrdenCompra;
  createdAt?: string;
  updatedAt?: string;
  auditoriaUltimaEdicion?: AuditoriaOrdenCompra & {
    concepto?: string;
    justificacion?: string;
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
  saldoBodega?: {
    cantidadAnterior: number;
    cantidadPosterior: number;
    valorInicial?: number | null;
    valorActual?: number | null;
  } | null;
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
  updatedAt?: string;
  auditoria?: {
    usuarioId?: string | null;
    timestamp?: string;
    ipOrigen?: string;
    usuarioNombre?: string | null;
    usuarioCorreo?: string | null;
  };
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
  omitirControlDuplicado?: boolean;
}

export interface BodegaInventario {
  _id?: string;
  iud?: string;
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

export interface InventarioTipoAjuste {
  _id?: string;
  iud?: string;
  codigo: string;
  nombre: string;
  direccion: TipoAjuste;
  descripcion?: string;
  estado: boolean;
}

export interface InventarioCausalAjuste {
  _id?: string;
  iud?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoMovimientoId?: InventarioTipoMovimiento | string | null;
  tipoMovimiento?: InventarioTipoMovimiento | null;
  tipoMovimientoReferenciaId?: string | null;
  tipoMovimientoRelacionValida?: boolean;
  estado: boolean;
}

export interface ComprobanteEntradaAjusteItem {
  lineaKey?: string;
  ordenItemIndex?: number | null;
  sku: string;
  bodega: string;
  cantidadRecibida: number;
  costoUnitario: number;
  /** Subtotal alineado con la línea OC (proporcional); evita deriva por redondeo unitario. */
  subtotal?: number;
  desglose?: {
    precioUnitarioOrden: number;
    subtotalBruto: number;
    descuento: number;
    baseGravable: number;
    impuestoPorcentaje: number;
    iva: number;
    total: number;
  } | null;
  disponibleKardex?: number;
  costoPromedioKardex?: number;
  movimientoKardexId?: string | null;
  movimientoLedgerId?: string | null;
  estadoKardex?: 'CONFIRMADO' | 'NO_CONFIRMADO';
  puedeSalida?: boolean;
}

export interface ComprobanteEntradaAjuste {
  recepcionId: string;
  numeroRecepcion: string;
  estado?: string;
  documentoSoporteId?: string | null;
  documentoSoporte?: { tipo: string; numero: string };
  ordenCompraId?: string | null;
  numeroOrden?: string | null;
  proveedorNombre?: string | null;
  proveedorNit?: string | null;
  bodega: string | null;
  bodegas: string[];
  items: ComprobanteEntradaAjusteItem[];
  createdAt?: string;
  tieneLineasSalida?: boolean;
  puedeSalidaComprobante?: boolean;
}

export interface ComprobanteEntradaDetalle {
  recepcionId: string;
  numeroRecepcion: string;
  estado: string;
  documentoSoporte: { tipo: string; numero: string };
  reporteKardex?: ReporteKardexEntradaLinea[];
  orden: {
    _id: string;
    numeroOrden: string;
    estado: string;
    proveedor?: { nombre?: string; nit?: string } | null;
  } | null;
  items: ComprobanteEntradaAjusteItem[];
  desglose?: {
    subtotalBruto: number;
    descuento: number;
    baseGravable: number;
    iva: number;
    total: number;
  };
  createdAt?: string;
  updatedAt?: string;
  puedeSalidaComprobante?: boolean;
}

export interface AjusteInventario {
  _id?: string;
  iud?: string;
  sku: string;
  bodega: string;
  bodegaDestino?: string | null;
  tipoAjusteCodigo?: string;
  tipoAjuste: TipoAjuste;
  recepcionCompraId?: string | null;
  causal: string;
  cantidad: number;
  costoUnitarioReferencia?: number;
  observacion?: string;
  estado: EstadoAjuste;
  movimientoId?: string | null;
  movimientoEntradaId?: string | null;
  createdAt?: string;
}

export interface AjustePayload {
  recepcionCompraId?: string;
  sku: string;
  bodega: string;
  bodegaDestino?: string;
  tipoAjusteCodigo: string;
  causal: string;
  cantidad: number;
  costoUnitarioReferencia?: number;
  observacion?: string;
  ubicacion?: UbicacionInventario;
}

/** Id público del ajuste (`iud` en API; `_id` en respuestas sin enmascarar). */
export const getAjusteInventarioId = (
  ajuste: Pick<AjusteInventario, '_id' | 'iud'> | null | undefined,
): string => String(ajuste?._id || ajuste?.iud || '').trim();

export interface InventarioValorHistoricoEntry {
  movimientoId?: string;
  fecha?: string;
  tipoMovimiento?: string;
  documentoTipo?: string | null;
  documentoNumero?: string | null;
  valorAnterior: number;
  valorPosterior: number;
  cantidadAnterior?: number;
  cantidadPosterior?: number;
  esPrimerRegistro?: boolean;
}

export interface StockActualItem {
  sku: string;
  bodega: string;
  ubicacion?: UbicacionInventario;
  cantidadDisponible: number;
  costoPromedioUnitario: number;
  valorTotal?: number;
  /** Valor del primer registro kardex (referencia histórica). */
  valorInicial?: number;
  /** Valor inventario actual (costo). */
  valorActual?: number;
  valorPrimerRegistro?: {
    movimientoId?: string;
    valor?: number;
    cantidad?: number;
    costoUnitario?: number;
    fecha?: string;
    documentoTipo?: string | null;
    documentoNumero?: string | null;
  } | null;
  historicoValores?: InventarioValorHistoricoEntry[];
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
    comprobanteId?: string | null;
    ordenCompraId?: string | null;
    invoiceId?: string | null;
    issuedAt?: string | null;
  };
  parentTransactionId?: string | null;
  reason: string;
  transactionHash: string;
  previousHash?: string | null;
  audit?: {
    usuario?: {
      nombre?: string;
      correo?: string | null;
    } | null;
    usuarioCorreo?: string | null;
    ipOrigen?: string;
    timestamp?: string;
    ejecutadoEn?: string;
  };
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

export interface InventarioComprobanteContable {
  id: string;
  tipo: string;
  numero: string;
  comprobanteId?: string | null;
  documentoSoporteId?: string | null;
  comprobanteEntrada?: {
    tipo?: string | null;
    numero?: string;
    documentoSoporteId?: string | null;
  } | null;
  invoiceId?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  fechaPrimera?: string;
  fechaUltima?: string;
  totalMovimientos: number;
  totalProductos: number;
  tiposMovimiento: string[];
  direcciones: string[];
  cantidadEntrada: number;
  cantidadSalida: number;
  valorEntrada: number;
  valorSalida: number;
  ultimoHash?: string | null;
  razonUltima?: string | null;
  usuario?: {
    nombre?: string;
    correo?: string | null;
  } | null;
  ejecutadoEn?: string | null;
  ipOrigenEjecutor?: string | null;
}

export interface CrearComprobanteContablePayload {
  sku: string;
  direction: 'IN' | 'OUT';
  quantity: number;
  unitCost?: number;
  reason: string;
  documentoCodigo?: string;
  usarSecuenciaAutomatica?: boolean;
  referenceDocument: {
    type?: string;
    number?: string;
    issuedAt?: string | null;
  };
}

export interface SiguienteNumeroComprobantePreview {
  codigo: string;
  prefijo: string;
  padding: number;
  siguiente: number;
  siguienteFormateado: string;
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

/** Respuestas `{ ok, data }`; si `data` no es arreglo, devuelve `[]` para no romper `.length` / `.map` en UI. */
const listaDesdeResp = <T>(resp: unknown): T[] => {
  if (!resp || typeof resp !== 'object') return [];
  const d = (resp as { data?: unknown }).data;
  return Array.isArray(d) ? (d as T[]) : [];
};

const inventarioService = {
  async obtenerConfig(): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config', { method: 'GET' });
    return resp?.data as InventarioConfig;
  },

  async obtenerMetodosValuacionOpciones(): Promise<MetodosValuacionParametrizacion> {
    const resp = await apiFetch('/api/inventario/config/metodo-valuacion/opciones', { method: 'GET' });
    return resp?.data as MetodosValuacionParametrizacion;
  },

  async guardarMetodoValuacion(
    metodoValuacion: MetodoValuacion,
    params: { anioFiscal?: number | string | null } = {},
  ): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config/metodo-valuacion', {
      method: 'PUT',
      body: {
        metodoValuacion,
        ...(params.anioFiscal != null && params.anioFiscal !== '' ? { anioFiscal: Number(params.anioFiscal) } : {}),
      },
    });
    return resp?.data as InventarioConfig;
  },

  /** @deprecated Preferir guardarMetodoValuacion (PUT). */
  async actualizarMetodoValuacion(metodoValuacion: MetodoValuacion): Promise<InventarioConfig> {
    return this.guardarMetodoValuacion(metodoValuacion);
  },

  async actualizarMonedaInventario(monedaInventario: MonedaInventarioConfig): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config/moneda', {
      method: 'PUT',
      body: monedaInventario,
    });
    return resp?.data as InventarioConfig;
  },

  async listarTrmHistorico(): Promise<InventarioTrmHistorico[]> {
    const resp = await apiFetch('/api/inventario/config/trm/historico', { method: 'GET' });
    return (resp?.data ?? []) as InventarioTrmHistorico[];
  },

  async guardarTrmHistorico(payload: InventarioTrmHistoricoPayload): Promise<InventarioTrmHistorico> {
    const resp = await apiFetch('/api/inventario/config/trm/historico', {
      method: 'POST',
      body: payload,
    });
    return resp?.data as InventarioTrmHistorico;
  },

  async listarMonedasCop(): Promise<MonedaCopOption[]> {
    const resp = await apiFetch('/api/monedas/seguridad/listar/monedas', { method: 'GET' });
    const rows = Array.isArray(resp?.monedas) ? resp.monedas : [];
    return rows as MonedaCopOption[];
  },

  async sincronizarMonedasInventory(): Promise<MonedaCopOption[]> {
    const resp = await apiFetch('/api/inventario/config/monedas-inventory/sincronizar', { method: 'PUT' });
    const rows = Array.isArray(resp?.data?.monedas) ? resp.data.monedas : [];
    return rows as MonedaCopOption[];
  },

  async listarEstadosOrdenCompra(): Promise<EstadoOrdenCompraConfig[]> {
    const resp = await apiFetch('/api/inventario/config/compras/estados-orden', { method: 'GET' });
    return (resp?.data ?? []) as EstadoOrdenCompraConfig[];
  },

  async guardarEstadosOrdenCompra(estados: EstadoOrdenCompraConfig[]): Promise<EstadoOrdenCompraConfig[]> {
    const resp = await apiFetch('/api/inventario/config/compras/estados-orden', {
      method: 'PUT',
      body: { estados },
    });
    return (resp?.data ?? []) as EstadoOrdenCompraConfig[];
  },

  async actualizarConfigCompras(compras: InventarioComprasConfig): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config/compras', {
      method: 'PUT',
      body: compras,
    });
    return resp?.data as InventarioConfig;
  },

  async actualizarConfigProductos(productos: InventarioProductosConfig): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config/productos', {
      method: 'PUT',
      body: productos,
    });
    return resp?.data as InventarioConfig;
  },

  async actualizarConfigKardex(kardex: InventarioKardexConfig): Promise<InventarioConfig> {
    const resp = await apiFetch('/api/inventario/config/kardex', {
      method: 'PUT',
      body: kardex,
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

  async cerrarCicloSecuenciaDocumentoSoporte(codigo: string): Promise<{
    codigo: string;
    cicloCerrado: number;
    cicloActual: number;
    consecutivoInicioCiclo: number;
    siguiente: number;
    siguienteFormateado: string;
    historial: HistorialCicloSecuencia;
    config: DocumentoSoporteTipoConfig | null;
  }> {
    const resp = await apiFetch('/api/inventario/config/documentos-soporte/cerrar-ciclo', {
      method: 'POST',
      body: { codigo },
    });
    return resp?.data as {
      codigo: string;
      cicloCerrado: number;
      cicloActual: number;
      consecutivoInicioCiclo: number;
      siguiente: number;
      siguienteFormateado: string;
      historial: HistorialCicloSecuencia;
      config: DocumentoSoporteTipoConfig | null;
    };
  },

  async registrarEmisionesManualesVinculadas(payload: {
    codigo: string;
    desdeSecuencia?: number;
    hastaSecuencia?: number;
    reservarSiguiente?: boolean;
  }): Promise<{
    codigo: string;
    documentoSoporteConfigId: string;
    desde: number;
    hasta: number;
    creados: number;
    vinculados: number;
    ocupados: number;
    omitidos: number;
    registros: Array<{
      id: string;
      secuencia: number;
      numero: string;
      estado: string;
      documentoSoporteConfigId: string;
      omitido?: boolean;
    }>;
    reservaSiguiente: {
      id: string;
      secuencia: number;
      numero: string;
      estado: string;
      documentoSoporteConfigId: string;
    } | null;
  }> {
    const resp = await apiFetch('/api/inventario/config/documentos-soporte/registrar-emision-manual', {
      method: 'POST',
      body: payload,
    });
    return resp?.data as {
      codigo: string;
      documentoSoporteConfigId: string;
      desde: number;
      hasta: number;
      creados: number;
      vinculados: number;
      ocupados: number;
      omitidos: number;
      registros: Array<{
        id: string;
        secuencia: number;
        numero: string;
        estado: string;
        documentoSoporteConfigId: string;
        omitido?: boolean;
      }>;
      reservaSiguiente: {
        id: string;
        secuencia: number;
        numero: string;
        estado: string;
        documentoSoporteConfigId: string;
      } | null;
    };
  },

  async sincronizarSecuenciaDocumentoSoporte(codigo: string): Promise<{
    codigo: string;
    prefijo: string;
    padding: number;
    maxUsado: number;
    siguiente: number;
    siguienteFormateado: string;
    recepcionesConsultadas: string;
  }> {
    const resp = await apiFetch('/api/inventario/config/documentos-soporte/sincronizar-secuencia', {
      method: 'POST',
      body: { codigo },
    });
    return resp?.data as {
      codigo: string;
      prefijo: string;
      padding: number;
      maxUsado: number;
      siguiente: number;
      siguienteFormateado: string;
      recepcionesConsultadas: string;
    };
  },

  async listarTiposLibroFiscalCatalogo(): Promise<InventarioLibroFiscalCatalogoHijo[]> {
    const resp = await apiFetch('/api/inventario/config/libros-fiscales/catalogos/tipos-libro', { method: 'GET' });
    return (resp?.data ?? []) as InventarioLibroFiscalCatalogoHijo[];
  },

  async guardarTiposLibroFiscalCatalogo(tipos: InventarioLibroFiscalCatalogoHijo[]): Promise<InventarioLibroFiscalCatalogoHijo[]> {
    const resp = await apiFetch('/api/inventario/config/libros-fiscales/catalogos/tipos-libro', {
      method: 'PUT',
      body: { tipos },
    });
    return (resp?.data ?? []) as InventarioLibroFiscalCatalogoHijo[];
  },

  async listarPeriodicidadesLibroFiscalCatalogo(): Promise<InventarioLibroFiscalCatalogoHijo[]> {
    const resp = await apiFetch('/api/inventario/config/libros-fiscales/catalogos/periodicidades', { method: 'GET' });
    return (resp?.data ?? []) as InventarioLibroFiscalCatalogoHijo[];
  },

  async guardarPeriodicidadesLibroFiscalCatalogo(periodicidades: InventarioLibroFiscalCatalogoHijo[]): Promise<InventarioLibroFiscalCatalogoHijo[]> {
    const resp = await apiFetch('/api/inventario/config/libros-fiscales/catalogos/periodicidades', {
      method: 'PUT',
      body: { periodicidades },
    });
    return (resp?.data ?? []) as InventarioLibroFiscalCatalogoHijo[];
  },

  async listarLibrosFiscales(): Promise<InventarioLibroFiscalConfig[]> {
    const resp = await apiFetch('/api/inventario/config/libros-fiscales', { method: 'GET' });
    return (resp?.data ?? []) as InventarioLibroFiscalConfig[];
  },

  async guardarLibrosFiscales(libros: InventarioLibroFiscalConfig[]): Promise<InventarioLibroFiscalConfig[]> {
    const resp = await apiFetch('/api/inventario/config/libros-fiscales', {
      method: 'PUT',
      body: { libros },
    });
    return (resp?.data ?? []) as InventarioLibroFiscalConfig[];
  },

  async listarPeriodicidadesLibroFiscal(libroFiscalConfigId: string): Promise<InventarioLibroFiscalCatalogoHijo[]> {
    const resp = await apiFetch(`/api/inventario/config/libros-fiscales/${encodeURIComponent(libroFiscalConfigId)}/periodicidades`, { method: 'GET' });
    return (resp?.data ?? []) as InventarioLibroFiscalCatalogoHijo[];
  },

  async guardarPeriodicidadesLibroFiscal(libroFiscalConfigId: string, periodicidades: InventarioLibroFiscalCatalogoHijo[]): Promise<InventarioLibroFiscalCatalogoHijo[]> {
    const resp = await apiFetch(`/api/inventario/config/libros-fiscales/${encodeURIComponent(libroFiscalConfigId)}/periodicidades`, {
      method: 'PUT',
      body: { periodicidades },
    });
    return (resp?.data ?? []) as InventarioLibroFiscalCatalogoHijo[];
  },

  async listarFormatosLibroFiscal(libroFiscalConfigId: string): Promise<InventarioLibroFiscalCatalogoHijo[]> {
    const resp = await apiFetch(`/api/inventario/config/libros-fiscales/${encodeURIComponent(libroFiscalConfigId)}/formatos`, { method: 'GET' });
    return (resp?.data ?? []) as InventarioLibroFiscalCatalogoHijo[];
  },

  async guardarFormatosLibroFiscal(libroFiscalConfigId: string, formatos: InventarioLibroFiscalCatalogoHijo[]): Promise<InventarioLibroFiscalCatalogoHijo[]> {
    const resp = await apiFetch(`/api/inventario/config/libros-fiscales/${encodeURIComponent(libroFiscalConfigId)}/formatos`, {
      method: 'PUT',
      body: { formatos },
    });
    return (resp?.data ?? []) as InventarioLibroFiscalCatalogoHijo[];
  },

  async obtenerFormulariosAutorizacionOpciones(
    tenantSuperAdminId?: string,
    opts?: { soloCatalogo?: boolean },
  ): Promise<{
    formularios: InventarioFormularioRutaOpcion[];
    tenantGlobales: InventarioTenantGlobalOpcion[];
    tenantSuperAdmins: InventarioTenantSuperAdminOpcion[];
    saArbolRama: InventarioTenantSuperAdminOpcion[];
    jerarquiaSaCounters: InventarioJerarquiaSaCounterIndice[];
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
      formulariosFiltradosPorHerencia?: boolean;
      herenciaVistasVacias?: boolean;
      totalVistasHerenciaRama?: number;
      ejecutorBypassHerencia?: boolean;
      totalSaEnArbolRama?: number;
      totalSaArbolRama?: number;
      totalUsuariosRama?: number;
      jwtTenantSuperAdminCanonicoId?: string | null;
      tenantSuperAdminRolParametrizado?: { id: string; nombre: string } | null;
      rolSesionId?: string | null;
      rolSesionNombre?: string | null;
      resolucionSaOk?: boolean;
      rolParametrizadoCoincideSesion?: boolean;
      jwtSaDesincronizado?: boolean;
      diagnosticoRamaUsuarios?: {
        saIdsEnRama?: string[];
        totalTgEnRama?: number;
        totalCorpEnRama?: number;
        totalRolesEnRama?: number;
        propietariosSa?: Array<{ usuarioId: string; saId: string }>;
        documentosRegisCandidatos?: number;
        rechazadosPorFiltro?: number;
        saAnclaResuelto?: string | null;
      } | null;
    };
  }> {
    const q = formulariosAutorizacionOpcionesQuery(tenantSuperAdminId, opts);
    return getConCache(`formularios-opciones:${q}`, async () => {
      const resp = await apiFetch(`/api/inventario/config/formularios-autorizacion/opciones${q}`, { method: 'GET' });
      const data = resp?.data ?? {};
      return {
        formularios: (data.formularios ?? []) as InventarioFormularioRutaOpcion[],
        tenantGlobales: (data.tenantGlobales ?? []) as InventarioTenantGlobalOpcion[],
        tenantSuperAdmins: (data.tenantSuperAdmins ?? []) as InventarioTenantSuperAdminOpcion[],
        saArbolRama: (data.saArbolRama ?? []) as InventarioTenantSuperAdminOpcion[],
        jerarquiaSaCounters: (data.jerarquiaSaCounters ?? []) as InventarioJerarquiaSaCounterIndice[],
        usuarios: (data.usuarios ?? []) as UsuarioOption[],
        policy: (data.policy ?? {}) as InventarioFormulariosAutorizacionPolicy,
        meta: data.meta,
      };
    });
  },

  async listarTarjetasConfig(tenantSuperAdminId?: string): Promise<InventarioConfigTarjeta[]> {
    const q = tarjetasConfigQuery(tenantSuperAdminId);
    return getConCache(`tarjetas-config:${q}`, async () => {
      const resp = await apiFetch(`/api/inventario/config/tarjetas${q}`, {
        method: 'GET',
      });
      return (resp?.data ?? []) as InventarioConfigTarjeta[];
    });
  },

  async actualizarTarjetaConfig(
    id: string,
    body: InventarioConfigTarjetaInput,
    tenantSuperAdminId?: string,
  ): Promise<InventarioConfigTarjeta> {
    const resp = await apiFetch(
      `/api/inventario/config/tarjetas/${encodeURIComponent(id)}${tarjetasConfigQuery(tenantSuperAdminId)}`,
      { method: 'PUT', body },
    );
    invalidarCacheConfiguracionFormularios();
    return resp?.data as InventarioConfigTarjeta;
  },

  async eliminarTarjetaConfig(id: string, tenantSuperAdminId?: string): Promise<{ id: string; eliminada: boolean }> {
    const resp = await apiFetch(
      `/api/inventario/config/tarjetas/${encodeURIComponent(id)}${tarjetasConfigQuery(tenantSuperAdminId)}`,
      { method: 'DELETE' },
    );
    invalidarCacheConfiguracionFormularios();
    return (resp?.data ?? { id, eliminada: true }) as { id: string; eliminada: boolean };
  },

  async guardarParametrizacionTarjeta(body: {
    rutaIds: string[];
    tenantSuperAdminId: string;
    tarjetaConfig: {
      tab?: string | null;
      moduloPath?: string | null;
      tituloModulo?: string | null;
      descripcionModulo?: string | null;
      iconKey?: string | null;
      orden?: number;
    };
  }): Promise<{ upserted: number }> {
    const resp = await apiFetch('/api/inventario/config/tarjetas/parametrizacion', {
      method: 'PUT',
      body,
    });
    invalidarCacheConfiguracionFormularios();
    return (resp?.data ?? { upserted: 0 }) as { upserted: number };
  },

  async aplicarFormulariosAutorizacion(body: {
    rutaIds: string[];
    tenantIds: string[];
    usuarioIds: string[];
    tenantSuperAdminId?: string;
    /** DIOS: varias ramas SA; valida usuarios contra la union de ramas. */
    tenantSuperAdminIds?: string[];
    tarjetaConfig?: {
      tab?: string | null;
      moduloPath?: string | null;
      tituloModulo?: string | null;
      descripcionModulo?: string | null;
      iconKey?: string | null;
    };
  }): Promise<{ actualizadas: number; resultados: Array<{ rutaId: string; ok: boolean; error?: string }> }> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const resp = await apiFetch('/api/inventario/config/formularios-autorizacion', {
        method: 'PUT',
        body,
        signal: controller.signal,
      });
      invalidarCacheConfiguracionFormularios();
      return {
        actualizadas: Number(resp?.actualizadas ?? 0),
        resultados: Array.isArray(resp?.resultados) ? resp.resultados : [],
      };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('El guardado continúa tardando más de lo esperado. La interfaz fue liberada; actualiza los datos antes de reintentar.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
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

  async exportarKardexExcel(params: { sku?: string; bodega?: string; desde?: string; hasta?: string }): Promise<void> {
    const response = await apiFetch(
      `/api/inventario/reportes/exportar/kardex${buildQuery(params)}`,
      { method: 'GET', responseType: 'raw' },
    ) as Response;
    if (!response.ok) {
      let msg = 'No se pudo exportar el kardex.';
      try {
        const json = await response.json();
        if (typeof json?.msg === 'string') msg = json.msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    const blob = await response.blob();
    const skuLabel = String(params.sku || 'todos').trim().toUpperCase();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kardex-${skuLabel}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  },

  async obtenerLedgerPorInvoice(invoiceId: string): Promise<LedgerByInvoiceResponse> {
    const resp = await apiFetch(`/api/inventario/ledger/by-invoice/${encodeURIComponent(invoiceId)}`, { method: 'GET' });
    return resp?.data as LedgerByInvoiceResponse;
  },

  async listarComprobantesContables(): Promise<InventarioComprobanteContable[]> {
    const resp = await apiFetch('/api/inventario/config/comprobantes-contables', { method: 'GET' });
    return (resp?.data ?? []) as InventarioComprobanteContable[];
  },

  async previewSiguienteNumeroComprobante(codigo: string): Promise<SiguienteNumeroComprobantePreview> {
    const resp = await apiFetch(
      `/api/inventario/config/comprobantes-contables/siguiente-numero${buildQuery({ codigo })}`,
      { method: 'GET' }
    );
    return resp?.data as SiguienteNumeroComprobantePreview;
  },

  async crearComprobanteContable(payload: CrearComprobanteContablePayload): Promise<InventoryLedgerMovement> {
    const resp = await apiFetch('/api/inventario/config/comprobantes-contables', {
      method: 'POST',
      body: payload,
    });
    return resp?.data as InventoryLedgerMovement;
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

  async eliminarTipoMovimiento(id: string): Promise<void> {
    await apiFetch(`/api/inventario/tipos-movimiento/${id}`, { method: 'DELETE' });
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
    return listaDesdeResp<InventarioProveedor>(resp);
  },

  /** Responsabilidades fiscales DIAN (Lista 48 del RUT) asignadas al proveedor. */
  async listarResponsabilidadesProveedor(
    proveedorId: string
  ): Promise<Array<{ responsabilidadCodigo: string; nombre: string }>> {
    const resp = await apiFetch(
      `/api/inventario/compras/proveedores/${encodeURIComponent(proveedorId)}/responsabilidades`,
      { method: 'GET' }
    );
    return (resp?.data ?? []) as Array<{ responsabilidadCodigo: string; nombre: string }>;
  },

  /** Reemplaza el set de responsabilidades fiscales DIAN del proveedor (códigos del catálogo). */
  async guardarResponsabilidadesProveedor(
    proveedorId: string,
    responsabilidades: string[]
  ): Promise<{ msg?: string }> {
    const resp = await apiFetch(
      `/api/inventario/compras/proveedores/${encodeURIComponent(proveedorId)}/responsabilidades`,
      { method: 'PUT', body: { responsabilidades } }
    );
    return { msg: resp?.msg };
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
    return listaDesdeResp<InventarioOrdenCompra>(resp);
  },

  /** GET /api/inventario/compras/ordenes/:id */
  async obtenerOrdenCompra(id: string): Promise<InventarioOrdenCompra> {
    const resp = await apiFetch(`/api/inventario/compras/ordenes/${id}`, { method: 'GET' });
    return resp?.data as InventarioOrdenCompra;
  },

  /** GET /api/inventario/compras/ordenes/:id/conciliacion */
  async obtenerConciliacionOrdenCompra(id: string): Promise<unknown> {
    const resp = await apiFetch(`/api/inventario/compras/ordenes/${id}/conciliacion`, { method: 'GET' });
    return resp?.data;
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
    proveedor: { id?: string; nombre: string; nit: string };
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

  async confirmarOrdenCompra(id: string): Promise<{
    orden: InventarioOrdenCompra;
    comprobanteContable: {
      numero: string;
      tipo: string;
      documentoSoporteId?: string | null;
      comprobanteId: string;
      totalMovimientos: number;
    };
  }> {
    const resp = await apiFetch(`/api/inventario/compras/ordenes/${id}/confirmar`, { method: 'POST' });
    return resp?.data as {
      orden: InventarioOrdenCompra;
      comprobanteContable: {
        numero: string;
        tipo: string;
        documentoSoporteId?: string | null;
        comprobanteId: string;
        totalMovimientos: number;
      };
    };
  },

  async eliminarOrdenCompra(id: string, payload: { justificacion: string; confirmarCasoOmiso?: boolean }): Promise<EliminarOrdenCompraResponse> {
    const resp = await apiFetch(`/api/inventario/compras/ordenes/${id}`, { method: 'DELETE', body: payload });
    return resp?.data as EliminarOrdenCompraResponse;
  },

  async registrarRecepcionOrdenCompra(
    id: string,
    payload: RecepcionOrdenCompraPayload
  ): Promise<RecepcionOrdenCompraResponse> {
    const resp = await apiFetch(`/api/inventario/compras/ordenes/${id}/recepciones`, { method: 'POST', body: payload });
    return resp?.data as RecepcionOrdenCompraResponse;
  },

  async confirmarRecepcionOrdenCompra(
    recepcionId: string,
    payload: { estado?: boolean; confirmar?: boolean; aplicarKardex?: boolean } = {}
  ): Promise<RecepcionOrdenCompraResponse> {
    const resp = await apiFetch(`/api/inventario/compras/recepciones/${recepcionId}/confirmar`, {
      method: 'POST',
      body: payload,
    });
    const data = (resp?.data || {}) as RecepcionOrdenCompraResponse;
    return {
      ...data,
      aplicoKardex: data.aplicoKardex,
      msg: typeof resp?.msg === 'string' ? resp.msg : data.msg,
    };
  },

  async crearProveedorCompra(payload: {
    nombre: string;
    nit: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
    aplicaIva?: boolean;
    tipoProveedorId?: string;
    paisId?: string;
    departamentoId?: string;
    ciudadId?: string;
  }): Promise<InventarioProveedor> {
    const resp = await apiFetch('/api/inventario/compras/proveedores', { method: 'POST', body: payload });
    return resp?.data as InventarioProveedor;
  },

  async actualizarComprobanteEntradaPendiente(
    recepcionId: string,
    payload: { items: Array<{ ordenItemIndex?: number | null; sku: string; cantidadRecibida: number }> },
  ): Promise<RecepcionOrdenCompraResponse> {
    const resp = await apiFetch(`/api/inventario/compras/recepciones/${encodeURIComponent(recepcionId)}`, {
      method: 'PUT',
      body: payload,
    });
    return (resp?.data || {}) as RecepcionOrdenCompraResponse;
  },

  async actualizarProveedorCompra(id: string, payload: {
    nombre: string; nit: string; correo?: string; telefono?: string; direccion?: string;
    aplicaIva?: boolean; tipoProveedorId?: string; paisId?: string; departamentoId?: string; ciudadId?: string;
  }): Promise<InventarioProveedor> {
    const resp = await apiFetch(`/api/inventario/compras/proveedores/${id}`, { method: 'PUT', body: payload });
    return resp?.data as InventarioProveedor;
  },

  async eliminarProveedorCompra(id: string): Promise<void> {
    await apiFetch(`/api/inventario/compras/proveedores/${id}`, { method: 'DELETE' });
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
    await apiFetch(`/api/inventario/bodegas/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async listarComprobantesEntradaAjustes(limit = 200): Promise<ComprobanteEntradaAjuste[]> {
    const resp = await apiFetch(`/api/inventario/ajustes/comprobantes-entrada${buildQuery({ limit })}`, { method: 'GET' });
    return (resp?.data ?? []) as ComprobanteEntradaAjuste[];
  },

  /** Comprobantes aprobados con kardex confirmado y stock disponible (salidas / traslados). */
  async listarComprobantesEntradaMovimientos(limit = 200): Promise<ComprobanteEntradaAjuste[]> {
    const resp = await apiFetch(`/api/inventario/compras/comprobantes-entrada${buildQuery({ limit })}`, { method: 'GET' });
    return (resp?.data ?? []) as ComprobanteEntradaAjuste[];
  },

  async obtenerDetalleComprobanteEntrada(recepcionId: string): Promise<ComprobanteEntradaDetalle> {
    const resp = await apiFetch(`/api/inventario/compras/recepciones/${encodeURIComponent(recepcionId)}/detalle`, {
      method: 'GET',
    });
    return resp?.data as ComprobanteEntradaDetalle;
  },

  async registrarTraslado(payload: {
    sku: string;
    bodegaOrigen: string;
    bodegaDestino: string;
    cantidad: number;
    tipoMovimientoConfigId?: string;
    motivo?: string;
    documentoRelacionado?: { tipo: string; numero: string };
  }): Promise<{ salida: InventarioMovimiento; entrada: InventarioMovimiento }> {
    const resp = await apiFetch('/api/inventario/movimientos/traslado', { method: 'POST', body: payload });
    return resp?.data as { salida: InventarioMovimiento; entrada: InventarioMovimiento };
  },

  async listarTiposAjuste(): Promise<InventarioTipoAjuste[]> {
    const resp = await apiFetch('/api/inventario/ajustes/tipos', { method: 'GET' });
    return (resp?.data ?? []) as InventarioTipoAjuste[];
  },

  async listarTiposAjusteAdmin(): Promise<InventarioTipoAjuste[]> {
    const resp = await apiFetch('/api/inventario/ajustes/tipos/admin', { method: 'GET' });
    return (resp?.data ?? []) as InventarioTipoAjuste[];
  },

  async listarTodosTiposAjuste(): Promise<InventarioTipoAjuste[]> {
    const resultados = await Promise.allSettled([
      this.listarTiposAjuste(),
      this.listarTiposAjusteAdmin(),
    ]);
    const exitosos = resultados
      .filter((resultado): resultado is PromiseFulfilledResult<InventarioTipoAjuste[]> =>
        resultado.status === 'fulfilled')
      .flatMap((resultado) => resultado.value);

    if (exitosos.length === 0) {
      const rechazado = resultados.find(
        (resultado): resultado is PromiseRejectedResult => resultado.status === 'rejected',
      );
      throw rechazado?.reason ?? new Error('No se pudieron cargar los tipos de ajuste.');
    }

    const porCodigo = new Map<string, InventarioTipoAjuste>();
    for (const tipo of exitosos) {
      const codigo = String(tipo?.codigo || '').trim().toUpperCase();
      if (!codigo) continue;
      porCodigo.set(codigo, { ...porCodigo.get(codigo), ...tipo, codigo });
    }
    return [...porCodigo.values()].sort((a, b) =>
      String(a.nombre || a.codigo).localeCompare(String(b.nombre || b.codigo), 'es'),
    );
  },

  async crearTipoAjuste(payload: {
    codigo?: string;
    nombre: string;
    direccion: TipoAjuste;
    descripcion?: string;
    tipoMovimientoId: string;
    estado?: boolean;
  }): Promise<InventarioApiResult<InventarioTipoAjuste>> {
    const resp = await apiFetch('/api/inventario/ajustes/tipos', { method: 'POST', body: payload }) as ApiResponsePayload<InventarioTipoAjuste>;
    return { data: resp.data as InventarioTipoAjuste, msg: resp.msg };
  },

  async actualizarTipoAjuste(
    codigo: string,
    payload: {
      nombre?: string;
      direccion?: TipoAjuste;
      descripcion?: string;
      tipoMovimientoId?: string;
      estado?: boolean;
    }
  ): Promise<InventarioApiResult<InventarioTipoAjuste>> {
    const resp = await apiFetch(`/api/inventario/ajustes/tipos/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<InventarioTipoAjuste>;
    return { data: resp.data as InventarioTipoAjuste, msg: resp.msg };
  },

  async eliminarTipoAjuste(codigo: string): Promise<InventarioApiResult<{ codigo: string }>> {
    const resp = await apiFetch(`/api/inventario/ajustes/tipos/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    }) as ApiResponsePayload<{ codigo: string }>;
    return { data: resp.data as { codigo: string }, msg: resp.msg };
  },

  async listarCausalesAjuste(): Promise<InventarioCausalAjuste[]> {
    const resp = await apiFetch('/api/inventario/ajustes/causales', { method: 'GET' });
    return (resp?.data ?? []) as InventarioCausalAjuste[];
  },

  async listarCausalesAjusteAdmin(): Promise<InventarioCausalAjuste[]> {
    const resp = await apiFetch('/api/inventario/ajustes/causales/admin', { method: 'GET' });
    return (resp?.data ?? []) as InventarioCausalAjuste[];
  },

  async crearCausalAjuste(payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
    estado?: boolean;
  }): Promise<InventarioApiResult<InventarioCausalAjuste>> {
    const resp = await apiFetch('/api/inventario/ajustes/causales', { method: 'POST', body: payload }) as ApiResponsePayload<InventarioCausalAjuste>;
    return { data: resp.data as InventarioCausalAjuste, msg: resp.msg };
  },

  async actualizarCausalAjuste(
    codigo: string,
    payload: {
      nombre?: string;
      descripcion?: string;
      estado?: boolean;
    }
  ): Promise<InventarioApiResult<InventarioCausalAjuste>> {
    const resp = await apiFetch(`/api/inventario/ajustes/causales/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: payload,
    }) as ApiResponsePayload<InventarioCausalAjuste>;
    return { data: resp.data as InventarioCausalAjuste, msg: resp.msg };
  },

  async eliminarCausalAjuste(codigo: string): Promise<InventarioApiResult<{ codigo: string }>> {
    const resp = await apiFetch(`/api/inventario/ajustes/causales/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
    }) as ApiResponsePayload<{ codigo: string }>;
    return { data: resp.data as { codigo: string }, msg: resp.msg };
  },

  async listarAjustes(params: { estado?: EstadoAjuste | ''; sku?: string } = {}): Promise<AjusteInventario[]> {
    const resp = await apiFetch(`/api/inventario/ajustes${buildQuery(params)}`, { method: 'GET' });
    return (resp?.data ?? []) as AjusteInventario[];
  },

  async solicitarAjuste(payload: AjustePayload): Promise<InventarioApiResult<AjusteInventario>> {
    const resp = await apiFetch('/api/inventario/ajustes', { method: 'POST', body: payload }) as ApiResponsePayload<AjusteInventario>;
    return { data: resp.data as AjusteInventario, msg: resp.msg };
  },

  async aprobarAjuste(id: string): Promise<InventarioApiResult<AjusteInventario>> {
    const resp = await apiFetch(`/api/inventario/ajustes/${id}/aprobar`, { method: 'POST' }) as ApiResponsePayload<AjusteInventario>;
    return { data: resp.data as AjusteInventario, msg: resp.msg };
  },

  async rechazarAjuste(id: string, motivoRechazo: string): Promise<InventarioApiResult<AjusteInventario>> {
    const resp = await apiFetch(`/api/inventario/ajustes/${id}/rechazar`, {
      method: 'POST',
      body: { motivoRechazo },
    }) as ApiResponsePayload<AjusteInventario>;
    return { data: resp.data as AjusteInventario, msg: resp.msg };
  },

  async stockActual(params?: { bodega?: string; sku?: string }): Promise<StockActualItem[]> {
    const resp = await apiFetch(
      `/api/inventario/reportes/stock-actual${buildQuery({ bodega: params?.bodega, sku: params?.sku })}`,
      { method: 'GET' },
    );
    return (resp?.data ?? []) as StockActualItem[];
  },
};

export default inventarioService;
