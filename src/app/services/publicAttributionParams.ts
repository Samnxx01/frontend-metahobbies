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
    }
}

/** Limpia la sesión de atribución (por ejemplo tras compra confirmada si lo necesitas). */
export function clearStoredPublicAttribution(): void {
    sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Devuelve la misma ruta interna con la query de atribución aplicada.
 * No modifica enlaces externos (http/https).
 */
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
    for (const [k, v] of Object.entries(stored)) {
        params.set(k, v);
    }
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
}
