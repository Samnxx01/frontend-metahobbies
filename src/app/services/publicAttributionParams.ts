import type { ResolvedAttributionLink } from '@/app/services/referralAttributionService';
import { syncCartSessionWithAttribution } from '@/app/utils/cartSessionAttribution';

/**
 * Preserva guestSessionId, ref (JWT), originType, etc. al navegar entre módulos públicos.
 * - Al entrar con ?guestSessionId=…&ref=… en la URL, se guarda en sessionStorage (por pestaña).
 * - Los enlaces internos combinan la ruta con esos parámetros para no perder la atribución.
 */

const STORAGE_KEY = 'mabs_public_attribution_v1';

/** Query params que deben mantenerse en la navegación pública (ventas / referidos). */
export const PUBLIC_ATTRIBUTION_KEYS = [
    'guestSessionId',
    'ref',
    'originType',
    'originId',
    'flow',
    'redirectTo',
] as const;

export type PublicAttributionKey = (typeof PUBLIC_ATTRIBUTION_KEYS)[number];

export interface PublicAttributionContext {
    ref: string;
    guestSessionId: string;
    originType: string;
    originId: string;
    flow: string;
}

function readStored(): Record<string, string> {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, string>)
            : {};
    } catch {
        return {};
    }
}

/** Lee los params guardados (útil para debugging o llamadas API desde el cliente). */
export function getStoredPublicAttribution(): Record<string, string> {
    return { ...readStored() };
}

/**
 * Combina query actual + sessionStorage de atribución (Pipeline B / referidos).
 */
export function resolvePublicAttributionContext(search = ''): PublicAttributionContext {
    const stored = readStored();
    const query = search.startsWith('?') ? search.slice(1) : search;
    const params = query ? new URLSearchParams(query) : null;

    const pick = (key: PublicAttributionKey): string => {
        const fromUrl = params?.get(key);
        if (fromUrl != null && String(fromUrl).trim() !== '') {
            return String(fromUrl).trim();
        }
        return String(stored[key] || '').trim();
    };

    return {
        ref: pick('ref'),
        guestSessionId: pick('guestSessionId'),
        originType: pick('originType'),
        originId: pick('originId'),
        flow: pick('flow'),
    };
}

/** Código corto de atribución en URL (`?at=` o alias legacy `?st=`). */
export function getAttributionLinkCodeFromSearch(search = ''): string {
    const query = search.startsWith('?') ? search.slice(1) : search;
    if (!query) return '';
    const params = new URLSearchParams(query);
    const fromUrl = params.get('at')?.trim() || params.get('st')?.trim() || '';
    return fromUrl ? fromUrl.toUpperCase() : '';
}

/** Extrae código corto ?at=MABS-XXXX de la URL o del storage. */
export function getAttributionLinkCode(search = ''): string {
    const fromUrl = getAttributionLinkCodeFromSearch(search);
    if (fromUrl) return fromUrl;

    const stored = readStored();
    return String(stored.linkCode || stored.codigoReferido || '').trim().toUpperCase();
}

/** Pipeline B / enlace venta: checkout de producto sin login obligatorio. */
export function isGeneradorEnlaceVentasFlow(search = ''): boolean {
    capturePublicAttributionFromSearch(search);

    const stored = readStored();
    if (stored.pipelineB === '1' || stored.allowGuestProductCheckout === '1') {
        return true;
    }

    const ctx = resolvePublicAttributionContext(search);
    if (ctx.originType === 'producto' && Boolean(ctx.guestSessionId || ctx.ref)) {
        return true;
    }

    const redirect = String(stored.redirectTo || '').trim().toLowerCase();
    if ((redirect === 'home' || redirect === 'productos') && Boolean(ctx.guestSessionId || ctx.ref)) {
        return true;
    }

    if (stored.flow === 'venta' && stored.pipelineB === '1') {
        return true;
    }

    return false;
}

/** Token mínimo del enlace de referido (JWT encriptado en query `ref`). */
export function esTokenReferidoAtribucionValido(ref: string): boolean {
    const token = String(ref || '').trim();
    return token.length >= 32;
}

/**
 * Persiste atribución antes de entrar al flujo membresía referidos.
 * Sincroniza guestSessionId con la sesión que consume MembershipPayment.
 */
export function persistAttributionForReferidosFlow(ctx: PublicAttributionContext): void {
    const stored = readStored();
    if (ctx.ref) stored.ref = ctx.ref;
    if (ctx.guestSessionId) stored.guestSessionId = ctx.guestSessionId;
    if (ctx.originType) stored.originType = ctx.originType;
    if (ctx.originId) stored.originId = ctx.originId;
    stored.flow = 'referidos';
    stored.redirectTo = 'referidos';
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    if (ctx.guestSessionId) {
        sessionStorage.setItem('mabs_guest_session_id', ctx.guestSessionId);
    }
    sessionStorage.setItem('mabs_referidos_flow', '1');
}

/**
 * Fusiona la query actual de la URL en sessionStorage cuando llegan claves de atribución.
 * Llamar en cada cambio de ruta del layout público.
 */
export function capturePublicAttributionFromSearch(search: string): void {
    if (!search || search === '?') return;
    const incoming = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const stored = readStored();
    let updated = false;

    const linkCode = incoming.get('at')?.trim() || incoming.get('st')?.trim();
    if (linkCode) {
        stored.linkCode = linkCode.toUpperCase();
        stored.codigoReferido = stored.linkCode;
        updated = true;
    }

    for (const k of PUBLIC_ATTRIBUTION_KEYS) {
        const v = incoming.get(k);
        if (v != null && v !== '') {
            stored[k] = v;
            updated = true;
        }
    }
    if (updated) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        if (stored.guestSessionId) {
            sessionStorage.setItem('mabs_guest_session_id', stored.guestSessionId);
        }
        syncCartSessionWithAttribution();
    }
}

/** Limpia la sesión de atribución (por ejemplo tras compra confirmada si lo necesitas). */
export function clearStoredPublicAttribution(): void {
    sessionStorage.removeItem(STORAGE_KEY);
}

/** Hidrata sessionStorage tras resolver un enlace corto `?at=MABS-XXXXXX`. */
export function applyResolvedAttributionToStorage(resolved: ResolvedAttributionLink): void {
    const stored = readStored();
    if (resolved.ref) stored.ref = resolved.ref;
    if (resolved.guestSessionId) stored.guestSessionId = resolved.guestSessionId;
    if (resolved.originType) stored.originType = resolved.originType;
    if (resolved.originId) stored.originId = resolved.originId;
    if (resolved.flow) stored.flow = resolved.flow;
    if (resolved.redirectTo) stored.redirectTo = resolved.redirectTo;
    if (resolved.linkCode || resolved.codigoReferido) {
        stored.linkCode = String(resolved.linkCode || resolved.codigoReferido).trim().toUpperCase();
        stored.codigoReferido = stored.linkCode;
    }
    if (resolved.pipelineB || resolved.originType === 'producto') {
        stored.pipelineB = '1';
    }
    if (resolved.allowGuestProductCheckout && (resolved.pipelineB || resolved.originType === 'producto')) {
        stored.allowGuestProductCheckout = '1';
    } else if (resolved.flow === 'referidos' || resolved.redirectTo === 'referidos') {
        delete stored.allowGuestProductCheckout;
        delete stored.pipelineB;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    if (resolved.guestSessionId) {
        sessionStorage.setItem('mabs_guest_session_id', resolved.guestSessionId);
    }
    if (resolved.flow === 'referidos') {
        sessionStorage.setItem('mabs_referidos_flow', '1');
    }
    syncCartSessionWithAttribution();
}

/**
 * Devuelve la misma ruta interna con la query de atribución aplicada.
 * No modifica enlaces externos (http/https).
 */
const CHECKOUT_ATTRIBUTION_PATH_SUFFIXES = [
    '/checkout',
    '/public/render/checkout',
    '/public/render/finalizar-compra',
] as const;

/** En checkout no propagar `ref` (JWT) en la URL: queda en sessionStorage y evita confusión con Wompi. */
function shouldOmitRefFromAttributionPath(pathname: string): boolean {
    const path = String(pathname || '').replace(/\/$/, '').toLowerCase();
    return CHECKOUT_ATTRIBUTION_PATH_SUFFIXES.some(
        (suffix) => path === suffix || path.endsWith(suffix),
    );
}

export function appendPublicAttributionToInternalPath(path: string): string {
    if (!path || typeof path !== 'string') return path;
    const trimmed = path.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const stored = readStored();
    if (Object.keys(stored).length === 0) return trimmed;

    const qMark = trimmed.indexOf('?');
    const pathname = qMark >= 0 ? trimmed.slice(0, qMark) : trimmed;
    const existing = qMark >= 0 ? trimmed.slice(qMark + 1) : '';
    const params = new URLSearchParams(existing);
    const omitRef = shouldOmitRefFromAttributionPath(pathname);
    for (const [k, v] of Object.entries(stored)) {
        if (omitRef && k === 'ref') continue;
        params.set(k, v);
    }
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
}
