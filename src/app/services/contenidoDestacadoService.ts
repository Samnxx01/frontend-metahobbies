import { apiFetch, apiFetchPublic } from '@/app/services/api';

import {
  buildPublicidadImagenUrl,
  resolvePublicidadImageId,
} from '@/app/utils/normalizeImageRenderUrl';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Código del tipo de publicidad. Los cuatro base vienen sembrados, pero el
 * catálogo es parametrizable, así que se admite cualquier código.
 */
export type PublicidadPresentacion = 'SECCION' | 'WIDGET' | 'MODAL' | 'CARRUSEL' | (string & {});

/** Layout base con el que se dibuja un tipo de publicidad. */
export type PublicidadRender = 'SECCION' | 'TARJETA' | 'MODAL' | 'CARRUSEL' | 'BANNER';

/** Anclaje en pantalla del contenido flotante (cuadrícula de 9 posiciones). */
export type PublicidadPosicion =
  | 'SUPERIOR_IZQUIERDA' | 'SUPERIOR_CENTRO' | 'SUPERIOR_DERECHA'
  | 'CENTRO_IZQUIERDA' | 'CENTRO' | 'CENTRO_DERECHA'
  | 'INFERIOR_IZQUIERDA' | 'INFERIOR_CENTRO' | 'INFERIOR_DERECHA';

/** Parámetros de visualización del tipo: definen cómo se ve en la interfaz. */
export type TipoPublicidadVisual = {
  render?: PublicidadRender;
  /** true: flota sobre la página; false: se plasma en el flujo del contenido. */
  flotante?: boolean;
  posicion?: PublicidadPosicion;
  /**
   * Ancho máximo en pantallas grandes (cualquier valor CSS). En móvil y tablet
   * la tarjeta se adapta sola al ancho disponible.
   */
  ancho?: string;
  cerrable?: boolean;
};

/** Tipo del catálogo parametrizable (colección tipoPublicidad). */
export type TipoPublicidad = {
  iud?: string;
  _id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  camposRequeridos?: string[];
  visual?: TipoPublicidadVisual;
  estado?: boolean;
};

const TIPOS_URL = `${API_BASE_URL}/configuration/contenido/tipos`;
const ETIQUETAS_URL = `${API_BASE_URL}/configuration/contenido/etiquetas`;

/** Etiquetas en uso por los registros de publicidad. */
export const listarEtiquetasPublicidad = async (): Promise<string[]> => {
  try {
    const response = await apiFetch(ETIQUETAS_URL, { method: 'GET' });
    return Array.isArray(response?.etiquetas) ? response.etiquetas : [];
  } catch {
    return [];
  }
};

/**
 * Renombra una etiqueta y propaga el nuevo valor a todos los registros que la
 * usaban, para que ninguno quede con el valor anterior.
 */
export const renombrarEtiquetaPublicidad = (
  actual: string,
  nueva: string
): Promise<{ ok: boolean; msg: string; etiqueta: string; actualizados: number }> =>
  apiFetch(`${ETIQUETAS_URL}/renombrar`, { method: 'PUT', body: { actual, nueva } });

/** Catálogo activo de tipos: alimenta los selectores del panel. */
export const obtenerTiposPublicidad = async (): Promise<TipoPublicidad[]> => {
  try {
    const response = await apiFetchPublic(`${TIPOS_URL}/activos`, { method: 'GET' });
    return Array.isArray(response?.tipos) ? response.tipos : [];
  } catch {
    return [];
  }
};

/** Catálogo completo (incluye inactivos): solo para la administración del catálogo. */
export const listarTiposPublicidad = async (): Promise<TipoPublicidad[]> => {
  const response = await apiFetch(TIPOS_URL, { method: 'GET' });
  return Array.isArray(response?.tipos) ? response.tipos : [];
};

export type TipoPublicidadPayload = {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  orden?: number;
  estado?: boolean;
  visual?: TipoPublicidadVisual;
};

export const crearTipoPublicidad = (payload: TipoPublicidadPayload): Promise<{ ok: boolean; tipo: TipoPublicidad }> =>
  apiFetch(TIPOS_URL, { method: 'POST', body: payload });

export const actualizarTipoPublicidad = (
  id: string,
  payload: TipoPublicidadPayload
): Promise<{ ok: boolean; tipo: TipoPublicidad }> =>
  apiFetch(`${TIPOS_URL}/${id}`, { method: 'PUT', body: payload });

export const eliminarTipoPublicidad = (id: string): Promise<{ ok: boolean; msg: string }> =>
  apiFetch(`${TIPOS_URL}/${id}`, { method: 'DELETE' });

/** Diapositiva de un carrusel: contenido propio dentro del mismo registro. */
export type PublicidadDiapositiva = {
  tittle?: string;
  subtittle?: string;
  body?: string;
  price?: string;
  buttonText?: string;
  buttonLink?: string;
  img?: { _id?: string; iud?: string; id?: string; nombre?: string; mimetype?: string } | string | null;
  orden?: number;
};

/** Máximo de diapositivas parametrizables por registro. */
export const MAX_DIAPOSITIVAS_PUBLICIDAD = 4;

/** Relación del contenido con la paleta vigente al momento de guardarlo. */
export type TrazabilidadColor = {
  paletaTipo?: 'GLOBAL' | 'RUTA';
  paletaRuta?: { _id?: string; iud?: string; nombre?: string; activa?: boolean } | string | null;
  coloresApp?: string | null;
  /** Colores fijos usados; `tokenEquivalente` indica si coinciden con la paleta. */
  personalizados?: Array<{ valor?: string; tokenEquivalente?: string | null }>;
  actualizadoEl?: string | null;
};

export type PublicidadModal = {
  iud?: string;
  _id?: string;
  tittle?: string;
  subtittle?: string;
  body?: string;
  etiqueta?: string;
  presentacion?: PublicidadPresentacion;
  seccionRuta?: { _id?: string; iud?: string; name?: string; path?: string } | string | null;
  seccionPath?: string;
  puntosClave?: string[];
  tokensColor?: string[];
  trazabilidadColor?: TrazabilidadColor;
  price?: string | number;
  buttonText?: string;
  buttonLink?: string;
  estado?: boolean;
  prioridad?: number;
  scope?: {
    tipo?: 'GENERAL' | 'TENANT_RUTA';
    tenantGlobal?: any;
    tenantCorporativo?: any;
    rutasSeguridad?: any[];
    rutasPaths?: string[];
  };
  img?: {
    _id?: string;
    id?: string;
    nombre?: string;
    mimetype?: string;
    createdAt?: string;
  } | string | null;
  /** Galería del registro: hasta 4 imágenes. */
  imagenes?: Array<{ _id?: string; iud?: string; id?: string; nombre?: string; mimetype?: string } | string>;
  /** Diapositivas con contenido propio (carrusel). */
  diapositivas?: PublicidadDiapositiva[];
};

const getPublicidadImageId = (publicidad: PublicidadModal): string =>
  resolvePublicidadImageId(publicidad.img);

export const getPublicidadImageUrl = (publicidad: PublicidadModal): string => {
  const imageId = getPublicidadImageId(publicidad);
  return imageId ? buildPublicidadImagenUrl(imageId) : '';
};

/** Máximo de imágenes por registro; debe coincidir con MAX_IMAGENES del backend. */
export const MAX_IMAGENES_PUBLICIDAD = 4;

/** URL de la imagen propia de una diapositiva. */
export const getDiapositivaImageUrl = (diapositiva: PublicidadDiapositiva): string => {
  const id = resolvePublicidadImageId(diapositiva?.img as never);
  return id ? buildPublicidadImagenUrl(id) : '';
};

/**
 * URLs de la galería del registro (hasta 4). Si el registro es anterior a la
 * galería, devuelve la imagen principal para no perder el contenido.
 */
export const getPublicidadImageUrls = (publicidad: PublicidadModal): string[] => {
  const urls = (publicidad.imagenes || [])
    .map((img) => resolvePublicidadImageId(img))
    .filter(Boolean)
    .map((id) => buildPublicidadImagenUrl(id))
    .filter(Boolean);

  if (urls.length) return urls.slice(0, MAX_IMAGENES_PUBLICIDAD);

  const principal = getPublicidadImageUrl(publicidad);
  return principal ? [principal] : [];
};

/**
 * Lista de contenidos activos para una ruta: la consume el carrusel, donde
 * cada registro es una diapositiva ordenada por prioridad.
 */
export const obtenerPublicidadesActivas = async (params?: {
  path?: string;
  seccionPath?: string;
  etiqueta?: string;
  presentacion?: PublicidadPresentacion;
  limite?: number;
  comoVisitante?: boolean;
}): Promise<PublicidadModal[]> => {
  try {
    const search = new URLSearchParams();
    if (params?.path) search.set('path', params.path);
    if (params?.seccionPath) search.set('seccionPath', params.seccionPath);
    if (params?.etiqueta) search.set('etiqueta', params.etiqueta);
    if (params?.presentacion) search.set('presentacion', params.presentacion);
    if (params?.limite) search.set('limite', String(params.limite));

    const url = `${API_BASE_URL}/configuration/contenido/destacado/lista${search.toString() ? `?${search}` : ''}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = (token && !params?.comoVisitante)
      ? await apiFetch(url, { method: 'GET', useAuth: true, logoutOn401: false })
      : await apiFetchPublic(url, { method: 'GET' });

    return Array.isArray(response?.publicidades) ? response.publicidades : [];
  } catch (error: any) {
    if (String(error?.message || '').includes('[404]')) return [];
    throw error;
  }
};

export const obtenerPublicidadModalActiva = async (params?: {
  path?: string;
  seccionPath?: string;
  etiqueta?: string;
  /**
   * Consulta sin token aunque haya sesión abierta: resuelve como lo haría un
   * visitante anónimo. Lo usa la vista previa del panel, porque con sesión de
   * admin la gobernanza puede excluir los registros de alcance GENERAL.
   */
  comoVisitante?: boolean;
}): Promise<PublicidadModal | null> => {
  try {
    const search = new URLSearchParams();
    if (params?.path) search.set('path', params.path);
    if (params?.seccionPath) search.set('seccionPath', params.seccionPath);
    if (params?.etiqueta) search.set('etiqueta', params.etiqueta);
    // Path neutro: un path con "publicidad" es cancelado por los bloqueadores
    // de anuncios del navegador antes de salir (net::ERR_BLOCKED_BY_CLIENT).
    const url = `${API_BASE_URL}/configuration/contenido/destacado/activo${search.toString() ? `?${search}` : ''}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = (token && !params?.comoVisitante)
      ? await apiFetch(url, {
        method: 'GET',
        useAuth: true,
        logoutOn401: false,
      })
      : await apiFetchPublic(url, {
      method: 'GET',
    });
    return response?.publicidad ?? null;
  } catch (error: any) {
    if (String(error?.message || '').includes('[404]')) return null;
    throw error;
  }
};
