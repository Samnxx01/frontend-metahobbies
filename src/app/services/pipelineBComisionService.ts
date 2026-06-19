import { apiFetch } from './api';

export type PipelineBComisionUsuario = {
  id: string;
  correo: string | null;
  verificado?: boolean;
  cuentaActiva?: boolean;
};

export type PipelineBComisionItem = {
  productoId: string | null;
  subtotal: number;
  reglaCodigo: string | null;
  reglaAplica: boolean | null;
  reglaValor: number | null;
  baseComisionable: number;
  montoComisionTotal: number;
};

export type PipelineBComisionRegistro = {
  id: string;
  referenciaPersonalizada: string | null;
  estado: 'pendiente' | 'procesada' | string;
  origenComision: string;
  montoBase: number;
  montoComisionTotal: number;
  fecha: string | null;
  attributionId: string | null;
  ventaReferenciaId: string | null;
  auditoriaPagoId: string | null;
  carritoId: string | null;
  invoiceId: string | null;
  referidoId: string | null;
  sponsor: PipelineBComisionUsuario | null;
  comprador: PipelineBComisionUsuario | null;
  producto: {
    id: string;
    nombre: string | null;
    tipo: string | null;
    moneda: string;
    precio: number;
  } | null;
  items: PipelineBComisionItem[];
  cadenaReferidos?: PipelineBCadenaReferidoNodo[];
  vouchersArbol?: PipelineBVoucherArbol[];
};

export type PipelineBCadenaReferidoNodo = {
  orden: number;
  gen: number;
  userId: string | null;
  correo: string | null;
  rol: 'sponsor' | 'comprador' | string;
  bypassMembresia?: boolean;
};

export type PipelineBVoucherArbol = {
  gen: number;
  percent: number;
  sponsorUserId: string | null;
  sponsorCorreo: string | null;
  montoGanado: number;
  montoBaseComision: number;
  bypassMembresia?: boolean;
  materializado?: boolean;
  contadorComisiId: string | null;
};

export type PipelineBComisionFlujoPaso = {
  paso: number;
  clave: string;
  label: string;
  descripcion: string;
  count: number;
};

export type PipelineBComisionLineaProducto = {
  productoId: string;
  nombre: string | null;
  sku: string | null;
  tipo: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotalCobrado: number;
  moneda: string;
  reglaCodigo: string | null;
  reglaAplica: boolean | null;
  reglaValor: number | null;
  baseComisionable: number;
  comisionPotencial: number;
  desgloseArbolPorGen?: Array<{ gen: number; percent: number; monto: number }>;
  comisionMaterializada: number;
  comisionEstado: 'materializada' | 'pendiente' | 'registrada_sin_monto' | string;
  motivoSinRegla?: string | null;
  aplicaComision?: boolean;
  ventaReferenciaId?: string;
  ventaReferencia?: string | null;
  referenciaPago?: string | null;
  auditoriaPagoId?: string | null;
  carritoId?: string | null;
  confirmadaEn?: string | null;
};

export type PipelineBProductoAgregado = {
  productoId: string;
  nombre: string | null;
  sku: string | null;
  tipo: string | null;
  reglaCodigo: string | null;
  reglaValor: number | null;
  reglaAplica: boolean | null;
  cantidadLineas: number;
  cantidadUnidades: number;
  montoCobradoTotal: number;
  baseComisionableTotal: number;
  comisionPotencialTotal: number;
  comisionMaterializadaTotal: number;
  ventasReferencias: string[];
  motivoSinRegla?: string | null;
};

export type PipelineBVentaDetalle = {
  ventaReferenciaId: string;
  ventaReferencia: string | null;
  referenciaPago: string | null;
  montoVenta: number;
  moneda: string;
  confirmadaEn: string | null;
  comisionMaterializada: boolean;
  comisionId: string | null;
  lineasConRegla: PipelineBComisionLineaProducto[];
  lineasSinRegla: PipelineBComisionLineaProducto[];
  totales: {
    montoCobrado: number;
    comisionPotencial: number;
    comisionMaterializada: number;
  };
};

export type PipelineBDetalleProductos = {
  kpiProductos: {
    ventasEnFlujo: number;
    lineasConRegla: number;
    lineasSinRegla: number;
    productosUnicosConRegla: number;
    productosUnicosSinRegla: number;
    montoCobradoConRegla: number;
    montoCobradoSinRegla: number;
    baseComisionableTotal: number;
    comisionPotencialTotal: number;
    comisionMaterializadaTotal: number;
  };
  arbolComision?: {
    originType: string;
    configurado: boolean;
    levels: Array<{ gen: number; percent: number }>;
  };
  productosConRegla: PipelineBProductoAgregado[];
  productosSinRegla: PipelineBProductoAgregado[];
  lineasConRegla: PipelineBComisionLineaProducto[];
  lineasSinRegla: PipelineBComisionLineaProducto[];
  ventas: PipelineBVentaDetalle[];
};

export type PipelineBComisionDashboard = {
  kpi: {
    comisionesRegistradas: number;
    comisionesProcesadas: number;
    comisionesPendientes: number;
    montoBaseTotal: number;
    montoComisionTotal: number;
    comisionMaterializadaTotal?: number;
  };
  funnel: {
    atribuciones: {
      total: number;
      active: number;
      resolved: number;
      expired: number;
    };
    carritosEnlace: number;
    ventasReferencia: number;
    ventasConfirmadas: number;
    comisionesMaterializadas: number;
  };
  flujo: PipelineBComisionFlujoPaso[];
  registros: PipelineBComisionRegistro[];
  detalleProductos: PipelineBDetalleProductos;
  paginacion: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filtros: {
    estado: string;
    anio: number | null;
    mes: number | null;
    dia: number | null;
  };
  sincronizacionPipelineB?: {
    ok?: boolean;
    msg?: string;
    sincronizadas?: number;
    materializadas?: number;
    omitidas?: number;
    totalVentas?: number;
    pipelineA?: {
      ok?: boolean;
      msg?: string;
      sincronizadas?: number;
      materializadas?: number;
      omitidas?: number;
    } | null;
  } | null;
};

export type PipelineBComisionQuery = {
  page?: number;
  limit?: number;
  estado?: 'all' | 'procesada' | 'pendiente';
  anio?: number;
  mes?: number;
  dia?: number;
  sincronizar?: boolean;
};

export type PipelineBReencolarPayload = {
  scan?: boolean;
  limit?: number;
  fixOrigen?: boolean;
  dryRun?: boolean;
  carritoId?: string;
  auditoriaId?: string;
  referencia?: string;
};

export type PipelineBReencolarDetalle = {
  referencia: string | null;
  auditoriaId: string;
  ok: boolean;
  omitido: boolean;
  created: number;
  msg: string | null;
};

export type PipelineBReencolarResult = {
  ok: boolean;
  msg: string;
  evaluadas: number;
  procesadas: number;
  omitidas: number;
  comisionesCreadas: number;
  errores?: number;
  dryRun?: boolean;
  detalle: PipelineBReencolarDetalle[];
};

const buildQuery = (params: PipelineBComisionQuery = {}): string => {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.estado) search.set('estado', params.estado);
  if (params.anio) search.set('anio', String(params.anio));
  if (params.mes) search.set('mes', String(params.mes));
  if (params.dia) search.set('dia', String(params.dia));
  if (params.sincronizar) search.set('sincronizar', 'true');
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

const pipelineBComisionService = {
  async obtenerDashboard(params: PipelineBComisionQuery = {}): Promise<PipelineBComisionDashboard> {
    const response = await apiFetch(`/api/comisiones-pipeline-b/dashboard${buildQuery(params)}`, {
      method: 'GET',
    });
    return response?.data as PipelineBComisionDashboard;
  },

  async reencolar(payload: PipelineBReencolarPayload = {}): Promise<PipelineBReencolarResult> {
    const response = await apiFetch('/api/comisiones-pipeline-b/reencolar', {
      method: 'POST',
      body: {
        scan: payload.scan ?? true,
        limit: payload.limit ?? 50,
        fixOrigen: payload.fixOrigen ?? true,
        dryRun: payload.dryRun ?? false,
        carritoId: payload.carritoId,
        auditoriaId: payload.auditoriaId,
        referencia: payload.referencia,
      },
    });
    return (response?.data ?? response) as PipelineBReencolarResult;
  },
};

export default pipelineBComisionService;
