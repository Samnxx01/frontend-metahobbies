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
};

export type PipelineBComisionFlujoPaso = {
  paso: number;
  clave: string;
  label: string;
  descripcion: string;
  count: number;
};

export type PipelineBComisionDashboard = {
  kpi: {
    comisionesRegistradas: number;
    comisionesProcesadas: number;
    comisionesPendientes: number;
    montoBaseTotal: number;
    montoComisionTotal: number;
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
};

export type PipelineBComisionQuery = {
  page?: number;
  limit?: number;
  estado?: 'all' | 'procesada' | 'pendiente';
  anio?: number;
  mes?: number;
  dia?: number;
};

const buildQuery = (params: PipelineBComisionQuery = {}): string => {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.estado) search.set('estado', params.estado);
  if (params.anio) search.set('anio', String(params.anio));
  if (params.mes) search.set('mes', String(params.mes));
  if (params.dia) search.set('dia', String(params.dia));
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
};

export default pipelineBComisionService;
