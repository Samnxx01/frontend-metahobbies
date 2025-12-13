import { useState } from 'react';
import { apiFetch } from '@/app/services/api';

interface ReferralData {
    codigoReferido: string;
    jwtReferido: string;
    enlaceCompleto: string;
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
                throw new Error('No se encontró el token de autenticación');
            }

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
            const data = await apiFetch(`${API_BASE_URL}/referido/enlace/${token}`, {
                method: 'GET'
            });

            // Construir el enlace completo usando la ruta actual
            const currentOrigin = window.location.origin;
            const enlaceCompleto = `${currentOrigin}/membresia/pago/${data.jwtReferido}`;

            setReferralData({
                codigoReferido: data.codigoReferido,
                jwtReferido: data.jwtReferido,
                enlaceCompleto
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Error al obtener enlace de referido:', err);
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
