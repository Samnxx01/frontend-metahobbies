import { apiFetch, apiFetchPublic } from './api';
import type { Product as ComponentProduct } from '../../types/components';

// ── Tipos del backend ──────────────────────────────────────────────────────

export interface BackendCategoria {
  iud: string;
  nombre: string;
  descripcion?: string;
  nivel: number;
  padre?: string;
  estado: boolean;
}

export interface BackendProducto {
  iud: string;
  sku?: string;
  nombre: string;
  descripcion?: string;
  descripcionCorta?: string;
  precio: number;
  moneda: string;
  tipo: string;
  categoria?: BackendCategoria | string | null;
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
    id: p.iud,
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

const productosService = {

  /** Lista categorías activas del catálogo */
  async listarCategorias(): Promise<BackendCategoria[]> {
    const resp = await apiFetchPublic('/api/productos/categorias');
    return (resp?.data ?? []) as BackendCategoria[];
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
