import { apiFetch } from './api';

export type MetodoValuacion = 'PROMEDIO' | 'FIFO';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'REVERSA';
export type MotivoMovimiento = 'COMPRA' | 'VENTA' | 'MERMA' | 'DANO' | 'ERROR_CONTEO' | 'PERDIDA' | 'REVERSA' | 'OTRO';
export type TipoAjuste = 'POSITIVO' | 'NEGATIVO';
export type EstadoAjuste = 'SOLICITADO' | 'APROBADO' | 'RECHAZADO';

export interface InventarioConfig {
  _id?: string;
  metodoValuacion: MetodoValuacion;
  metodoBloqueadoDesdeAnioFiscal?: number | null;
  periodosCerrados: string[];
}

export interface DocumentoRelacionado {
  tipo: string;
  numero: string;
  idExterno?: string | null;
}

export interface UbicacionInventario {
  pasillo?: string | null;
  estante?: string | null;
  nivel?: string | null;
  descripcion?: string;
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
  motivo: MotivoMovimiento;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  metodoValuacionAplicado: MetodoValuacion;
  bodega: string;
  ubicacion?: UbicacionInventario;
  documentoRelacionado: DocumentoRelacionado;
  referenciaMovimientoOriginal?: string | null;
  esReversion: boolean;
  hashPrevio?: string | null;
  hashIntegridad: string;
  createdAt?: string;
}

export interface MovimientoPayload {
  sku: string;
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

  async listarBodegas(): Promise<BodegaInventario[]> {
    const resp = await apiFetch('/api/inventario/bodegas', { method: 'GET' });
    return (resp?.data ?? []) as BodegaInventario[];
  },

  async crearBodega(payload: { nombre: string; descripcion?: string }): Promise<BodegaInventario> {
    const resp = await apiFetch('/api/inventario/bodegas', { method: 'POST', body: payload });
    return resp?.data as BodegaInventario;
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
