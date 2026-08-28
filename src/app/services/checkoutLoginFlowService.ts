import type { CheckoutNavigationState } from '@/app/services/checkoutNavigation';

const STORAGE_KEY = 'mabs_checkout_login_flow';
const MAX_AGE_MS = 30 * 60 * 1000;

export type CheckoutLoginFlow = {
  flowId: string;
  origin: 'carrito' | 'checkout';
  returnUrl: string;
  returnState: CheckoutNavigationState;
  createdAt: number;
};

export function beginCheckoutLoginFlow(
  origin: CheckoutLoginFlow['origin'],
  returnUrl: string,
): CheckoutLoginFlow | null {
  if (typeof window === 'undefined') return null;
  const safeUrl = String(returnUrl || '').trim();
  if (!safeUrl.startsWith('/') || safeUrl.startsWith('//')) return null;
  const flow: CheckoutLoginFlow = {
    flowId: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `checkout-${Date.now()}`,
    origin,
    returnUrl: safeUrl,
    returnState: { openPayment: true },
    createdAt: Date.now(),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
  return flow;
}

export function readCheckoutLoginFlow(): CheckoutLoginFlow | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const flow = JSON.parse(raw) as CheckoutLoginFlow;
    if (!flow?.flowId || !flow.returnUrl?.startsWith('/') || flow.returnUrl.startsWith('//')
      || Date.now() - Number(flow.createdAt || 0) > MAX_AGE_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return flow;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function consumeCheckoutLoginFlow(): CheckoutLoginFlow | null {
  const flow = readCheckoutLoginFlow();
  if (!flow || typeof window === 'undefined') return null;
  window.sessionStorage.removeItem(STORAGE_KEY);
  return flow;
}
