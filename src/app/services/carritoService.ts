import { apiFetch, axiosClient } from './api';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import {
  CART_SESSION_KEY,
  isGuestSessionIdMisusedAsCarritoId,
  resolveAttributionGuestSessionId,
  syncCartSessionWithAttribution,
} from '@/app/utils/cartSessionAttribution';

const getCartSessionId = (): string => {
  syncCartSessionWithAttribution();

  const attributionGuest = resolveAttributionGuestSessionId();
  if (attributionGuest) {
    localStorage.setItem(CART_SESSION_KEY, attributionGuest);
    return attributionGuest;
  }

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
  colorPantone?: string | null;
  colorNombre?: string | null;
  colorHex?: string | null;
  descuentoItem: { tipo: 'PORCENTAJE' | 'FIJO' | 'NINGUNO'; valor: number };
  subtotalBruto: number;
  subtotalNeto: number;
  baseImponible?: number;
  totalImpuestos?: number;
  totalConImpuestos?: number;
  detalleImpuestos?: BackendCartTaxDetail[];
  stockDisponible: number;
  stockSuficiente: boolean;
  /** Límite de unidades por compra parametrizado en las reglas de venta del producto (LIMITE_CANTIDAD). null = sin límite. */
  cantidadMaxima?: number | null;
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
  estado: 'ACTIVO' | 'ABANDONADO' | 'COMPLETADO' | 'CANCELADO' | 'PENDIENTE_PAGO';
  estadoVentaReferencia?: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO' | null;
  moneda: string;
  monedaId?: string | null;
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
  productoId: String(item.productoId || ''),
});

/** Id público del carrito o ítem (`iud` en API). */
export const getCarritoPublicId = (cart: { _id?: string; iud?: string } | null | undefined): string =>
  String(cart?._id || cart?.iud || '').trim();

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

  /** Obtiene un carrito por id; devuelve null si el backend responde 404. */
  async obtenerPorIdSeguro(carritoId: string): Promise<
    (BackendCart & {
      datosFacturacion?: DatosFacturacionInvitado | null;
      facturaId?: string | null;
      ventaReferencia?: string | null;
    }) | null
  > {
    try {
      return await this.obtenerPorId(carritoId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || '');
      if (/\[404\]/i.test(msg) && /carrito no encontrado/i.test(msg)) {
        return null;
      }
      throw err;
    }
  },

  /** Obtiene un carrito por id (incluye COMPLETADO tras pago) */
  async obtenerPorId(carritoId: string): Promise<
    BackendCart & {
      datosFacturacion?: DatosFacturacionInvitado | null;
      facturaId?: string | null;
      ventaReferencia?: string | null;
    }
  > {
    if (isGuestSessionIdMisusedAsCarritoId(carritoId)) {
      return this.obtenerOCrear();
    }
    const resp = await cartFetch(`/api/carrito/${carritoId}`, { method: 'GET' });
    return normalizeCart(resp.data as BackendCart);
  },

  /** Agrega un producto al carrito (crea carrito si no hay id activo). */
  async agregarItem(
    carritoId: string,
    productoId: string,
    cantidad: number,
    options?: { color?: { pantone: string; name: string; hex: string } },
  ): Promise<BackendCart> {
    const cartId = String(carritoId || '').trim();
    const endpoint = cartId ? `/api/carrito/${cartId}/items` : '/api/carrito/items';
    const resp = await cartFetch(endpoint, {
      method: 'POST',
      body: { productoId, cantidad, color: options?.color },
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
    const id = String(carritoId || '').trim();
    if (!id) {
      throw new Error('No hay carrito activo para sincronizar.');
    }
    const resp = await cartFetch(`/api/carrito/${id}/sincronizar`, { method: 'POST' });
    return { carrito: normalizeCart(resp.carrito as BackendCart), alertas: (resp.alertas ?? []) as CartAlerta[] };
  },

  /** Reabre carrito CANCELADO/PENDIENTE_PAGO tras pago fallido → ACTIVO */
  async reabrirTrasPagoFallido(carritoId: string): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/reabrir-checkout`, { method: 'POST' });
    return normalizeCart(resp.data as BackendCart);
  },

  /**
   * Abandona checkout con pago DECLINED: reabre carrito para generar nuevo pago al volver.
   */
  async abandonarCheckoutPagoDeclinado(carritoId: string): Promise<{ ok: boolean; motivo?: string }> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/abandonar-pago-declinado`, {
      method: 'POST',
    });
    return { ok: Boolean(resp.ok), motivo: String(resp.motivo || '') };
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
    const response = await axiosClient.get(
      `/api/carrito/comprobantes-pedido/${encodeURIComponent(transactionId)}/pdf`,
      { headers, responseType: 'blob', validateStatus: () => true },
    );
    if (response.status < 200 || response.status >= 300) {
      let msg = 'No se pudo descargar el comprobante PDF';
      try {
        const err = JSON.parse(await (response.data as Blob).text());
        msg = err?.msg || msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    const blob = response.data as Blob;
    if (!contentType.includes('application/pdf')) {
      let msg = 'El servidor no devolvió un archivo PDF válido';
      try {
        const body = JSON.parse(await blob.text());
        msg = body?.msg || msg;
      } catch {
        /* La respuesta no era JSON ni PDF. */
      }
      throw new Error(msg);
    }
    const signature = await blob.slice(0, 5).text();
    if (signature !== '%PDF-') {
      throw new Error('El comprobante recibido está corrupto o no tiene formato PDF.');
    }
    const disposition = String(response.headers['content-disposition'] || '');
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] || `pedido-mabs-${transactionId}.pdf`;
    return { blob, fileName };
  },

  async consultarEstadoPagoWompi(
    carritoId: string,
    options?: { transactionId?: string; reference?: string },
  ): Promise<{
    ok?: boolean;
    reference?: string;
    ventaReferencia?: string | null;
    facturaId?: string | null;
    invoiceId?: string | null;
    carritoEstado?: string | null;
    carritoId?: string | null;
    emitidaEn?: string | null;
    fechaFactura?: string | null;
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
      colorPantone?: string | null;
      colorNombre?: string | null;
      colorHex?: string | null;
    }>;
  }> {
    const txId = String(options?.transactionId || '').trim();
    const reference = String(options?.reference || '').trim();
    /**
     * El `id` de Wompi NO es el carrito. Con transactionId/reference el backend resuelve
     * por transacción (ruta sentinel `0`), no por el carrito activo del navegador.
     */
    const idRuta = (txId || reference) ? '0' : (String(carritoId || '').trim() || '0');

    const params = new URLSearchParams();
    if (txId) {
      params.set('transactionId', txId);
      params.set('id', txId);
    }
    if (reference) params.set('reference', reference);
    const qs = params.toString();
    return cartFetch(
      `/api/carrito/${idRuta}/pago/estado${qs ? `?${qs}` : ''}`,
      { method: 'GET' },
    );
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

  /**
   * Cancela pedido en paso de pago: anula carrito, pedido pendiente, invoice y referencia Wompi.
   */
  async cancelarPedido(carritoId: string): Promise<BackendCart> {
    const resp = await cartFetch(`/api/carrito/${carritoId}/cancelar-pedido`, { method: 'POST' });
    return normalizeCart(resp.data as BackendCart);
  },

  /** @deprecated Usar cancelarPedido */
  async cancelarCompra(carritoId: string): Promise<BackendCart> {
    return this.cancelarPedido(carritoId);
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

  async listarProcesosEnCurso(params: { minutos?: number; limit?: number } = {}): Promise<ProcesosCarritoResponse> {
    const qs = new URLSearchParams();
    if (params.minutos != null) qs.set('minutos', String(params.minutos));
    if (params.limit != null) qs.set('limit', String(params.limit));
    const resp = await apiFetch(`/api/carrito/admin/procesos-en-curso?${qs.toString()}`, { method: 'GET' });
    return {
      total: Number(resp.total || 0),
      resumen: {
        publicos: Number(resp.resumen?.publicos || 0),
        autenticados: Number(resp.resumen?.autenticados || 0),
        enPago: Number(resp.resumen?.enPago || 0),
        abandonados: Number(resp.resumen?.abandonados || 0),
      },
      data: (resp.data || []) as ProcesoCarrito[],
    };
  },

  async listarAuditoriasProducto(params: AuditoriaProductoFiltros = {}): Promise<{ total: number; data: AuditoriaProductoCheck[] }> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) qs.set(key, String(value));
    });
    const resp = await apiFetch(`/api/carrito/admin/auditorias-productos?${qs.toString()}`, { method: 'GET' });
    return { total: Number(resp.total || 0), data: (resp.data || []) as AuditoriaProductoCheck[] };
  },

  async listarVentasReferencias(params: { q?: string; estado?: string; limit?: number; skip?: number } = {}): Promise<{ total: number; data: VentaReferenciaAdmin[] }> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) qs.set(key, String(value));
    });
    const query = qs.toString();
    const resp = await apiFetch(`/api/carrito/admin/ventas-referencias${query ? `?${query}` : ''}`, { method: 'GET' });
    return { total: Number(resp.total || 0), data: (resp.data || []) as VentaReferenciaAdmin[] };
  },

  async previsualizarVentaManual(items: Array<Record<string, unknown>>): Promise<{ data: Record<string, any> }> {
    return apiFetch('/api/carrito/admin/venta-manual/previsualizar', { method: 'POST', body: { items } });
  },

  async listarReferidoresBypassPipelineB(): Promise<{ data: Array<Record<string, any>> }> {
    return apiFetch('/api/carrito/admin/venta-manual/referidores', { method: 'GET' });
  },

  async crearVentaManual(payload: Record<string, unknown>): Promise<{ data: Record<string, any> }> {
    return apiFetch('/api/carrito/admin/venta-manual', { method: 'POST', body: payload });
  },
};

export interface VentaReferenciaAdmin {
  id: string;
  ventaReferencia?: string | null;
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO' | string;
  estadoPago?: string | null;
  carritoId?: string | null;
  referenciaPago?: string | null;
  transactionId?: string | null;
  monto?: number | null;
  moneda?: string | null;
  origenComision?: string | null;
  confirmadaEn?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  terceroId?: { id?: string; nombreCompleto?: string; razonSocial?: string; nombre?: string; numeroDocumento?: string; correo?: string; email?: string } | null;
  auditoriaPagoId?: { id?: string; referenciaPersonalizada?: string; transactionId?: string; emailCliente?: string; clienteNombre?: string; clienteDocumento?: string; estado?: string } | null;
}

export type AuditoriaProductoFiltros = {
  q?: string; estado?: string; fechaDesde?: string; fechaHasta?: string; limit?: number; skip?: number;
};

export interface AuditoriaProductoCheck {
  _id?: string; iud?: string; referenciaPersonalizada: string; referencia?: string | null;
  transactionId?: string | null; estado: string; emailCliente: string; clienteDocumento?: string | null;
  clienteNombre?: string | null; monto: number; montoCentavos: number; moneda: string; procesado: boolean; endpoint?: string;
  carritoId?: string | null; fechaCreacion: string; fechaActualizacion?: string | null;
}

export interface ProcesoCarrito {
  id: string;
  referencia: string;
  tipoUsuario: 'PUBLICO' | 'AUTENTICADO';
  usuario: string;
  tercero?: {
    terceroId?: string | null;
    tipoPersona?: string | null;
    nombre?: string | null;
    tipoDocumento?: string | null;
    numeroDocumento?: string | null;
    email?: string | null;
    telefono?: string | null;
  } | null;
  etapa: 'CARRITO' | 'DATOS_CLIENTE' | 'PAGO' | 'ABANDONADO';
  estado: string;
  cantidadProductos: number;
  cantidadUnidades: number;
  total: number;
  moneda: string;
  pasos: { carrito: boolean; datosCliente: boolean; pago: boolean; aprobado: boolean };
  iniciadoEn: string | null;
  ultimaActividad: string | null;
}

export interface ProcesosCarritoResponse {
  total: number;
  resumen: { publicos: number; autenticados: number; enPago: number; abandonados: number };
  data: ProcesoCarrito[];
}

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
  costoUnitarioMovimiento: number;
  costoFuente: 'INVENTARIO_MOVIMIENTOS' | 'INVENTARIO_SALDOS';
  movimientosKardex: number;
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
  carritoId: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceEstado: string | null;
  transactionId: string | null;
  emitidaEn: string | null;
  ventaReferencia: string | null;
  referenciaPago: string | null;
  pagoEstado: string;
  fechaPedido: string | null;
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
  kardexSalidasRegistradas?: number;
  puedeReaplicarKardex?: boolean;
  items: PedidoAprobadoLinea[];
}

export default carritoService;
