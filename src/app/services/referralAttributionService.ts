import { apiFetch } from '@/app/services/api';

export interface ReferralAttributionPayload {
    guestSessionId?: string;
    emailCliente?: string;
    originType?: string;
    originId?: string | null;
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

    const headers: Record<string, string> = { referidos: token };
    if (guestSessionId) {
        headers['x-guest-session-id'] = guestSessionId;
    }

    try {
        await apiFetch('/api/membresia/seguridad/crear/parametrizacion/membresia', {
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
