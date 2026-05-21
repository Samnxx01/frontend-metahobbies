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
}

// ── Mapeo backend → ComponentProduct (para ProductCard) ───────────────────

const PLACEHOLDER = 'https://placehold.co/400x320/f3f4f6/a3a3a3?text=Producto';

export function mapProducto(p: BackendProducto): ComponentProduct {
  const cat = typeof p.categoria === 'object' && p.categoria !== null
    ? p.categoria.nombre
    : (typeof p.categoria === 'string' ? p.categoria : p.tipo);

  return {
    id: String(p.iud || p._id || p.id || ''),
    name: p.nombre,
    description: p.descripcionCorta || p.descripcion || '',
    price: p.precio,
    image: Array.isArray(p.imagenes) && p.imagenes.length > 0 ? p.imagenes[0] : PLACEHOLDER,
    category: cat || '',
  };
}

// ── Servicio ───────────────────────────────────────────────────────────────

export interface FiltrosProductos {
  categoria?: string;
  tipo?: string;
  estadoCatalogo?: string;
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
    });
    return productos.map(mapProducto);
  },
};

export default productosService;
