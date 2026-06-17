import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { applyResolvedAttributionToStorage, capturePublicAttributionFromSearch } from '@/app/services/publicAttributionParams';
import { resolveAttributionByLinkCode } from '@/app/services/referralAttributionService';

/**
 * Resuelve enlaces cortos `?at=MABS-XXXXXX` contra el API y guarda la atribución en sessionStorage.
 */
export function useAttributionLinkResolver(): void {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const resolvingRef = useRef<string | null>(null);

    useEffect(() => {
        const linkCode = searchParams.get('at')?.trim() || '';
        if (!linkCode) return;
        if (resolvingRef.current === linkCode) return;

        capturePublicAttributionFromSearch(location.search);
        resolvingRef.current = linkCode;
        let cancelled = false;

        void (async () => {
            const resolved = await resolveAttributionByLinkCode(linkCode);
            if (cancelled) return;

            if (!resolved) {
                toast.error('Enlace de atribución no válido o expirado.');
                resolvingRef.current = null;
                return;
            }

            applyResolvedAttributionToStorage(resolved);

            const params = new URLSearchParams(location.search);
            params.delete('at');
            const cleanSearch = params.toString();
            const cleanPath = cleanSearch
                ? `${location.pathname}?${cleanSearch}`
                : location.pathname;

            navigate(cleanPath, { replace: true });
            resolvingRef.current = null;
        })();

        return () => {
            cancelled = true;
        };
    }, [location.pathname, location.search, navigate, searchParams]);
}
