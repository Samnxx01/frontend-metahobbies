import { apiFetch, apiFetchPublic } from './api';
import type { Product as ComponentProduct } from '../../types/components';

// ── Tipos del backend ──────────────────────────────────────────────────────

export interface BackendCategoria {
  _id?: string;
  iud?: string;
  id?: string;
  nombre: string;
  descripcion?: string;
  nivel: number;
  padre?: string | BackendCategoria | null;
  estado: boolean;
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
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const mediaSrc = (url: string): string => {
  const value = String(url || '').trim();
  if (!value || value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (!value.startsWith('/api') || !API_BASE_URL.startsWith('http')) return value;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${value}`;
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
    return (resp?.data ?? []) as BackendCategoria[];
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
};

export default productosService;
