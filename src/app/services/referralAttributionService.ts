import { apiFetch } from '@/app/services/api';
import { getGovernedPath } from '@/app/services/governedNavigation';
import {
    esTokenReferidoAtribucionValido,
    persistAttributionForReferidosFlow,
} from '@/app/services/publicAttributionParams';

export type AttributionLinkDestination = 'home' | 'productos' | 'referidos';

/** Fallback si gobernanza no tiene parametrizado el destino del CTA de afiliados. */
const UNIRME_BASE_PATH_FALLBACK = '/membresia/pago';

/**
 * Base del checkout de membresía por referido, parametrizable en
 * Gobernanza → «Redirects del modulo» → «Programa de afiliados (Quiero Unirme)».
 * El token de Pipeline A siempre se agrega como último segmento de esta base.
 */
export function getUnirmeBasePath(): string {
    const governed = getGovernedPath('afiliadosUnirme', { fallback: UNIRME_BASE_PATH_FALLBACK });
    const normalized = String(governed || UNIRME_BASE_PATH_FALLBACK).trim().replace(/\/+$/, '');
    return normalized.startsWith('/') ? normalized : UNIRME_BASE_PATH_FALLBACK;
}

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
    return `${origin}${getUnirmeBasePath()}/${encodeURIComponent(data.jwtReferido)}${query ? `?${query}` : ''}`;
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

/**
 * Pipeline A sin enlace de invitación: el backend resuelve el sponsor desde
 * USER_REFERIDOS_PADRE y devuelve un token de referido válido para el checkout.
 */
export async function generarEnlaceAttributionPadreDefecto(
    payload: Pick<ReferralAttributionPayload, 'guestSessionId' | 'emailCliente' | 'originId'> = {},
): Promise<ReferralAttributionResult> {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
    return apiFetch(`${API_BASE_URL}/referido/enlace/attribution/padre-defecto`, {
        method: 'POST',
        useAuth: false,
        logoutOn401: false,
        body: payload,
    });
}

/** El destino de referidos sale de gobernanza; home/productos son fijos del módulo público. */
const getShortLinkPath = (destination: AttributionLinkDestination): string => {
    if (destination === 'referidos') return getUnirmeBasePath();
    if (destination === 'productos') return '/productos';
    return '/public/render/home';
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
    return getShortLinkPath(redirect) || getShortLinkPath('home');
}

/** Reconoce el checkout de referidos aunque gobernanza haya movido la base del navigate. */
export function isMembresiaReferidosPath(pathname = ''): boolean {
    const path = String(pathname || '').replace(/\/$/, '');
    const bases = Array.from(new Set([getUnirmeBasePath(), UNIRME_BASE_PATH_FALLBACK]));
    return bases.some((base) => {
        const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}(/|$)`, 'i').test(path);
    });
}

/** Enlace corto: solo `?at=MABS-XXXXXX`. El sistema resuelve guestSessionId, ref y origen al abrirlo. */
export function buildShortAttributionUrl(
    codigoReferido: string,
    destination: AttributionLinkDestination,
    origin = typeof window !== 'undefined' ? window.location.origin : '',
): string {
    const code = encodeURIComponent(String(codigoReferido || '').trim());
    const path = getShortLinkPath(destination);
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

/** Origen del token con el que se entra al checkout de membresía. */
export type AccesoUnirmeOrigen = 'ENLACE_INVITACION' | 'PADRE_DEFECTO';

export interface AccesoUnirmePipelineA {
    ok: boolean;
    /** Ruta interna lista para `navigate`: base gobernada + token de Pipeline A. */
    path: string | null;
    origen: AccesoUnirmeOrigen | null;
}

/**
 * Resuelve el acceso del CTA «Quiero Unirme» garantizando token de Pipeline A.
 *
 * 1. Si la sesión trae un token de invitación, se valida contra el API de membresía
 *    y se comprueba que su atribución sea Pipeline A (una atribución de venta /
 *    Pipeline B no sirve para afiliarse).
 * 2. Si no hay token, está vencido o pertenece a Pipeline B, se genera uno nuevo
 *    contra el patrocinador raíz (USER_REFERIDOS_PADRE).
 *
 * Devuelve la ruta ya construida sobre la base parametrizada en gobernanza.
 */
export async function resolverAccesoUnirmePipelineA(
    ctx: { ref?: string; guestSessionId?: string; originType?: string; originId?: string },
): Promise<AccesoUnirmePipelineA> {
    const ref = String(ctx.ref || '').trim();
    const guestSessionId = String(ctx.guestSessionId || '').trim();

    let sesionEsPipelineB = false;

    if (ref && esTokenReferidoAtribucionValido(ref)) {
        const resuelta = guestSessionId
            ? await resolveAttributionByGuestSession(guestSessionId)
            : null;
        const esPipelineA = !resuelta || isPipelineReferidosAttribution(resuelta);
        sesionEsPipelineB = Boolean(resuelta) && !esPipelineA;

        if (esPipelineA && await validarTokenReferidoMembresia(ref, guestSessionId || undefined)) {
            persistAttributionForReferidosFlow({
                ref,
                guestSessionId,
                originType: ctx.originType || 'membresia',
                originId: ctx.originId || '',
                flow: 'referidos',
            });

            return {
                ok: true,
                path: buildMembresiaReferidosPath({
                    jwtReferido: ref,
                    guestSessionId,
                    originType: ctx.originType || 'membresia',
                    originId: ctx.originId || null,
                }),
                origen: 'ENLACE_INVITACION',
            };
        }
    }

    try {
        const enlace = await generarEnlaceAttributionPadreDefecto({
            // Una sesión ya tomada por Pipeline B no se reutiliza para no pisar esa atribución.
            guestSessionId: sesionEsPipelineB ? undefined : (guestSessionId || undefined),
        });

        persistAttributionForReferidosFlow({
            ref: enlace.jwtReferido,
            guestSessionId: enlace.guestSessionId,
            originType: enlace.originType || 'membresia',
            originId: enlace.originId ? String(enlace.originId) : '',
            flow: 'referidos',
        });

        return {
            ok: true,
            path: buildMembresiaReferidosPath({
                jwtReferido: enlace.jwtReferido,
                guestSessionId: enlace.guestSessionId,
                originType: enlace.originType || 'membresia',
                originId: enlace.originId ?? null,
            }),
            origen: 'PADRE_DEFECTO',
        };
    } catch {
        return { ok: false, path: null, origen: null };
    }
}
