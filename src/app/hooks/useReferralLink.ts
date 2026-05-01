import { useState } from 'react';
import { apiFetch } from '@/app/services/api';

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
    refetch: () => Promise<void>;
}

export const useReferralLink = (): UseReferralLinkReturn => {
    const [referralData, setReferralData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReferralLink = async (): Promise<void> => {
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
                }
            });

            const currentOrigin = window.location.origin;
            const sessionQuery = data?.guestSessionId
                ? `?guestSessionId=${encodeURIComponent(data.guestSessionId)}`
                : '';
            const enlaceCompleto = `${currentOrigin}/membresia/pago/${data.jwtReferido}${sessionQuery}`;

            setReferralData({
                codigoReferido: data.codigoReferido,
                jwtReferido: data.jwtReferido,
                enlaceCompleto,
                guestSessionId: data?.guestSessionId || null,
                attributionId: data?.attributionId || null,
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'No fue posible generar el enlace de referido.';
            setError(errorMessage);
            console.error('Error al obtener enlace de referido:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return {
        referralData,
        loading,
        error,
        refetch: fetchReferralLink
    };
};
