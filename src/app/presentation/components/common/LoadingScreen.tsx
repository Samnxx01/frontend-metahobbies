import { useEffect, useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { obtenerBrandingPublico } from '@/app/services/brandingWidget';

const DEFAULT_LOGO_URL = '/assets/logo.png';

const isPublicPath = (): boolean => {
    if (typeof window === 'undefined') return true;
    const pathname = window.location.pathname.toLowerCase();
    return !localStorage.getItem('token') || pathname.startsWith('/public/') || pathname === '/' || pathname.includes('/registro') || pathname.includes('/login');
};

const resolveLogoUrl = (logo: any): string => {
    if (!logo) return DEFAULT_LOGO_URL;
    if (typeof logo.dataUrl === 'string' && logo.dataUrl.trim()) return logo.dataUrl;
    if (typeof logo.url === 'string' && logo.url.trim()) return logo.url;
    if (typeof logo.imageUrl === 'string' && logo.imageUrl.trim()) return logo.imageUrl;
    if (typeof logo.logoUrl === 'string' && logo.logoUrl.trim()) return logo.logoUrl;
    if (typeof logo.base64 === 'string' && logo.base64.trim() && typeof logo.mimetype === 'string' && logo.mimetype.trim()) {
        return `data:${logo.mimetype};base64,${logo.base64}`;
    }
    return DEFAULT_LOGO_URL;
};

export default function LoadingScreen(): React.ReactElement {
    const [backgroundUrl, setBackgroundUrl] = useState<string>('');
    const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO_URL);
    const [publicMode] = useState<boolean>(() => isPublicPath());

    useEffect(() => {
        const cargarRecursos = async (): Promise<void> => {
            const [brandingResult, logoResult] = await Promise.allSettled([
                obtenerBrandingPublico(),
                apiFetch('/api/config/parametrizacion/listar/logos/coporativo', {
                    method: 'GET',
                    useAuth: false,
                    logoutOn401: false
                })
            ]);

            if (brandingResult.status === 'fulfilled') {
                const branding = brandingResult.value;
                const loadingBackground = branding?.widgets?.loadingBackground;
                const nextBackgroundUrl = String(loadingBackground?.imageUrl || '').trim();
                setBackgroundUrl(loadingBackground?.enabled !== false ? nextBackgroundUrl : '');
            } else {
                setBackgroundUrl('');
            }

            if (logoResult.status === 'fulfilled') {
                setLogoUrl(resolveLogoUrl((logoResult.value as any)?.logo));
            } else {
                setLogoUrl(DEFAULT_LOGO_URL);
            }
        };

        void cargarRecursos();
    }, []);

    return (
        <div
            className="fixed inset-0 z-[1301] flex items-center justify-center overflow-hidden bg-background bg-center bg-cover px-5 text-center"
            style={{
                backgroundImage: backgroundUrl
                    ? `linear-gradient(135deg, rgba(255,255,255,.92), rgba(255,255,255,.72)), url("${backgroundUrl}")`
                    : undefined
            }}
        >
            {backgroundUrl && <div className="absolute inset-0 bg-background/20 backdrop-blur-[3px]" />}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.16),transparent_34%),linear-gradient(135deg,hsl(var(--background)/0.98),hsl(var(--muted)/0.72)_52%,hsl(var(--background)/0.96))]" />
            <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-primary/10">
                <div className="h-full w-1/3 animate-loadingBar rounded-r-full bg-primary shadow-[0_0_28px_hsl(var(--primary)/0.65)]" />
            </div>

            <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
                <div className="mb-6 flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground ring-1 ring-border/70 backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    {publicMode ? 'Vista publica' : 'Vista privada'}
                </div>

                <div className="relative mb-7 flex h-40 w-40 items-center justify-center">
                    <div className="absolute inset-0 rounded-[2rem] bg-primary/10 blur-2xl animate-softPulse" />
                    <div className="absolute -inset-3 rounded-[2.4rem] border border-primary/15" />
                    <div className="absolute -inset-3 rounded-[2.4rem] border-4 border-primary/10 border-t-primary animate-spin" />
                    <div className="relative flex h-36 w-36 items-center justify-center rounded-[1.8rem] bg-background/90 shadow-2xl shadow-primary/20 ring-1 ring-primary/15 backdrop-blur-xl">
                        <img
                            src={logoUrl}
                            alt="Logo parametrizado"
                            className="h-24 w-24 object-contain drop-shadow-sm"
                            onError={() => setLogoUrl(DEFAULT_LOGO_URL)}
                        />
                    </div>
                </div>

                <div className="w-full space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                            {publicMode ? 'Cargando vista publica' : 'Cargando vista'}
                        </h1>
                        <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                            Preparando contenido, colores y experiencia visual.
                        </p>
                    </div>

                    <div className="mx-auto grid w-full max-w-sm gap-3">
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted/90 ring-1 ring-border/50">
                            <div className="h-full w-2/3 animate-loadingBar rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.45)]" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 px-8">
                            <span className="h-1.5 rounded-full bg-primary/30" />
                            <span className="h-1.5 rounded-full bg-secondary/50" />
                            <span className="h-1.5 rounded-full bg-muted-foreground/20" />
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: .72; transform: scale(.96); }
                    }
                    @keyframes loadingBar {
                        0% { transform: translateX(-110%); }
                        100% { transform: translateX(330%); }
                    }
                    @keyframes softPulse {
                        0%, 100% { opacity: .58; transform: scale(.94); }
                        50% { opacity: 1; transform: scale(1.06); }
                    }
                    .animate-loadingBar {
                        animation: loadingBar 1.6s ease-in-out infinite;
                    }
                    .animate-softPulse {
                        animation: softPulse 2.4s ease-in-out infinite;
                    }
                `}
            </style>
        </div>
    );
}
