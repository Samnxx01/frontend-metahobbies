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

const cartFetch = (endpoint: string, options: Parameters<typeof apiFetch>[1]) => {
  const hasToken = Boolean(localStorage.getItem('token'));
  return apiFetch(endpoint, {
    ...options,
    useAuth: options.useAuth ?? hasToken,
    logoutOn401: false,
    headers: {
      ...(options.headers || {}),
      'x-session-id': getCartSessionId(),
    },
  });
};

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
  wompiCheckoutUrl: string;
  reference: string;
  auditoriaId?: string;
  ventaReferencia?: string;
  facturaId?: string;
  total?: number;
  carrito: BackendCart;
  resumen?: {
    items: number;
    subtotal: number;
    descuento: number;
    impuestos?: number;
    total: number;
    moneda: string;
    amount_in_cents: number;
  };
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

  /** Obtiene un carrito por id (incluye COMPLETADO tras pago) */
  async obtenerPorId(carritoId: string): Promise<
    BackendCart & {
      datosFacturacion?: DatosFacturacionInvitado | null;
      facturaId?: string | null;
      ventaReferencia?: string | null;
    }
  > {
    const resp = await cartFetch(`/api/carrito/${carritoId}`, { method: 'GET' });
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

  async ejecutarPagoWompi(
    carritoId: string,
    payload: {
      paymentMethod: 'nequi' | 'card' | 'pse';
      payment_method?: Record<string, unknown>;
      customer_data?: Record<string, unknown>;
      customer_email?: string;
    },
  ): Promise<{
    ok?: boolean;
    flow?: string;
    wompiCheckoutUrl?: string | null;
    reference?: string;
    ventaReferencia?: string | null;
    facturaId?: string | null;
    status?: string;
    transactionId?: string;
    transaccion?: { status?: string };
    amount_in_cents?: number;
  }> {
    return cartFetch(`/api/carrito/${carritoId}/pago/wompi`, {
      method: 'POST',
      body: payload,
    });
  },

  async emitirComprobantePedidoPdf(payload: {
    transactionId: string;
    facturaId?: string;
    ventaReferencia?: string;
    referenciaPago?: string;
    carritoId?: string;
    snapshot: Record<string, unknown>;
  }): Promise<{
    id: string;
    facturaId: string;
    invoiceId?: string | null;
    transactionId: string;
    nombreArchivo: string;
    contenidoHash: string;
    yaExistia: boolean;
    descargaUrl: string;
  }> {
    const resp = await cartFetch('/api/carrito/comprobantes-pedido', {
      method: 'POST',
      body: payload,
    });
    return resp.data as {
      id: string;
      facturaId: string;
      transactionId: string;
      nombreArchivo: string;
      contenidoHash: string;
      yaExistia: boolean;
      descargaUrl: string;
    };
  },

  async descargarComprobantePedidoPdf(transactionId: string): Promise<{
    blob: Blob;
    fileName: string;
  }> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'x-session-id': getCartSessionId(),
    };
    if (token) {
      headers.metasploit = token;
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(
      `/api/carrito/comprobantes-pedido/${encodeURIComponent(transactionId)}/pdf`,
      { method: 'GET', headers },
    );
    if (!response.ok) {
      let msg = 'No se pudo descargar el comprobante PDF';
      try {
        const err = await response.json();
        msg = err?.msg || msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] || `pedido-mabs-${transactionId}.pdf`;
    const blob = await response.blob();
    return { blob, fileName };
  },

  async consultarEstadoPagoWompi(carritoId: string): Promise<{
    ok?: boolean;
    reference?: string;
    ventaReferencia?: string | null;
    facturaId?: string | null;
    invoiceId?: string | null;
    carritoEstado?: string | null;
    status?: string;
    transactionId?: string | null;
    amount_in_cents?: number | null;
    currency?: string;
    subtotal?: number | null;
    total?: number | null;
    datosFacturacion?: DatosFacturacionInvitado | null;
    items?: Array<{
      _id: string;
      productoId: string;
      sku?: string | null;
      nombre: string;
      cantidad: number;
      precioUnitario: number;
      subtotalNeto: number;
      stockDisponible?: number;
      stockSuficiente?: boolean;
    }>;
  }> {
    return cartFetch(`/api/carrito/${carritoId}/pago/estado`, { method: 'GET' });
  },

  /** Pedidos completados del usuario invitado/cliente autenticado */
  async listarMisPedidos(params: { limit?: number; skip?: number } = {}): Promise<{
    ok?: boolean;
    total: number;
    data: Array<{
      id: string;
      ventaReferencia?: string | null;
      facturaId?: string | null;
      invoiceId?: string | null;
      referenciaPago?: string | null;
      estado: string;
      total: number;
      moneda: string;
      cantidadItems: number;
      items: Array<{ nombre: string; sku?: string | null; cantidad: number; subtotalNeto?: number }>;
      fechaPedido?: string;
      datosFacturacion?: Record<string, unknown> | null;
    }>;
  }> {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.skip != null) qs.set('skip', String(params.skip));
    const query = qs.toString();
    return apiFetch(`/api/carrito/mis-pedidos${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  /** Cancela el carrito */
  async cancelar(carritoId: string): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/cancelar`, { method: 'POST' });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Admin: pedidos con pago aprobado y venta completada */
  async reaplicarKardexPedido(carritoId: string): Promise<{ ok: boolean; msg?: string; movimientosKardex?: unknown[] }> {
    return apiFetch(`/api/carrito/admin/pedidos-aprobados/${carritoId}/reaplicar-kardex`, {
      method: 'POST',
      body: {},
    });
  },

  async listarPedidosAprobados(params: { limit?: number; skip?: number; q?: string } = {}): Promise<{
    total: number;
    data: PedidoAprobado[];
  }> {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.skip != null) qs.set('skip', String(params.skip));
    if (params.q) qs.set('q', params.q);
    const query = qs.toString();
    const resp = await apiFetch(
      `/api/carrito/admin/pedidos-aprobados${query ? `?${query}` : ''}`,
      { method: 'GET' },
    );
    return {
      total: Number(resp.total || 0),
      data: (resp.data || []) as PedidoAprobado[],
    };
  },
};

export interface PedidoAprobadoLinea {
  productoId: string | null;
  nombre: string;
  sku: string | null;
  skuOrigen: string | null;
  cantidad: number;
  precioUnitario: number;
  precioVentaCobrado: number;
  precioVentaRelacion: number;
  precioSkuOrigen: number;
  costoUnitarioSku: number;
  stockActualKardex: number | null;
  margenUnitario: number;
  margenTotal: number;
  margenPorcentaje: number | null;
  subtotal: number;
}

export interface PedidoResumenMargen {
  costoTotal: number;
  ventaItemsTotal: number;
  margenTotal: number;
  margenPorcentaje: number | null;
}

export interface PedidoAprobado {
  id: string;
  ventaReferencia: string | null;
  referenciaPago: string | null;
  pagoEstado: string;
  fechaPedido: string;
  total: number;
  moneda: string;
  cantidadTotalUnidades: number;
  resumenMargen: PedidoResumenMargen;
  facturacion: {
    nombre: string;
    email: string;
    telefono: string;
    tipoDocumento: string;
    numeroDocumento: string;
    tipoPersona: string | null;
    ciudad: string;
    departamento: string;
    direccion: string;
  };
  items: PedidoAprobadoLinea[];
}

export default carritoService;
