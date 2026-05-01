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
