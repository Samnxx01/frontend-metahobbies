import { apiFetch } from '@/app/services/api';

export type AttributionLinkDestination = 'home' | 'productos' | 'referidos';

export interface ReferralAttributionPayload {
    guestSessionId?: string;
    emailCliente?: string;
    originType?: string;
    originId?: string | null;
    redirectTo?: AttributionLinkDestination;
    attributionSource?: 'referidos' | 'generador_enlace_ventas';
}

export interface ResolvedAttributionLink {
    guestSessionId: string | null;
    ref: string | null;
    originType: string;
    originId: string | null;
    /** referidos = membresía pipeline_a | venta = pipeline_b productos */
    pipeline?: 'referidos' | 'venta';
    flow: string;
    redirectTo: AttributionLinkDestination | null;
    linkCode: string;
    codigoReferido: string;
    attributionId: string;
    pipelineB?: boolean;
    allowGuestProductCheckout?: boolean;
}

export interface ReferralAttributionResult {
    msg: string;
    codigoReferido: string;
    jwtReferido: string;
    relacionId: string | null;
    nivelGeneracion: number | null;
    attributionId: string | null;
    guestSessionId: string;
    originType: string;
    originId?: string | null;
}

/** URL pública para que un referido compre membresía (flujo referidos). */
export function buildMembresiaReferidosUrl(
    data: Pick<ReferralAttributionResult, 'jwtReferido' | 'guestSessionId' | 'originType' | 'originId'>,
    origin = typeof window !== 'undefined' ? window.location.origin : ''
): string {
    const params = new URLSearchParams();
    params.set('flow', 'referidos');
    params.set('redirectTo', 'referidos');
    if (data.guestSessionId) {
        params.set('guestSessionId', data.guestSessionId);
    }
    if (data.originType) {
        params.set('originType', data.originType);
    }
    if (data.originId) {
        params.set('originId', String(data.originId));
    }
    const query = params.toString();
    return `${origin}/membresia/pago/${encodeURIComponent(data.jwtReferido)}${query ? `?${query}` : ''}`;
}

/** Ruta interna (pathname + query) para react-router navigate. */
export function buildMembresiaReferidosPath(
    data: Pick<ReferralAttributionResult, 'jwtReferido' | 'guestSessionId' | 'originType' | 'originId'>,
): string {
    const full = buildMembresiaReferidosUrl(data);
    if (typeof window === 'undefined') return full;
    return full.replace(window.location.origin, '');
}

/** Valida el token de referido contra el API de membresía (mismo header que el checkout). */
export async function validarTokenReferidoMembresia(
    jwtReferido: string,
    guestSessionId?: string,
): Promise<boolean> {
    const token = String(jwtReferido || '').trim();
    if (!token) return false;

    const headers: Record<string, string> = {
        referidos: token,
        Authorization: `Bearer ${token}`,
    };
    if (guestSessionId) {
        headers['x-guest-session-id'] = guestSessionId;
    }

    try {
        await apiFetch('/api/membresia/seguridad/listar/parametrizacion/membresia/referido', {
            method: 'GET',
            useAuth: false,
            logoutOn401: false,
            headers,
        });
        return true;
    } catch {
        return false;
    }
}

export async function generarEnlaceConAttribution(
    payload: ReferralAttributionPayload = {}
): Promise<ReferralAttributionResult> {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
    return apiFetch(`${API_BASE_URL}/referido/enlace/attribution`, {
        method: 'POST',
        body: {
            originType: 'membresia',
            ...payload,
        },
    });
}

const SHORT_LINK_PATHS: Record<AttributionLinkDestination, string> = {
    home: '/public/render/home',
    productos: '/productos',
    referidos: '/membresia/pago',
};

/** Pipeline A — compra de membresía por referido (pipeline_a / source referidos). */
export function isPipelineReferidosAttribution(
    resolved: ResolvedAttributionLink | null | undefined,
): boolean {
    if (!resolved) return false;
    if (resolved.pipeline === 'referidos') return true;
    if (resolved.pipeline === 'venta') return false;
    if (resolved.pipelineB) return false;
    if (resolved.originType === 'producto') return false;

    const redirect = String(resolved.redirectTo || '').trim().toLowerCase();
    if (resolved.flow === 'referidos' || redirect === 'referidos') return true;
    if (resolved.originType === 'membresia') return true;

    return false;
}

/** Pipeline B — venta de producto / generador enlace ventas. */
export function isPipelineBVentaAttribution(
    resolved: ResolvedAttributionLink | null | undefined,
): boolean {
    if (!resolved) return false;
    if (resolved.pipeline === 'venta') return true;
    if (resolved.pipeline === 'referidos') return false;
    if (isPipelineReferidosAttribution(resolved)) return false;

    const redirect = String(resolved.redirectTo || '').trim().toLowerCase();
    if (resolved.pipelineB || resolved.originType === 'producto') return true;
    if (resolved.flow === 'venta' && resolved.pipelineB !== false) return true;
    if (redirect === 'home' || redirect === 'productos') return true;

    return Boolean(resolved.allowGuestProductCheckout);
}

/** En ruta de membresía referidos siempre priorizar pipeline referidos salvo venta explícita. */
export function resolveAttributionPipelineForPath(
    resolved: ResolvedAttributionLink,
    pathname = '',
): 'referidos' | 'venta' | 'unknown' {
    if (isMembresiaReferidosPath(pathname)) {
        if (isPipelineBVentaAttribution(resolved) && !isPipelineReferidosAttribution(resolved)) {
            return 'venta';
        }
        return 'referidos';
    }
    if (isPipelineReferidosAttribution(resolved)) return 'referidos';
    if (isPipelineBVentaAttribution(resolved)) return 'venta';
    return 'unknown';
}

export function resolvePipelineBDestination(
    resolved: ResolvedAttributionLink,
): string {
    const redirect = String(resolved.redirectTo || 'home').trim().toLowerCase() as AttributionLinkDestination;
    return SHORT_LINK_PATHS[redirect] || SHORT_LINK_PATHS.home;
}

export function isMembresiaReferidosPath(pathname = ''): boolean {
    return /\/membresia\/pago\/?$/i.test(String(pathname || '').replace(/\/$/, ''))
        || /\/membresia\/pago\//i.test(pathname);
}

/** Enlace corto: solo `?at=MABS-XXXXXX`. El sistema resuelve guestSessionId, ref y origen al abrirlo. */
export function buildShortAttributionUrl(
    codigoReferido: string,
    destination: AttributionLinkDestination,
    origin = typeof window !== 'undefined' ? window.location.origin : '',
): string {
    const code = encodeURIComponent(String(codigoReferido || '').trim());
    const path = SHORT_LINK_PATHS[destination] || SHORT_LINK_PATHS.home;
    return `${origin}${path}?at=${code}`;
}

/** Enlace para compartir: corto si hay código de atribución; legacy si no. */
export function buildReferralShareUrl(
    data: Pick<ReferralAttributionResult, 'codigoReferido' | 'jwtReferido' | 'guestSessionId' | 'originType' | 'originId'>,
    destination: AttributionLinkDestination = 'referidos',
    origin = typeof window !== 'undefined' ? window.location.origin : '',
): string {
    if (data.codigoReferido) {
        return buildShortAttributionUrl(data.codigoReferido, destination, origin);
    }
    return buildMembresiaReferidosUrl(data, origin);
}

export async function resolveAttributionByLinkCode(
    linkCode: string,
): Promise<ResolvedAttributionLink | null> {
    const code = String(linkCode || '').trim();
    if (!code) return null;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
    try {
        const response = await apiFetch(
            `${API_BASE_URL}/referido/attribution/resolve/${encodeURIComponent(code)}`,
            {
                method: 'GET',
                useAuth: false,
                logoutOn401: false,
            },
        );
        return (response?.data ?? null) as ResolvedAttributionLink | null;
    } catch {
        return null;
    }
}

export async function resolveAttributionByGuestSession(
    guestSessionId: string,
): Promise<ResolvedAttributionLink | null> {
    const sessionId = String(guestSessionId || '').trim();
    if (!sessionId) return null;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
    try {
        const response = await apiFetch(
            `${API_BASE_URL}/referido/attribution/session/${encodeURIComponent(sessionId)}`,
            {
                method: 'GET',
                useAuth: false,
                logoutOn401: false,
            },
        );
        return (response?.data ?? null) as ResolvedAttributionLink | null;
    } catch {
        return null;
    }
}
