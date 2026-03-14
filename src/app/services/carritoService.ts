import { apiFetch } from './api';

// ── Tipos del backend ──────────────────────────────────────────────────────

export interface BackendCartItem {
  _id: string;
  productoId: string;
  sku: string;
  nombre: string;
  tipo: string;
  precioUnitario: number;
  precioActual: number;
  cantidad: number;
  descuentoItem: { tipo: 'PORCENTAJE' | 'FIJO' | 'NINGUNO'; valor: number };
  subtotalBruto: number;
  subtotalNeto: number;
  stockDisponible: number;
  stockSuficiente: boolean;
}

export interface DescuentoCodigo {
  tipo: 'PORCENTAJE' | 'FIJO';
  valor: number;
  descripcion: string;
}

export interface BackendCart {
  _id: string;
  items: BackendCartItem[];
  codigoDescuentoAplicado?: string;
  descuentoCodigo?: DescuentoCodigo;
  subtotal: number;
  totalDescuentoCodigo: number;
  total: number;
  estado: 'ACTIVO' | 'ABANDONADO' | 'COMPLETADO' | 'CANCELADO';
  moneda: string;
}

export interface CartAlerta {
  sku: string;
  tipo: 'PRECIO_CAMBIADO' | 'STOCK_INSUFICIENTE';
  mensaje: string;
}

export interface CheckoutResult {
  ventaReferencia: string;
  total: number;
  carrito: BackendCart;
}

// ── Servicio ───────────────────────────────────────────────────────────────

const carritoService = {

  /** Obtiene el carrito ACTIVO del usuario o crea uno nuevo */
  async obtenerOCrear(): Promise<BackendCart> {
    const resp = await apiFetch('/api/carrito', { method: 'GET' });
    return resp.data as BackendCart;
  },

  /** Agrega un producto al carrito */
  async agregarItem(carritoId: string, productoId: string, cantidad: number): Promise<BackendCart> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/items`, {
      method: 'POST',
      body: { productoId, cantidad },
    });
    return resp.data as BackendCart;
  },

  /** Actualiza la cantidad de un ítem */
  async actualizarCantidad(carritoId: string, itemId: string, cantidad: number): Promise<BackendCart> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/items/${itemId}`, {
      method: 'PUT',
      body: { cantidad },
    });
    return resp.data as BackendCart;
  },

  /** Elimina un ítem del carrito */
  async eliminarItem(carritoId: string, itemId: string): Promise<BackendCart> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/items/${itemId}`, {
      method: 'DELETE',
    });
    return resp.data as BackendCart;
  },

  /** Vacía todos los ítems del carrito */
  async vaciar(carritoId: string): Promise<BackendCart> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/vaciar`, { method: 'DELETE' });
    return resp.data as BackendCart;
  },

  /** Aplica un código de descuento */
  async aplicarDescuento(carritoId: string, codigo: string): Promise<BackendCart> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/descuento`, {
      method: 'POST',
      body: { codigo },
    });
    return resp.data as BackendCart;
  },

  /** Remueve el código de descuento */
  async removerDescuento(carritoId: string): Promise<BackendCart> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/descuento`, { method: 'DELETE' });
    return resp.data as BackendCart;
  },

  /** Sincroniza precios y stock con inventario actual */
  async sincronizar(carritoId: string): Promise<{ carrito: BackendCart; alertas: CartAlerta[] }> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/sincronizar`, { method: 'POST' });
    return { carrito: resp.carrito as BackendCart, alertas: (resp.alertas ?? []) as CartAlerta[] };
  },

  /** Ejecuta el checkout: descuenta inventario y cierra el carrito */
  async checkout(carritoId: string): Promise<CheckoutResult> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/checkout`, { method: 'POST' });
    return resp as CheckoutResult;
  },

  /** Cancela el carrito */
  async cancelar(carritoId: string): Promise<BackendCart> {
    const resp = await apiFetch(`/api/carrito/${carritoId}/cancelar`, { method: 'POST' });
    return resp.data as BackendCart;
  },
};

export default carritoService;
