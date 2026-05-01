import { useEffect, useState } from 'react';
import { obtenerBrandingPublico } from '@/app/services/brandingWidget';

export default function LoadingScreen(): React.ReactElement {
    const [backgroundUrl, setBackgroundUrl] = useState<string>('');

    useEffect(() => {
        const cargarFondo = async (): Promise<void> => {
            try {
                const branding = await obtenerBrandingPublico();
                const loadingBackground = branding?.widgets?.loadingBackground;
                const nextBackgroundUrl = String(loadingBackground?.imageUrl || '').trim();
                setBackgroundUrl(loadingBackground?.enabled !== false ? nextBackgroundUrl : '');
            } catch {
                setBackgroundUrl('');
            }
        };

        void cargarFondo();
    }, []);

    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center bg-background bg-center bg-cover z-1301"
            style={{
                backgroundImage: backgroundUrl
                    ? `linear-gradient(rgba(255,255,255,.18), rgba(255,255,255,.18)), url("${backgroundUrl}")`
                    : undefined
            }}
        >
            {backgroundUrl && <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />}
            <div
                className="relative z-10 w-24 h-24 flex items-center justify-center"
            >
                <div
                    className="absolute w-16 h-16 border-4 border-t-4 border-primary border-t-transparent rounded-full animate-spin"
                ></div>
                <img
                    src="/assets/logo.png"
                    alt="Logo"
                    className="w-10 h-auto animate-pulse"
                />
            </div>
            <p
                className="relative z-10 mt-4 text-xl font-medium bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent animate-fadeInOut"
            >
                Cargando...
            </p>

            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: .5; }
                    }
                    @keyframes fadeInOut {
                        0%, 100% { opacity: 0.8; }
                        50% { opacity: 1; }
                    }
                    .animate-fadeInOut {
                        animation: fadeInOut 2s ease-in-out infinite;
                    }
                `}
            </style>
        </div>
    );
}
