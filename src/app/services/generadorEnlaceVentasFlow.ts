import {
    applyResolvedAttributionToStorage,
    capturePublicAttributionFromSearch,
    getAttributionLinkCode,
    getStoredPublicAttribution,
    isGeneradorEnlaceVentasFlow,
} from '@/app/services/publicAttributionParams';
import type { ResolvedAttributionLink } from '@/app/services/referralAttributionService';
import {
    resolveAttributionByGuestSession,
    resolveAttributionByLinkCode,
} from '@/app/services/referralAttributionService';
import { resolveAttributionGuestSessionId } from '@/app/utils/cartSessionAttribution';

/** Enlace del generador enlace ventas → checkout de producto sin login obligatorio. */
export function allowsGuestProductCheckout(resolved: ResolvedAttributionLink | null | undefined): boolean {
    if (!resolved) return false;
    if (resolved.allowGuestProductCheckout) return true;
    if (resolved.pipelineB || resolved.originType === 'producto') return true;

    const redirect = String(resolved.redirectTo || '').trim().toLowerCase();
    if (redirect === 'home' || redirect === 'productos') return true;

    if (resolved.ref && redirect !== 'referidos') return true;
    if (resolved.guestSessionId) return true;

    return false;
}

/**
 * Rehidrata atribución del generador enlace ventas desde URL, sessionStorage o backend.
 * Debe llamarse antes de decidir si mostrar login en checkout/carrito.
 */
export async function hydrateGeneradorEnlaceVentasAttribution(search = ''): Promise<boolean> {
    capturePublicAttributionFromSearch(search);

    if (isGeneradorEnlaceVentasFlow(search)) {
        const linkCode = getAttributionLinkCode(search);
        if (linkCode) {
            const resolved = await resolveAttributionByLinkCode(linkCode);
            if (resolved) {
                applyResolvedAttributionToStorage(resolved);
            }
        }
        return true;
    }

    const linkCode = getAttributionLinkCode(search);
    if (linkCode) {
        const resolved = await resolveAttributionByLinkCode(linkCode);
        if (allowsGuestProductCheckout(resolved)) {
            applyResolvedAttributionToStorage(resolved!);
            return true;
        }
    }

    const guestSessionId = resolveAttributionGuestSessionId()
        || getStoredPublicAttribution().guestSessionId
        || '';

    if (guestSessionId) {
        const resolved = await resolveAttributionByGuestSession(guestSessionId);
        if (allowsGuestProductCheckout(resolved)) {
            applyResolvedAttributionToStorage(resolved!);
            return true;
        }
    }

    return false;
}
