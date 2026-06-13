import type { CartItem } from '@/types/common';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';

export const CHECKOUT_CONFIRMACION_STORAGE_KEY = 'mabs_checkout_confirmacion_v1';

export interface CheckoutConfirmacionPedido {
  estado: 'aprobada' | 'pendiente' | 'rechazada';
  /** Consecutivo factura (FACTURA_POS, ej. FACTURA-000001) */
  facturaId: string;
  carritoId: string;
  transactionId: string;
  referenciaPago: string;
  ventaReferencia: string;
  monto: number;
  moneda: string;
  email: string;
  metodoPago: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  datosFacturacion: DatosFacturacionInvitado | null;
  fecha: string;
}

export function persistCheckoutConfirmacion(data: CheckoutConfirmacionPedido): void {
  try {
    sessionStorage.setItem(CHECKOUT_CONFIRMACION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function readCheckoutConfirmacion(): CheckoutConfirmacionPedido | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_CONFIRMACION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutConfirmacionPedido;
  } catch {
    return null;
  }
}

export function clearCheckoutConfirmacion(): void {
  sessionStorage.removeItem(CHECKOUT_CONFIRMACION_STORAGE_KEY);
}
