import { apiFetch } from './api';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';

const CART_SESSION_KEY = 'mabs_cart_session_id';

const getCartSessionId = (): string => {
  const current = localStorage.getItem(CART_SESSION_KEY);
  if (current) return current;

  const generated = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(CART_SESSION_KEY, generated);
  return generated;
};

const cartFetch = (endpoint: string, options: Parameters<typeof apiFetch>[1]) =>
  apiFetch(endpoint, {
    ...options,
    logoutOn401: false,
    headers: {
      ...(options.headers || {}),
      'x-session-id': getCartSessionId(),
    },
  });

// ── Tipos del backend ──────────────────────────────────────────────────────

export interface BackendCartItem {
  _id: string;
  iud?: string;
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

export interface BackendCartTaxDetail {
  codigo: string;
  nombre: string;
  tipo: string;
  tarifa: number;
  montoFijo: number;
  baseCalculo: string;
  base: number;
  valor: number;
  codigoDian?: string;
}

export interface BackendCart {
  _id: string;
  iud?: string;
  items: BackendCartItem[];
  codigoDescuentoAplicado?: string;
  descuentoCodigo?: DescuentoCodigo;
  subtotal: number;
  totalDescuentoCodigo: number;
  totalImpuestos?: number;
  detalleImpuestos?: BackendCartTaxDetail[];
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

const normalizeCartItem = (item: BackendCartItem): BackendCartItem => ({
  ...item,
  _id: String(item._id || item.iud || ''),
});

const normalizeCart = (cart: BackendCart): BackendCart => ({
  ...cart,
  _id: String(cart._id || cart.iud || ''),
  items: Array.isArray(cart.items) ? cart.items.map(normalizeCartItem) : [],
});

// ── Servicio ───────────────────────────────────────────────────────────────

const carritoService = {

  /** Obtiene el carrito ACTIVO del usuario o crea uno nuevo */
  async obtenerOCrear(): Promise<BackendCart> {
    const resp = await cartFetch('/api/carrito', { method: 'GET' });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Agrega un producto al carrito */
  async agregarItem(carritoId: string, productoId: string, cantidad: number): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/items`, {
      method: 'POST',
      body: { productoId, cantidad },
    });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Actualiza la cantidad de un ítem */
  async actualizarCantidad(carritoId: string, itemId: string, cantidad: number): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/items/${itemId}`, {
      method: 'PUT',
      body: { cantidad },
    });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Elimina un ítem del carrito */
  async eliminarItem(carritoId: string, itemId: string): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/items/${itemId}`, {
      method: 'DELETE',
    });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Vacía todos los ítems del carrito */
  async vaciar(carritoId: string): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/vaciar`, { method: 'DELETE' });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Aplica un código de descuento */
  async aplicarDescuento(carritoId: string, codigo: string): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/descuento`, {
      method: 'POST',
      body: { codigo },
    });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Remueve el código de descuento */
  async removerDescuento(carritoId: string): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/descuento`, { method: 'DELETE' });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Sincroniza precios y stock con inventario actual */
  async sincronizar(carritoId: string): Promise<{ carrito: BackendCart; alertas: CartAlerta[] }> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/sincronizar`, { method: 'POST' });
    return { carrito: normalizeCart(resp.carrito as BackendCart), alertas: (resp.alertas ?? []) as CartAlerta[] };
  },

  /** Guarda datos de facturacion de usuario registrado o invitado */
  async guardarDatosFacturacion(carritoId: string, datosFacturacion: DatosFacturacionInvitado): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/facturacion`, {
      method: 'POST',
      body: { datosFacturacion },
    });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Ejecuta el checkout: descuenta inventario y cierra el carrito */
  async checkout(carritoId: string, datosFacturacion?: DatosFacturacionInvitado | null): Promise<CheckoutResult> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/checkout`, {
      method: 'POST',
      body: datosFacturacion ? { datosFacturacion } : {},
    });
    return {
      ...resp,
      carrito: normalizeCart(resp.carrito as BackendCart),
    } as CheckoutResult;
  },

  /** Cancela el carrito */
  async cancelar(carritoId: string): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/cancelar`, { method: 'POST' });
    return normalizeCart(resp.data as BackendCart);
  },
};

export default carritoService;
