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
  tipoCategoria?: 'PADRE' | 'SUBCATEGORIA';
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
  /** Formato para impresion/escaneo resuelto por el backend (EAN13 o CODE128). */
  formatoCodigoBarras?: 'EAN13' | 'CODE128' | null;
  /** Indica si el codigo actual es escaneable con pistola laser. */
  codigoBarrasEscaneable?: boolean;
  nombre: string;
  descripcion?: string;
  descripcionCorta?: string;
  precio: number;
  moneda: string;
  tipo: string;
  categoria?: BackendCategoria | string | null;
  subcategoria?: BackendCategoria | string | null;
  unidadMedida?: string;
  stockMinimo?: number;
  fechaVencimiento?: string | null;
  peso?: number | null;
  imagenes?: string[];
  estadoCatalogo: string;
  estadoProducto: boolean;
  productoVentaRelacionId?: string | null;
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
    monedaId?: string | null;
    tipo?: string;
    categoria?: BackendCategoria | string | null;
    subcategoria?: BackendCategoria | string | null;
    unidadMedida?: string;
    stockMinimo?: number;
    imagenes?: string[];
    cantidadColoresRender?: number;
    coloresPermitidos?: Array<{ nombre?: string; valor: string }>;
    reglasContables?: Array<{ codigo: string; aplica?: boolean; reglaContableId?: string | null }>;
    reglasVentas?: Array<{ codigo: string; aplica?: boolean; reglaVentaId?: string | null; valor?: number; comportamiento?: string | null }>;
    media?: ProductoVentaMedia[];
    estado: boolean;
  } | null;
}

export interface StockDisponiblePorBodega {
  bodega: string;
  cantidadDisponible: number;
  costoPromedioUnitario: number;
}

export interface ProductoConStock extends BackendProducto {
  stockDisponible: {
    total: number;
    porBodega: StockDisponiblePorBodega[];
  };
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

export function getCategoriaId(cat: BackendCategoria, index = 0): string {
  return String(cat.iud || cat._id || cat.id || `cat-${index}`);
}

export function getCategoriaPadreId(cat: BackendCategoria): string | null {
  const padre = cat.padre;
  if (!padre) return null;
  if (typeof padre === 'string') return padre;
  return String(padre.iud || padre._id || padre.id || '').trim() || null;
}

export function esCategoriaPadre(cat: BackendCategoria): boolean {
  return cat.tipoCategoria === 'PADRE' || Number(cat.nivel) === 1;
}

export function esSubcategoriaDe(cat: BackendCategoria, categoriaPadreId: string): boolean {
  return (cat.tipoCategoria === 'SUBCATEGORIA' || Number(cat.nivel) === 2)
    && getCategoriaPadreId(cat) === String(categoriaPadreId || '');
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

export function getProductoVentaRelacionId(producto: BackendProducto | null | undefined): string {
  const resolveId = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
      const row = value as { iud?: unknown; _id?: unknown; id?: unknown };
      return resolveId(row.iud ?? row._id ?? row.id);
    }
    return '';
  };

  const direct = resolveId(producto?.productoVentaRelacionId);
  if (direct) return direct;

  const relacion = producto?.productoVentaRelacion;
  if (!relacion) return '';
  if (typeof relacion === 'string') return relacion.trim();
  return resolveId(relacion.iud ?? relacion._id ?? relacion.id);
}

export function getProductoDescripcionCompleta(p: BackendProducto): string {
  const relacion = p.productoVentaRelacion;
  return String(
    p.descripcion
    || relacion?.descripcion
    || p.descripcionCorta
    || relacion?.descripcionCorta
    || '',
  ).trim();
}

export function mapProducto(p: BackendProducto): ComponentProduct {
  const relacion = p.productoVentaRelacion;
  const subcategoriaRelacion = relacion?.subcategoria ?? p.subcategoria;
  const nombreSubcategoria = typeof subcategoriaRelacion === 'object' && subcategoriaRelacion !== null
    ? subcategoriaRelacion.nombre
    : '';
  const imagenesRelacion = Array.isArray(relacion?.imagenes) ? relacion.imagenes : [];
  const imagenesProducto = Array.isArray(p.imagenes) ? p.imagenes : [];
  const precioOriginal = Number(relacion?.precio ?? p.precio ?? 0);
  const reglaDescuento = (relacion?.reglasVentas || []).find((regla) => {
    const comportamiento = String(regla.comportamiento || '').toUpperCase();
    const codigo = String(regla.codigo || '').toUpperCase();
    return regla.aplica !== false && (
      comportamiento === 'DESCUENTO_PORCENTAJE' ||
      comportamiento === 'DESCUENTO_FIJO' ||
      (!comportamiento && codigo.startsWith('DESCUENTO'))
    );
  });
  const valorDescuento = Math.max(0, Number(reglaDescuento?.valor || 0));
  const esPorcentaje = String(reglaDescuento?.comportamiento || '').toUpperCase() === 'DESCUENTO_PORCENTAJE';
  const descuentoMonto = reglaDescuento
    ? Math.min(precioOriginal, esPorcentaje ? precioOriginal * valorDescuento / 100 : valorDescuento)
    : 0;
  const porcentajeDescuento = precioOriginal > 0 && descuentoMonto > 0
    ? Math.round((descuentoMonto / precioOriginal) * 10000) / 100
    : 0;

  return {
    id: String(p.iud || p._id || p.id || ''),
    name: relacion?.nombre || p.nombre,
    description: relacion?.descripcionCorta || relacion?.descripcion || p.descripcionCorta || p.descripcion || '',
    price: Math.max(0, precioOriginal - descuentoMonto),
    originalPrice: descuentoMonto > 0 ? precioOriginal : undefined,
    discount: porcentajeDescuento > 0 ? porcentajeDescuento : undefined,
    image: imagenesRelacion[0] ? mediaSrc(imagenesRelacion[0]) : imagenesProducto[0] ? mediaSrc(imagenesProducto[0]) : PLACEHOLDER,
    category: nombreSubcategoria,
  };
}

// ── Servicio ───────────────────────────────────────────────────────────────

export interface ProductoCatalogoLimites {
  nombreMax: number;
  descripcionMax: number;
  descripcionCortaMax: number;
  miniCartSidePanelThreshold: number;
  miniCartMaxProductos: number;
}

export interface BackendProductoActualizado extends BackendProducto {
  cambiosReglasVentas?: Array<{
    codigo: string;
    valorAnterior: number | null;
    valorNuevo: number;
  }>;
  sincronizarCarritoRecomendado?: boolean;
}

export interface ProductoPrecioHistorialItem {
  iud?: string;
  productoId: string;
  sku: string;
  precioAnterior: number;
  precioNuevo: number;
  moneda: string;
  usuarioId?: { correo?: string; nombre_cliente?: string } | string | null;
  ipOrigen?: string | null;
  fechaEjecucion: string;
}

export interface FiltrosProductos {
  categoria?: string;
  tipo?: string;
  estadoCatalogo?: string;
  destacado?: boolean;
  resumenInventario?: boolean;
}

export interface AdminProductoPayload {
  nombre: string;
  sku?: string;
  /** Codigo de barras manual (8-14 alfanumerico). Si se omite, el backend lo genera. */
  codigoBarras?: string;
  /** Alias de codigoBarras en el payload. */
  codigo?: string;
  descripcion?: string;
  descripcionCorta?: string;
  precio: number;
  moneda: string;
  monedaId?: string | null;
  tipo: string;
  categoria?: string | null;
  subcategoria?: string | null;
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
  reglasVentas?: Array<{ codigo: string; aplica?: boolean; reglaVentaId?: string | null; valor?: number; comportamiento?: string | null }>;
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

  async actualizarCategoria(
    id: string,
    payload: { nombre?: string; descripcion?: string; estado?: boolean }
  ): Promise<BackendCategoria> {
    const resp = await apiFetch(`/api/productos/categorias/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    });
    return resp?.data as BackendCategoria;
  },

  /** Elimina solo si no tiene subcategorías, productos ni reglas contables asociadas (409 si está en uso). */
  async eliminarCategoria(id: string): Promise<{ msg?: string }> {
    const resp = await apiFetch(`/api/productos/categorias/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { msg: resp?.msg };
  },

  async crearTipoProducto(payload: TipoProductoPayload): Promise<BackendTipoProducto> {
    const resp = await apiFetch('/api/productos/tipos', {
      method: 'POST',
      body: payload,
    });
    return resp?.data as BackendTipoProducto;
  },

  async actualizarTipoProducto(id: string, payload: TipoProductoPayload): Promise<BackendTipoProducto> {
    const resp = await apiFetch(`/api/productos/tipos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    });
    return resp?.data as BackendTipoProducto;
  },

  async eliminarTipoProducto(id: string): Promise<void> {
    await apiFetch(`/api/productos/tipos/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
    if (filtros.resumenInventario) params.set('resumenInventario', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    const resp = await apiFetch(`/api/productos/listar${query}`, { method: 'GET' });
    return (resp?.data ?? []) as BackendProducto[];
  },

  async listarCatalogoPublico(filtros: Pick<FiltrosProductos, 'categoria' | 'destacado'> = {}): Promise<BackendProducto[]> {
    const params = new URLSearchParams();
    if (filtros.categoria) params.set('categoria', filtros.categoria);
    if (typeof filtros.destacado === 'boolean') params.set('destacado', String(filtros.destacado));
    const query = params.toString() ? `?${params.toString()}` : '';
    const resp = await apiFetchPublic(`/api/productos/catalogo${query}`);
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

  /** Detalle completo (producto + categoría + relación de venta + stock disponible) por código de barras escaneado. */
  async buscarProductoPorCodigoBarras(codigoBarras: string): Promise<ProductoConStock> {
    const resp = await apiFetch(`/api/productos/admin/buscar-por-codigo?codigoBarras=${encodeURIComponent(codigoBarras)}`, { method: 'GET' });
    return resp?.data as ProductoConStock;
  },

  async crearProductoAdmin(payload: AdminProductoPayload): Promise<BackendProducto> {
    const resp = await apiFetch('/api/productos/admin/crear', { method: 'POST', body: payload });
    return resp?.data as BackendProducto;
  },

  async actualizarProductoAdmin(id: string, payload: Partial<AdminProductoPayload>): Promise<BackendProductoActualizado> {
    const resp = await apiFetch(`/api/productos/admin/${id}`, { method: 'PUT', body: payload });
    return resp?.data as BackendProductoActualizado;
  },

  async obtenerHistorialPrecioProducto(id: string): Promise<{ total: number; data: ProductoPrecioHistorialItem[] }> {
    const resp = await apiFetch(`/api/productos/admin/${id}/historial-precio?limit=50`, { method: 'GET' });
    return { total: Number(resp?.total || 0), data: (resp?.data || []) as ProductoPrecioHistorialItem[] };
  },

  async obtenerLimitesCatalogo(): Promise<ProductoCatalogoLimites> {
    const resp = await apiFetch('/api/productos/admin/catalogo-config/limites', { method: 'GET' });
    return resp?.data as ProductoCatalogoLimites;
  },

  async actualizarLimitesCatalogo(payload: Partial<ProductoCatalogoLimites>): Promise<ProductoCatalogoLimites> {
    const resp = await apiFetch('/api/productos/admin/catalogo-config/limites', { method: 'PUT', body: payload });
    return resp?.data as ProductoCatalogoLimites;
  },

  async obtenerMiniCartConfigPublico(): Promise<{ sidePanelThreshold: number; maxVisibleProducts: number }> {
    const resp = await apiFetch('/api/productos/catalogo-config/mini-carrito', {
      method: 'GET',
      useAuth: false,
      logoutOn401: false,
    });
    return resp?.data as { sidePanelThreshold: number; maxVisibleProducts: number };
  },

  async subirMediaProductoVenta(
    relacionId: string,
    file: File,
    options: { duracionSegundos?: number; principal?: boolean } = {},
  ): Promise<ProductoVentaMedia> {
    const formData = new FormData();
    formData.append('media', file);
    if (typeof options.duracionSegundos === 'number') {
      formData.append('duracionSegundos', String(options.duracionSegundos));
    }
    if (options.principal === false) {
      formData.append('principal', 'false');
    }
    const resp = await apiFetch(`/api/productos/admin/ventas/${relacionId}/media`, {
      method: 'POST',
      body: formData,
    });
    return resp?.data as ProductoVentaMedia;
  },

  async eliminarMediaProductoVenta(mediaId: string): Promise<void> {
    await apiFetch(`/api/productos/admin/ventas/media/${mediaId}`, { method: 'DELETE' });
  },

  async desactivarProductoAdmin(id: string): Promise<void> {
    await apiFetch(`/api/productos/admin/desactivar/${id}`, { method: 'DELETE' });
  },

  async eliminarProductoAdmin(id: string): Promise<void> {
    await apiFetch(`/api/productos/admin/eliminar/${id}`, { method: 'DELETE' });
  },

  async exportarProductosExcel(filtros: { tipo?: string } = {}): Promise<void> {
    const params = new URLSearchParams();
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    const query = params.toString();
    const response = await apiFetch(`/api/productos/admin/exportar/excel${query ? `?${query}` : ''}`, {
      method: 'GET',
      responseType: 'raw',
    }) as Response;
    if (!response.ok) {
      let msg = 'No se pudo exportar el catalogo.';
      try {
        const json = await response.json();
        if (typeof json?.msg === 'string') msg = json.msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filtros.tipo ? `productos-${filtros.tipo}.xlsx` : 'productos.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  },

  async importarProductosExcel(file: File): Promise<{
    total: number;
    insertados: number;
    errores: { fila: number; error: string }[];
    secuencia: { codigo: string; contadorAnterior: number; contadorNuevo: number; incrementados: number } | null;
  }> {
    const formData = new FormData();
    formData.append('archivo', file);
    const resp = await apiFetch('/api/productos/admin/importar/excel', {
      method: 'POST',
      body: formData,
    });
    return resp as {
      total: number;
      insertados: number;
      errores: { fila: number; error: string }[];
      secuencia: { codigo: string; contadorAnterior: number; contadorNuevo: number; incrementados: number } | null;
    };
  },

  async listarCodigosBarrasRegistrados(): Promise<Set<string>> {
    const resp = await apiFetch('/api/productos/admin/codigos-barras/registrados', { method: 'GET' }) as { data: string[] };
    return new Set(resp.data);
  },

  async eliminarCodigoBarrasAdmin(id: string): Promise<void> {
    await apiFetch(`/api/productos/admin/${id}/codigo-barras`, { method: 'DELETE' });
  },

  /** Lista productos mapeados directamente a ComponentProduct */
  async listarParaHome(categoriaId?: string): Promise<ComponentProduct[]> {
    const productos = await productosService.listarCatalogoPublico({
      categoria: categoriaId,
      destacado: true,
    });
    return productos.map(mapProducto);
  },

  /** Catálogo público (/productos) con filtro opcional por categoría. */
  async listarParaCatalogo(categoriaId?: string): Promise<ComponentProduct[]> {
    const productos = await productosService.listarCatalogoPublico({
      categoria: categoriaId,
      destacado: categoriaId ? undefined : true,
    });
    return productos
      .filter((p) => p.estadoProducto !== false)
      .map(mapProducto);
  },

  /** Consolida productos de una categoría padre y sus subcategorías sin duplicados. */
  async listarParaCatalogoCategorias(categoriaIds: string[]): Promise<ComponentProduct[]> {
    const ids = Array.from(new Set(categoriaIds.map(String).filter(Boolean)));
    if (!ids.length) return productosService.listarParaCatalogo();

    const grupos = await Promise.all(ids.map((categoria) =>
      productosService.listarParaCatalogo(categoria)
    ));
    const unicos = new Map<string, ComponentProduct>();
    grupos.flat().forEach((producto) => {
      unicos.set(String(producto.id), producto);
    });
    return Array.from(unicos.values());
  },
};

export default productosService;
