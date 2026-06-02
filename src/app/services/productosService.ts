import { apiFetch, apiFetchPublic } from './api';
import type { Product as ComponentProduct } from '../../types/components';

// ── Tipos del backend ──────────────────────────────────────────────────────

export interface CategoriaMedia {
  _id?: string;
  iud?: string;
  tipo: 'image' | 'video';
  url: string;
  duracionSegundos?: number | null;
  mimetype?: string;
}

export interface BackendCategoria {
  _id?: string;
  iud?: string;
  id?: string;
  nombre: string;
  descripcion?: string;
  nivel: number;
  padre?: string | BackendCategoria | null;
  estado: boolean;
  media?: CategoriaMedia | null;
}

export interface BackendTipoProducto {
  _id?: string;
  iud?: string;
  id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  base?: boolean;
}

export interface CategoriaPayload {
  nombre: string;
  descripcion?: string;
  padre?: string | null;
}

export interface TipoProductoPayload {
  nombre: string;
  codigo?: string;
  descripcion?: string;
}

export interface BackendProducto {
  _id?: string;
  iud?: string;
  id?: string;
  sku?: string;
  codigoBarras?: string;
  nombre: string;
  descripcion?: string;
  descripcionCorta?: string;
  precio: number;
  moneda: string;
  tipo: string;
  categoria?: BackendCategoria | string | null;
  unidadMedida?: string;
  stockMinimo?: number;
  fechaVencimiento?: string | null;
  peso?: number | null;
  imagenes?: string[];
  estadoCatalogo: string;
  estadoProducto: boolean;
  productoVentaRelacion?: {
    _id?: string;
    iud?: string;
    productoVentaId: string;
    productoOrigenId: string | BackendProducto;
    productoOrigen?: BackendProducto | string | null;
    manejaVentas: boolean;
    destacado?: boolean;
    nombre?: string;
    descripcion?: string;
    descripcionCorta?: string;
    precio?: number;
    moneda?: string;
    tipo?: string;
    categoria?: BackendCategoria | string | null;
    unidadMedida?: string;
    stockMinimo?: number;
    imagenes?: string[];
    cantidadColoresRender?: number;
    coloresPermitidos?: Array<{ nombre?: string; valor: string }>;
    reglasContables?: Array<{ codigo: string; aplica?: boolean; reglaContableId?: string | null }>;
    media?: ProductoVentaMedia[];
    estado: boolean;
  } | null;
}

export interface ProductoVentaMedia {
  _id?: string;
  iud?: string;
  tipo: 'image' | 'video';
  nombreDocumento: string;
  mimetype: string;
  size: number;
  duracionSegundos?: number | null;
  principal: boolean;
  url: string;
}

// ── Mapeo backend → ComponentProduct (para ProductCard) ───────────────────

const PLACEHOLDER = 'https://placehold.co/400x320/f3f4f6/a3a3a3?text=Producto';

const CATEGORY_IMAGES: Record<string, string> = {
  maquillaje: '/assets/images/products/product1.png',
  labiales: '/assets/images/products/product2.png',
  brochas: '/assets/images/products/product3.png',
  base: '/assets/images/products/product4.png',
  'cuidado facial': '/assets/images/products/product5.png',
  cabello: '/assets/images/products/product3.png',
  uñas: '/assets/images/products/product5.png',
};

export function getCategoriaId(cat: BackendCategoria, index = 0): string {
  return String(cat.iud || cat._id || cat.id || `cat-${index}`);
}

export function getCategoryImage(nombre: string): string {
  const key = String(nombre || '').toLowerCase();
  const match = Object.keys(CATEGORY_IMAGES).find((k) => key.includes(k));
  return CATEGORY_IMAGES[match ?? ''] ?? '/assets/images/products/product1.png';
}

/** Resuelve query ?categoria= (id o nombre legado) al ObjectId de categoría. */
export function resolverCategoriaDesdeQuery(
  param: string | null | undefined,
  categorias: BackendCategoria[]
): string | undefined {
  const raw = String(param || '').trim();
  if (!raw) return undefined;

  const byId = categorias.find((c) => getCategoriaId(c) === raw);
  if (byId) return getCategoriaId(byId);

  const norm = raw.toLowerCase();
  const byName = categorias.find(
    (c) => String(c.nombre || '').toLowerCase() === norm
      || String(c.nombre || '').toLowerCase().replace(/\s+/g, '-') === norm
  );
  return byName ? getCategoriaId(byName) : raw;
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const mediaSrc = (url: string): string => {
  const value = String(url || '').trim();
  if (!value || value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (!value.startsWith('/api') || !API_BASE_URL.startsWith('http')) return value;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${value}`;
};

export const mapCategoriaConMediaUrl = (cat: BackendCategoria): BackendCategoria => {
  if (!cat.media?.url) return cat;
  return {
    ...cat,
    media: {
      ...cat.media,
      url: mediaSrc(cat.media.url),
    },
  };
};

export function mapProducto(p: BackendProducto): ComponentProduct {
  const relacion = p.productoVentaRelacion;
  const categoriaRelacion = relacion?.categoria ?? p.categoria;
  const cat = typeof categoriaRelacion === 'object' && categoriaRelacion !== null
    ? categoriaRelacion.nombre
    : (typeof categoriaRelacion === 'string' ? categoriaRelacion : relacion?.tipo || p.tipo);
  const imagenesRelacion = Array.isArray(relacion?.imagenes) ? relacion.imagenes : [];
  const imagenesProducto = Array.isArray(p.imagenes) ? p.imagenes : [];

  return {
    id: String(p.iud || p._id || p.id || ''),
    name: relacion?.nombre || p.nombre,
    description: relacion?.descripcionCorta || relacion?.descripcion || p.descripcionCorta || p.descripcion || '',
    price: Number(relacion?.precio ?? p.precio ?? 0),
    image: imagenesRelacion[0] ? mediaSrc(imagenesRelacion[0]) : imagenesProducto[0] ? mediaSrc(imagenesProducto[0]) : PLACEHOLDER,
    category: cat || '',
  };
}

// ── Servicio ───────────────────────────────────────────────────────────────

export interface FiltrosProductos {
  categoria?: string;
  tipo?: string;
  estadoCatalogo?: string;
  destacado?: boolean;
}

export interface AdminProductoPayload {
  nombre: string;
  sku?: string;
  codigoBarras?: string;
  descripcion?: string;
  descripcionCorta?: string;
  precio: number;
  moneda: string;
  tipo: string;
  categoria?: string | null;
  unidadMedida?: string;
  stockMinimo?: number;
  fechaVencimiento?: string | null;
  peso?: number | null;
  imagenes?: string[];
  estadoCatalogo?: string;
  productoOrigenId?: string | null;
  manejaVentas?: boolean;
  destacado?: boolean;
  cantidadColoresRender?: number;
  coloresPermitidos?: Array<{ nombre?: string; valor: string }>;
  reglasContables?: Array<{ codigo: string; aplica?: boolean; reglaContableId?: string | null }>;
}

const productosService = {

  /** Lista categorías activas del catálogo */
  async listarCategorias(): Promise<BackendCategoria[]> {
    const resp = await apiFetchPublic('/api/productos/categorias');
    const rows = (resp?.data ?? []) as BackendCategoria[];
    return rows.map(mapCategoriaConMediaUrl);
  },

  async subirMediaCategoria(
    categoriaId: string,
    file: File,
    duracionSegundos?: number
  ): Promise<CategoriaMedia> {
    const formData = new FormData();
    formData.append('media', file);
    if (typeof duracionSegundos === 'number') {
      formData.append('duracionSegundos', String(duracionSegundos));
    }
    const resp = await apiFetch(`/api/productos/categorias/${categoriaId}/media`, {
      method: 'POST',
      body: formData,
    });
    const media = resp?.data as CategoriaMedia;
    return { ...media, url: mediaSrc(media.url) };
  },

  async listarTiposProducto(): Promise<BackendTipoProducto[]> {
    const resp = await apiFetchPublic('/api/productos/tipos');
    return (resp?.data ?? []) as BackendTipoProducto[];
  },

  async crearCategoria(payload: CategoriaPayload): Promise<BackendCategoria> {
    const resp = await apiFetch('/api/productos/categorias', {
      method: 'POST',
      body: payload,
    });
    return resp?.data as BackendCategoria;
  },

  async crearTipoProducto(payload: TipoProductoPayload): Promise<BackendTipoProducto> {
    const resp = await apiFetch('/api/productos/tipos', {
      method: 'POST',
      body: payload,
    });
    return resp?.data as BackendTipoProducto;
  },

  /** Lista productos con filtros opcionales */
  async listarProductos(filtros: FiltrosProductos = {}): Promise<BackendProducto[]> {
    const params = new URLSearchParams();
    if (filtros.categoria) params.set('categoria', filtros.categoria);
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.estadoCatalogo) params.set('estadoCatalogo', filtros.estadoCatalogo);
    if (typeof filtros.destacado === 'boolean') params.set('destacado', String(filtros.destacado));

    const query = params.toString() ? `?${params.toString()}` : '';
    const resp = await apiFetchPublic(`/api/productos/listar${query}`);
    return (resp?.data ?? []) as BackendProducto[];
  },

  async listarProductosAdmin(filtros: FiltrosProductos = {}): Promise<BackendProducto[]> {
    const params = new URLSearchParams();
    if (filtros.categoria) params.set('categoria', filtros.categoria);
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.estadoCatalogo) params.set('estadoCatalogo', filtros.estadoCatalogo);
    const query = params.toString() ? `?${params.toString()}` : '';
    const resp = await apiFetch(`/api/productos/listar${query}`, { method: 'GET' });
    return (resp?.data ?? []) as BackendProducto[];
  },

  async listarProductosVentasAdmin(): Promise<BackendProducto[]> {
    const resp = await apiFetch('/api/productos/admin/ventas/listar', { method: 'GET' });
    return (resp?.data ?? []) as BackendProducto[];
  },

  async obtenerProductoPublico(id: string): Promise<BackendProducto> {
    const resp = await apiFetchPublic(`/api/productos/detalle/${id}`, { method: 'GET' });
    return resp?.data as BackendProducto;
  },

  async obtenerProductoAdmin(id: string): Promise<BackendProducto> {
    const resp = await apiFetch(`/api/productos/admin/${id}`, { method: 'GET' });
    return resp?.data as BackendProducto;
  },

  async crearProductoAdmin(payload: AdminProductoPayload): Promise<BackendProducto> {
    const resp = await apiFetch('/api/productos/admin/crear', { method: 'POST', body: payload });
    return resp?.data as BackendProducto;
  },

  async actualizarProductoAdmin(id: string, payload: Partial<AdminProductoPayload>): Promise<BackendProducto> {
    const resp = await apiFetch(`/api/productos/admin/${id}`, { method: 'PUT', body: payload });
    return resp?.data as BackendProducto;
  },

  async subirMediaProductoVenta(relacionId: string, file: File, duracionSegundos?: number): Promise<ProductoVentaMedia> {
    const formData = new FormData();
    formData.append('media', file);
    if (typeof duracionSegundos === 'number') formData.append('duracionSegundos', String(duracionSegundos));
    const resp = await apiFetch(`/api/productos/admin/ventas/${relacionId}/media`, {
      method: 'POST',
      body: formData,
    });
    return resp?.data as ProductoVentaMedia;
  },

  async desactivarProductoAdmin(id: string): Promise<void> {
    await apiFetch(`/api/productos/admin/desactivar/${id}`, { method: 'DELETE' });
  },

  async eliminarProductoAdmin(id: string): Promise<void> {
    await apiFetch(`/api/productos/admin/eliminar/${id}`, { method: 'DELETE' });
  },

  /** Lista productos mapeados directamente a ComponentProduct */
  async listarParaHome(categoriaId?: string): Promise<ComponentProduct[]> {
    const productos = await productosService.listarProductos({
      categoria: categoriaId,
      estadoCatalogo: 'ACTIVO',
      destacado: true,
    });
    return productos.map(mapProducto);
  },

  /** Catálogo público (/productos) con filtro opcional por categoría. */
  async listarParaCatalogo(categoriaId?: string): Promise<ComponentProduct[]> {
    const productos = await productosService.listarProductos({
      categoria: categoriaId,
      estadoCatalogo: 'ACTIVO',
    });
    return productos
      .filter((p) => p.estadoProducto !== false)
      .map(mapProducto);
  },
};

export default productosService;
