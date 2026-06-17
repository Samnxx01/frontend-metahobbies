import carritoService from '@/app/services/carritoService';
import {
  clearCachesTrasPagoRechazado,
  clearCheckoutSessionCompleta,
  clearWompiRetornoContext,
  limpiarSesionCarritoObsoleto,
} from '@/app/utils/checkoutSessionCache';
import { abandonarCheckoutSiPagoDeclinado } from '@/app/utils/checkoutAbandonDeclinado';

export type ModoSalidaPedidoCheckout =
  /** Escenario DECLINED: mismo pedido, nuevo intento Wompi en pantalla */
  | 'reintentar_pago'
  /** Escenario DECLINED: sale del pago, limpia caché declined y deja carrito ACTIVO para otro checkout */
  | 'abandonar_pago_declinado'
  /** Escenario cancelar pedido: anula carrito + pedido + invoice y limpia toda la sesión */
  | 'cancelar_pedido';

export function limpiarCacheWompiPago(): void {
  clearWompiRetornoContext();
}

export function limpiarCachePagoDeclinado(): void {
  clearCachesTrasPagoRechazado();
}

/**
 * Escenario 1 (DECLINED) — abandonar: backend reabre carrito; frontend limpia caché de pago rechazado.
 */
export async function abandonarPedidoTrasPagoDeclinado(
  carritoId: string | null | undefined,
): Promise<void> {
  limpiarCachePagoDeclinado();
  await abandonarCheckoutSiPagoDeclinado(carritoId);
}

/**
 * Escenario 2 — cancelar pedido: anula todo en backend y reinicia caché (incluye declined).
 */
export async function cancelarPedidoCheckout(
  carritoId: string,
): Promise<void> {
  try {
    await carritoService.cancelarPedido(carritoId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err || '');
    const yaNoExiste = /\[404\]/i.test(msg) && /carrito no encontrado/i.test(msg);
    if (!yaNoExiste) throw err;
  }
  clearCheckoutSessionCompleta();
  limpiarCachePagoDeclinado();
  limpiarSesionCarritoObsoleto();
}

export async function ejecutarSalidaPedidoCheckout(
  carritoId: string | null | undefined,
  modo: ModoSalidaPedidoCheckout,
): Promise<void> {
  const id = String(carritoId || '').trim();
  if (!id || id === '0') {
    if (modo !== 'reintentar_pago') {
      limpiarCachePagoDeclinado();
    }
    return;
  }

  if (modo === 'reintentar_pago') {
    limpiarCacheWompiPago();
    return;
  }

  if (modo === 'abandonar_pago_declinado') {
    await abandonarPedidoTrasPagoDeclinado(id);
    return;
  }

  await cancelarPedidoCheckout(id);
}
