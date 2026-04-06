import { apiFetch } from './api';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PaletaRutaColores {
  colorFondo: string;
  colorFondoSecundario: string;
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
  colorTextoSecundario: string;
  colorNavbar: string;
  colorNavbarTexto: string;
  colorBotonPrimario: string;
  colorBotonPrimarioTexto: string;
  colorBotonSecundario: string;
  colorBotonSecundarioTexto: string;
  colorBorde: string;
  colorSombra: string;
}

export interface ImgFondoConfig {
  url: string | null;
  opacidad: number;
  tamaño: 'cover' | 'contain' | 'auto';
  posicion: string;
  repetir: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
}

export interface BotonesConfig {
  animacion: 'none' | 'pulse' | 'bounce' | 'shake' | 'glow' | 'scale';
  bordeRadio: string;
  sombra: boolean;
  grosorBorde: string;
}

export interface RutaInfo {
  _id: string;
  name: string;
  path: string;
  component: string | null;
  icon: string | null;
}

export interface PaletaRuta {
  iud: string;
  rutaId: RutaInfo;
  nombre: string;
  activa: boolean;
  colores: PaletaRutaColores;
  imgFondo: ImgFondoConfig;
  botonesConfig: BotonesConfig;
  createdAt: string;
}

// ─── Tipos de respuesta ───────────────────────────────────────────────────────

export interface ListarPaletasResponse {
  ok: boolean;
  paletas: PaletaRuta[];
  total: number;
  pagina: number;
  limite: number;
}

export interface PaletaResponse {
  ok: boolean;
  paleta: PaletaRuta;
}

export interface PaletaMutationResponse {
  ok: boolean;
  msg: string;
  paleta: PaletaRuta;
}

export interface EliminarResponse {
  ok: boolean;
  msg: string;
}

export interface RutasResponse {
  ok: boolean;
  rutas: RutaInfo[];
}

export interface PreviewConfig {
  colores?: Partial<PaletaRutaColores>;
  imgFondo?: Partial<ImgFondoConfig>;
  botonesConfig?: Partial<BotonesConfig>;
}

export interface PreviewResponse {
  ok: boolean;
  config: PreviewConfig;
}

// ─── Valores por defecto exportables ─────────────────────────────────────────

export const DEFAULT_COLORES: PaletaRutaColores = {
  colorFondo: '#ffffff',
  colorFondoSecundario: '#f8f9fa',
  colorPrimario: '#C43670',
  colorSecundario: '#F283AF',
  colorTexto: '#1a1a2e',
  colorTextoSecundario: '#6c757d',
  colorNavbar: '#C43670',
  colorNavbarTexto: '#ffffff',
  colorBotonPrimario: '#C43670',
  colorBotonPrimarioTexto: '#ffffff',
  colorBotonSecundario: '#F283AF',
  colorBotonSecundarioTexto: '#ffffff',
  colorBorde: '#dee2e6',
  colorSombra: '#00000020',
};

export const DEFAULT_IMG_FONDO: ImgFondoConfig = {
  url: null,
  opacidad: 1,
  tamaño: 'cover',
  posicion: 'center center',
  repetir: 'no-repeat',
};

export const DEFAULT_BOTONES_CONFIG: BotonesConfig = {
  animacion: 'none',
  bordeRadio: '0.375rem',
  sombra: false,
  grosorBorde: '1px',
};

// ─── Service functions ────────────────────────────────────────────────────────

const BASE = '/api/paleta-rutas';

export const listarPaletas = (
  pagina = 1,
  limite = 20
): Promise<ListarPaletasResponse> =>
  apiFetch(`${BASE}?pagina=${pagina}&limite=${limite}`, { method: 'GET' });

export const obtenerPorRuta = (rutaId: string): Promise<PaletaResponse> =>
  apiFetch(`${BASE}/ruta/${rutaId}`, { method: 'GET' });

export const obtenerPorId = (id: string): Promise<PaletaResponse> =>
  apiFetch(`${BASE}/${id}`, { method: 'GET' });

export const crearPaleta = (
  data: Partial<PaletaRuta> & { rutaId: string; nombre: string }
): Promise<PaletaMutationResponse> =>
  apiFetch(BASE, { method: 'POST', body: data });

export const actualizarPaleta = (
  id: string,
  data: Partial<PaletaRuta>
): Promise<PaletaMutationResponse> =>
  apiFetch(`${BASE}/${id}`, { method: 'PUT', body: data });

export const eliminarPaleta = (id: string): Promise<EliminarResponse> =>
  apiFetch(`${BASE}/${id}`, { method: 'DELETE' });

export const listarRutasConPaleta = (): Promise<RutasResponse> =>
  apiFetch(`${BASE}/rutas/con-paleta`, { method: 'GET' });

export const listarRutasSinPaleta = (): Promise<RutasResponse> =>
  apiFetch(`${BASE}/rutas/sin-paleta`, { method: 'GET' });

export const previewPaleta = (config: PreviewConfig): Promise<PreviewResponse> =>
  apiFetch(`${BASE}/preview`, { method: 'POST', body: config });
