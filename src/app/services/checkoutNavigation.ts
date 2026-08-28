import { appendPublicAttributionToInternalPath } from '@/app/services/publicAttributionParams';
import type { DatosFacturacionInvitado } from '@/app/presentation/components/carrito/DatosFacturacionInvitadoModal';

/** Ruta canónica del wizard de pago (gobernanza / menú público). */
export const CHECKOUT_PAYMENT_PATH = '/public/render/finalizar-compra';

export type CheckoutNavigationState = {
  openPayment?: boolean;
  datosFacturacion?: DatosFacturacionInvitado;
  checkoutFlowId?: string;
};

export function getCheckoutPaymentPath(): string {
  return appendPublicAttributionToInternalPath(CHECKOUT_PAYMENT_PATH);
}

export function buildCheckoutNavigationState(
  options: { datosFacturacion?: DatosFacturacionInvitado } = {},
): CheckoutNavigationState {
  return {
    openPayment: true,
    ...(options.datosFacturacion ? { datosFacturacion: options.datosFacturacion } : {}),
  };
}
