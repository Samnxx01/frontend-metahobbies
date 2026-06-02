import { useState, useCallback } from 'react';
import { apiFetch } from '@/app/services/api';
import {
    buildMembresiaReferidosUrl,
    type ReferralAttributionResult,
} from '@/app/services/referralAttributionService';

interface ReferralData {
    codigoReferido: string;
    jwtReferido: string;
    enlaceCompleto: string;
    guestSessionId?: string | null;
    attributionId?: string | null;
}

interface UseReferralLinkReturn {
    referralData: ReferralData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<ReferralData>;
}

const mapAttributionToReferralData = (data: ReferralAttributionResult): ReferralData => ({
    codigoReferido: data.codigoReferido,
    jwtReferido: data.jwtReferido,
    enlaceCompleto: buildMembresiaReferidosUrl(data),
    guestSessionId: data?.guestSessionId || null,
    attributionId: data?.attributionId || null,
});

export const useReferralLink = (): UseReferralLinkReturn => {
    const [referralData, setReferralData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReferralLink = useCallback(async (): Promise<ReferralData> => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No se encontro la sesion autenticada. Inicia sesion nuevamente para generar tu enlace.');
            }

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const data = await apiFetch(`${API_BASE_URL}/referido/enlace/attribution`, {
                method: 'POST',
                body: {
                    originType: 'membresia',
                },
            }) as ReferralAttributionResult;

            const mapped = mapAttributionToReferralData(data);
            setReferralData(mapped);
            return mapped;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'No fue posible generar el enlace de referido.';
            setError(errorMessage);
            console.error('Error al obtener enlace de referido:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        referralData,
        loading,
        error,
        refetch: fetchReferralLink,
    };
};
