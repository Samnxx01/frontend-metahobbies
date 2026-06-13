import { CHECKOUT_PAYMENT_PATH } from '@/app/services/checkoutNavigation';

const RUTAS_CHECKOUT = [
  '/checkout',
  '/public/render/checkout',
  CHECKOUT_PAYMENT_PATH,
  '/public/render/finalizar-compra',
];

/** URL de retorno Wompi con transactionId o flag wompi=retorno. */
export function esRetornoWompiEnSearch(search: string): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (params.get('wompi') === 'retorno') return true;
  return Boolean(
    params.get('id')
    || params.get('transactionId')
    || params.get('transaction_id')
    || params.get('reference'),
  );
}

export function esRutaCheckoutConfirmacion(pathname: string): boolean {
  const path = String(pathname || '').replace(/\/$/, '').toLowerCase();
  return RUTAS_CHECKOUT.some((ruta) => path === ruta || path.endsWith(ruta));
}

/** Ruta interna de checkout conservando query de Wompi (id, reference, env, etc.). */
export function buildRutaCheckoutRetornoWompi(search: string): string {
  const qs = search.startsWith('?') ? search : (search ? `?${search}` : '');
  return `${CHECKOUT_PAYMENT_PATH}${qs}`;
}
