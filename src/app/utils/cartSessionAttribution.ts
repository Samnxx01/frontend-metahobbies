const CART_SESSION_KEY = 'mabs_cart_session_id';
const ATTRIBUTION_STORAGE_KEY = 'mabs_public_attribution_v1';
const GUEST_SESSION_KEY = 'mabs_guest_session_id';

/** guestSessionId de la atribución activa (Pipeline B / enlace de venta). */
export function resolveAttributionGuestSessionId(): string {
  try {
    const fromGuest = sessionStorage.getItem(GUEST_SESSION_KEY)?.trim();
    if (fromGuest) return fromGuest;

    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return '';

    const parsed = JSON.parse(raw) as { guestSessionId?: string };
    return String(parsed?.guestSessionId || '').trim();
  } catch {
    return '';
  }
}

/** Alinea x-session-id del carrito con la sesión de atribución del enlace compartido. */
export function syncCartSessionWithAttribution(): void {
  const guestSessionId = resolveAttributionGuestSessionId();
  if (!guestSessionId) return;
  try {
    const current = localStorage.getItem(CART_SESSION_KEY)?.trim();
    // No sobrescribir sesión ya usada por el carrito (evita perder ítems al hidratar ?at=).
    if (current && current !== guestSessionId) return;
    localStorage.setItem(CART_SESSION_KEY, guestSessionId);
  } catch {
    /* ignore */
  }
}

/** El guestSessionId no es el _id del carrito; usar GET /api/carrito con header, no /api/carrito/:id. */
export function isGuestSessionIdMisusedAsCarritoId(carritoId: string): boolean {
  const id = String(carritoId || '').trim();
  if (!id) return false;
  const guestSessionId = resolveAttributionGuestSessionId();
  return Boolean(guestSessionId && id === guestSessionId);
}

export { CART_SESSION_KEY };
