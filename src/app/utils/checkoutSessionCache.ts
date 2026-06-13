import { DATOS_FACTURACION_INVITADO_KEY } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';
import { clearCheckoutConfirmacion } from '@/app/types/checkoutConfirmacion';
import { isGuestSessionIdMisusedAsCarritoId } from '@/app/utils/cartSessionAttribution';

const CHECKOUT_CARRITO_PAGO_KEY = 'mabs_checkout_carrito_pago_id';
const CHECKOUT_DECLINED_ACTIVE_KEY = 'mabs_checkout_declined_active';
const WOMPI_RETORNO_TX_KEY = 'mabs_checkout_wompi_tx';
const WOMPI_RETORNO_REF_KEY = 'mabs_checkout_wompi_ref';

export type WompiRetornoContext = {
  transactionId: string;
  reference: string;
};

/** Referencia Wompi (no JWT de atribución en query `ref`, que puede superar 500 chars). */
export function esReferenciaWompiPlausible(reference: string): boolean {
  const ref = String(reference || '').trim();
  if (!ref) return false;
  return ref.length <= 128;
}

export function persistWompiRetornoContext(ctx: WompiRetornoContext): void {
  try {
    if (ctx.transactionId) sessionStorage.setItem(WOMPI_RETORNO_TX_KEY, ctx.transactionId);
    if (ctx.reference && esReferenciaWompiPlausible(ctx.reference)) {
      sessionStorage.setItem(WOMPI_RETORNO_REF_KEY, ctx.reference);
    }
  } catch {
    /* ignore */
  }
}

export function readWompiRetornoContext(): WompiRetornoContext {
  try {
    const reference = sessionStorage.getItem(WOMPI_RETORNO_REF_KEY) || '';
    if (reference && !esReferenciaWompiPlausible(reference)) {
      sessionStorage.removeItem(WOMPI_RETORNO_REF_KEY);
      return {
        transactionId: sessionStorage.getItem(WOMPI_RETORNO_TX_KEY) || '',
        reference: '',
      };
    }
    return {
      transactionId: sessionStorage.getItem(WOMPI_RETORNO_TX_KEY) || '',
      reference,
    };
  } catch {
    return { transactionId: '', reference: '' };
  }
}

export function clearWompiRetornoContext(): void {
  try {
    sessionStorage.removeItem(WOMPI_RETORNO_TX_KEY);
    sessionStorage.removeItem(WOMPI_RETORNO_REF_KEY);
  } catch {
    /* ignore */
  }
}
const CART_IMAGES_KEY = 'cart_images';
const CART_COLORS_KEY = 'cart_colors';
const CART_COLOR_QTY_KEY = 'cart_color_qty';
const CART_SESSION_KEY = 'mabs_cart_session_id';

/** Errores Wompi por referencia ya consumida (ES/EN). */
export function isReferenciaWompiDuplicadaError(message: string): boolean {
  const m = String(message || '').toLowerCase();
  const esReferencia = m.includes('referencia') || m.includes('reference');
  const esDuplicada =
    m.includes('usada') ||
    m.includes('usado') ||
    m.includes('utiliz') ||
    m.includes('already') ||
    m.includes('ya ha sido');
  return esReferencia && esDuplicada;
}

export function clearCartSessionId(): void {
  try {
    localStorage.removeItem(CART_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Limpia datos de facturación/tercero en sessionStorage (no debe persistir entre compras). */
export function clearDatosFacturacionInvitado(): void {
  try {
    sessionStorage.removeItem(DATOS_FACTURACION_INVITADO_KEY);
  } catch {
    /* ignore */
  }
}

export function readCarritoIdPagoPersistido(): string | null {
  try {
    const stored =
      sessionStorage.getItem(CHECKOUT_CARRITO_PAGO_KEY)
      || localStorage.getItem(CHECKOUT_CARRITO_PAGO_KEY);
    if (!stored) return null;
    const id = String(stored).trim();
    if (!id || isGuestSessionIdMisusedAsCarritoId(id)) {
      clearCarritoIdPagoPersistido();
      return null;
    }
    return id;
  } catch {
    return null;
  }
}

export function persistCarritoIdPago(carritoId: string): void {
  try {
    sessionStorage.setItem(CHECKOUT_CARRITO_PAGO_KEY, carritoId);
    localStorage.setItem(CHECKOUT_CARRITO_PAGO_KEY, carritoId);
  } catch {
    /* ignore */
  }
}

export function clearCarritoIdPagoPersistido(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_CARRITO_PAGO_KEY);
    localStorage.removeItem(CHECKOUT_CARRITO_PAGO_KEY);
  } catch {
    /* ignore */
  }
}

/** Carrito inexistente en backend (id obsoleto tras cancelar o sesión distinta). */
export function isCarritoNoEncontradoError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /\[404\]/i.test(msg) && /carrito no encontrado/i.test(msg);
}

/** Limpia ids de pago y contexto Wompi cuando el carrito ya no existe. */
export function limpiarSesionCarritoObsoleto(): void {
  clearCarritoIdPagoPersistido();
  clearWompiRetornoContext();
  clearCheckoutDeclinadoActivo();
}

/** Cachés locales del carrito (imágenes, tonos, cantidades por color). */
export function clearCartLocalCaches(): void {
  try {
    localStorage.removeItem(CART_IMAGES_KEY);
    localStorage.removeItem(CART_COLORS_KEY);
    localStorage.removeItem(CART_COLOR_QTY_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Tras pago APPROVED: quita tercero/facturación y cachés de carrito.
 * La confirmación persistida se conserva para sobrevivir al refresh; limpiarla solo al iniciar otra compra.
 */
export function clearCachesTrasCompraAprobada(): void {
  clearDatosFacturacionInvitado();
  clearCarritoIdPagoPersistido();
  clearWompiRetornoContext();
  clearCartLocalCaches();
}

/** Al salir de confirmación o empezar un checkout nuevo. */
export function clearCheckoutSessionCompleta(): void {
  clearCachesTrasCompraAprobada();
  clearCheckoutConfirmacion();
}

/**
 * Tras error de referencia Wompi duplicada: fuerza un checkout nuevo
 * (no reutiliza carritoId / referencia guardados en el navegador).
 */
export function clearCheckoutCachesParaReintentoPago(): void {
  clearCarritoIdPagoPersistido();
  clearWompiRetornoContext();
  clearDatosFacturacionInvitado();
  clearCheckoutConfirmacion();
}

/** Limpia caché temporal de checkout tras pago rechazado (Wompi, carritoId, confirmación). */
export function clearCachesTrasPagoRechazado(): void {
  clearCheckoutCachesParaReintentoPago();
  clearCheckoutDeclinadoActivo();
}

/** Sesión activa en checkout con pago declinado (usuario aún en la página). */
export function marcarCheckoutDeclinadoActivo(): void {
  try {
    sessionStorage.setItem(CHECKOUT_DECLINED_ACTIVE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isCheckoutDeclinadoActivo(): boolean {
  try {
    return sessionStorage.getItem(CHECKOUT_DECLINED_ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearCheckoutDeclinadoActivo(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_DECLINED_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Limpieza amplia en desarrollo: checkout + carrito + atribución en el navegador.
 * No borra Mongo ni referencias ya registradas en Wompi.
 */
export function clearAllMabsDevCaches(): void {
  clearCheckoutSessionCompleta();
  clearCartSessionId();
  try {
    sessionStorage.removeItem('mabs_public_attribution_v1');
    sessionStorage.removeItem('mabs_guest_session_id');
    sessionStorage.removeItem('mabs_referidos_flow');
  } catch {
    /* ignore */
  }
}
