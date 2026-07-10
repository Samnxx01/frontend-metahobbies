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
