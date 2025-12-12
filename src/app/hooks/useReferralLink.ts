import { useState } from 'react';

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
            const response = await fetch(`${API_BASE_URL}/referido/enlace/${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'metasploit': token
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener el enlace de referido');
            }

            const data = await response.json();

            // Construir el enlace completo
            const frontendUrl = import.meta.env.VITE_FRONTEND_URL ?? 'https://mabs-frontend.vercel.app';
            const enlaceCompleto = `${frontendUrl}/membresia/pago/${data.jwtReferido}`;

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
