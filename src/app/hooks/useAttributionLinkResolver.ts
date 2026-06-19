import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    appendPublicAttributionToInternalPath,
    applyResolvedAttributionToStorage,
    capturePublicAttributionFromSearch,
    getAttributionLinkCodeFromSearch,
    persistAttributionForReferidosFlow,
} from '@/app/services/publicAttributionParams';
import {
    isMembresiaReferidosPath,
    resolveAttributionByLinkCode,
    resolveAttributionPipelineForPath,
    resolvePipelineBDestination,
} from '@/app/services/referralAttributionService';

function stripShortLinkParams(search: string): string {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    params.delete('at');
    params.delete('st');
    const next = params.toString();
    return next ? `?${next}` : '';
}

function applyReferidosAttribution(
    resolved: NonNullable<Awaited<ReturnType<typeof resolveAttributionByLinkCode>>>,
): void {
    applyResolvedAttributionToStorage(resolved);
    persistAttributionForReferidosFlow({
        ref: resolved.ref || '',
        guestSessionId: resolved.guestSessionId || '',
        originType: resolved.originType || 'membresia',
        originId: resolved.originId || '',
        flow: 'referidos',
    });
}

/**
 * Resuelve `?at=MABS-XXXX` solo para atribución.
 * Pipeline referidos (membresía) y Pipeline B (venta) quedan separados por `pipeline` del API.
 */
export function useAttributionLinkResolver(): void {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestSeq = useRef(0);

    useEffect(() => {
        const linkCode =
            searchParams.get('at')?.trim()
            || searchParams.get('st')?.trim()
            || getAttributionLinkCodeFromSearch(location.search)
            || '';
        if (!linkCode) return;

        capturePublicAttributionFromSearch(location.search);
        const seq = ++requestSeq.current;

        void (async () => {
            const resolved = await resolveAttributionByLinkCode(linkCode);
            if (seq !== requestSeq.current) return;

            const cleanSearch = stripShortLinkParams(location.search);
            const cleanPath = `${location.pathname}${cleanSearch}`;

            if (!resolved) {
                toast.error('Enlace de atribución no válido o expirado.');
                navigate(cleanPath, { replace: true });
                return;
            }

            const pipeline = resolveAttributionPipelineForPath(resolved, location.pathname);

            if (pipeline === 'venta') {
                applyResolvedAttributionToStorage(resolved);
                const destination = appendPublicAttributionToInternalPath(
                    resolvePipelineBDestination(resolved),
                );
                if (isMembresiaReferidosPath(location.pathname)) {
                    navigate(destination, { replace: true });
                } else {
                    navigate(cleanPath, { replace: true });
                }
                return;
            }

            if (pipeline === 'referidos') {
                applyReferidosAttribution(resolved);
                navigate(cleanPath, { replace: true });
                return;
            }

            toast.error('No se pudo identificar el tipo de enlace de atribución.');
            navigate(cleanPath, { replace: true });
        })();
    }, [location.pathname, location.search, navigate, searchParams]);
}
