import { apiFetch } from './api';

// ── Tipos de respuesta ────────────────────────────────────────────────────────

export interface DianEstadoResponse {
  ok: boolean;
  esValida: boolean;
  cufe: string;
  codigoEstado: string;
  descripcion: string;
  mensajeError?: string | null;
  raw?: Record<string, unknown>;
}

export interface DianConsultaCufeResponse {
  ok: boolean;
  data: DianEstadoResponse;
}

export interface DianConsultaXmlResponse {
  ok: boolean;
  cufe: string;
  data: DianEstadoResponse;
}

export interface DianEnvioLineaPayload {
  id: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  iva: number;
}

export interface DianEnvioPruebaPayload {
  numFac: string;
  fecFac: string;
  horFac: string;
  valFac: number;
  valIva: number;
  valTot: number;
  ofe: { nit: string; nombre: string; ciudad: string; departamento: string; pais: string; direccion: string; email: string };
  adq: { nit: string; nombre: string; ciudad: string; pais: string; direccion: string; email: string };
  lineas: DianEnvioLineaPayload[];
}

export interface DianEnvioResponse {
  ok: boolean;
  data: {
    ok: boolean;
    zipKey?: string;
    statusCode?: string;
    statusDescription?: string;
    error?: string;
    rawResponse?: Record<string, unknown>;
  };
}

export interface DianZipEstadoResponse {
  ok: boolean;
  data: {
    ok: boolean;
    status: string;
    errores?: string[];
    raw?: unknown[];
  };
}

// ── Trazabilidad ─────────────────────────────────────────────────────────────

export type DianTrazabilidadTipoEvento =
  | 'ENVIO_INICIADO'
  | 'ENVIO_EXITOSO'
  | 'ENVIO_FALLIDO'
  | 'REINTENTO'
  | 'CONSULTA_ESTADO'
  | 'CONSULTA_CUFE'
  | 'ACEPTADA_DIAN'
  | 'RECHAZADA_DIAN';

export interface DianTrazabilidadEvento {
  iud: string;
  tenantId: string;
  electronicInvoiceId?: string | null;
  invoiceNumber?: string | null;
  cufe?: string | null;
  tipoEvento: DianTrazabilidadTipoEvento;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  zipKey?: string | null;
  mensaje?: string | null;
  rawResponse?: unknown;
  origen: 'AUTOMATIC' | 'MANUAL' | 'API';
  usuarioId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DianTrazabilidadListResponse {
  ok: boolean;
  total: number;
  data: DianTrazabilidadEvento[];
}

export interface DianTrazabilidadFiltros {
  tipoEvento?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  skip?: number;
}

export interface DianReenvioResponse {
  ok: boolean;
  data?: {
    iud: string;
    invoiceNumber: string;
    cufe: string;
    transmission: {
      status: string;
      requestedAt: string | null;
      attempts: number;
    };
  };
  msg?: string;
}

// ── Llamadas API ──────────────────────────────────────────────────────────────

/** GET /api/dian/consultar/:cufe — consulta una factura por su CUFE (GetStatus) */
export const consultarCufe = async (cufe: string): Promise<DianConsultaCufeResponse> => {
  return apiFetch(`/api/dian/consultar/${encodeURIComponent(cufe.trim())}`, {
    method: 'GET',
  });
};

/** POST /api/dian/consultar/xml — extrae el CUFE del XML y consulta DIAN */
export const consultarDesdeXml = async (xml: string): Promise<DianConsultaXmlResponse> => {
  return apiFetch('/api/dian/consultar/xml', {
    method: 'POST',
    body: { xml },
  });
};

/** POST /api/dian/test/enviar — genera XML, firma, envía al set de pruebas DIAN */
export const enviarFacturaPrueba = async (
  payload: DianEnvioPruebaPayload,
): Promise<DianEnvioResponse> => {
  return apiFetch('/api/dian/test/enviar', {
    method: 'POST',
    body: payload,
  });
};

/** GET /api/dian/test/estado/:zipKey — consulta estado del ZIP enviado */
export const consultarEstadoZip = async (zipKey: string): Promise<DianZipEstadoResponse> => {
  return apiFetch(`/api/dian/test/estado/${encodeURIComponent(zipKey.trim())}`, {
    method: 'GET',
  });
};

/** GET /api/dian/trazabilidad — historial de eventos del tenant (filtros opcionales) */
export const listarTrazabilidadTenant = async (
  filtros: DianTrazabilidadFiltros = {},
): Promise<DianTrazabilidadListResponse> => {
  const params = new URLSearchParams();
  if (filtros.tipoEvento) params.set('tipoEvento', filtros.tipoEvento);
  if (filtros.desde) params.set('desde', filtros.desde);
  if (filtros.hasta) params.set('hasta', filtros.hasta);
  if (filtros.limit) params.set('limit', String(filtros.limit));
  if (filtros.skip) params.set('skip', String(filtros.skip));
  const qs = params.toString();
  return apiFetch(`/api/dian/trazabilidad${qs ? `?${qs}` : ''}`, { method: 'GET' });
};

/** GET /api/dian/trazabilidad/factura/:electronicInvoiceId — historial de una factura */
export const listarTrazabilidadPorFactura = async (
  electronicInvoiceId: string,
): Promise<DianTrazabilidadListResponse> => {
  return apiFetch(`/api/dian/trazabilidad/factura/${encodeURIComponent(electronicInvoiceId.trim())}`, {
    method: 'GET',
  });
};

/** GET /api/dian/trazabilidad/cufe/:cufe — historial de eventos por CUFE */
export const listarTrazabilidadPorCufe = async (
  cufe: string,
): Promise<DianTrazabilidadListResponse> => {
  return apiFetch(`/api/dian/trazabilidad/cufe/${encodeURIComponent(cufe.trim())}`, {
    method: 'GET',
  });
};

/**
 * POST /api/invoices/:id/transmit — solicita (re)envío a la DIAN de una factura electrónica
 * ya registrada (colección `invoiceElectronic`). Genera un evento ENVIO_INICIADO en la
 * trazabilidad y dispara la transmisión real de forma asíncrona en el backend.
 */
export const reenviarTransmisionDian = async (
  electronicInvoiceId: string,
): Promise<DianReenvioResponse> => {
  return apiFetch(`/api/invoices/${encodeURIComponent(electronicInvoiceId.trim())}/transmit`, {
    method: 'POST',
  });
};
