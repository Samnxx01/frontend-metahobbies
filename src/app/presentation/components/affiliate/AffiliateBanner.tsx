import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2 } from "lucide-react";

import type { AffiliateBannerProps } from '@/types/components';
import { resolvePublicAttributionContext } from "@/app/services/publicAttributionParams";
import { resolverAccesoUnirmePipelineA } from "@/app/services/referralAttributionService";
import {
    getPublicidadImageUrls,
    obtenerPublicidadesActivas,
    obtenerTiposPublicidad,
    type PublicidadModal,
} from "@/app/services/contenidoDestacadoService";
import { sanitizeRichText, richTextToPlain } from "@/app/utils/sanitizeRichText";

/** Contenido del banner administrado desde el panel de Publicidad. */
interface BannerContenido {
    badge: string;
    tituloHtml: string;
    descripcionHtml: string;
    ctaText: string;
    /** Ruta parametrizada del CTA; el token de Pipeline A se conserva igual. */
    ctaLink: string;
    imagen: string;
}

/** Compara rutas ignorando barra final, para validar el destino parametrizado. */
const mismaRuta = (a: string, b: string): boolean => {
    const norm = (valor: string) => String(valor || '').split('?')[0].replace(/\/+$/, '') || '/';
    return norm(a) === norm(b);
};

export default function AffiliateBanner({
    title,
    description,
    ctaText,
    onCtaClick
}: AffiliateBannerProps = {}): React.ReactElement | null {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [contenido, setContenido] = useState<BannerContenido | null>(null);
    const [imagenFallida, setImagenFallida] = useState(false);

    // Todo el contenido proviene del registro de Publicidad de tipo BANNER
    // asociado a esta ruta: no hay textos ni imagen por defecto en el código.
    useEffect(() => {
        let activo = true;

        const cargar = async (): Promise<void> => {
            try {
                const tipos = await obtenerTiposPublicidad();
                const esBanner = (codigo?: string): boolean =>
                    tipos.find((tipo) => tipo.codigo === codigo)?.visual?.render === 'BANNER'
                    || codigo === 'BANNER';

                const consultar = (comoVisitante: boolean) => obtenerPublicidadesActivas({
                    path: location.pathname,
                    seccionPath: location.pathname,
                    comoVisitante,
                });

                const elegir = (lista: PublicidadModal[]): PublicidadModal | null =>
                    lista.find((item) => item.estado && esBanner(item.presentacion)) || null;

                let publicidad = elegir(await consultar(false));
                if (!publicidad) publicidad = elegir(await consultar(true));
                if (!activo) return;

                setContenido(publicidad ? {
                    badge: String(publicidad.subtittle || '').trim(),
                    tituloHtml: sanitizeRichText(publicidad.tittle),
                    descripcionHtml: sanitizeRichText(publicidad.body),
                    ctaText: richTextToPlain(publicidad.buttonText),
                    ctaLink: String(publicidad.buttonLink || '').trim(),
                    imagen: getPublicidadImageUrls(publicidad)[0] || '',
                } : null);
            } catch (error) {
                if (!activo) return;
                console.error('No se pudo cargar el banner de afiliados:', error);
                setContenido(null);
            }
        };

        void cargar();

        return () => {
            activo = false;
        };
    }, [location.pathname]);

    const handleCtaClick = async (): Promise<void> => {
        if (onCtaClick) {
            onCtaClick();
            return;
        }

        const ctx = resolvePublicAttributionContext(
            searchParams.toString() ? `?${searchParams.toString()}` : window.location.search,
        );

        setLoading(true);
        const alertaEnCurso = toast.loading('Validando tu enlace de invitacion…');

        try {
            // El checkout siempre exige token de Pipeline A: se reutiliza el de la
            // invitación o se genera contra el patrocinador raíz. El destino base
            // sale de Gobernanza → Redirects del modulo.
            const acceso = await resolverAccesoUnirmePipelineA(ctx);

            if (!acceso.ok || !acceso.path) {
                toast.update(alertaEnCurso, {
                    render: 'No fue posible iniciar tu registro al programa. Intenta de nuevo en unos minutos.',
                    type: 'error',
                    isLoading: false,
                    autoClose: 6000,
                });
                return;
            }

            // La ruta puede parametrizarse desde el panel, pero el token generado
            // manda: si el destino configurado no coincide con el que habilita el
            // token, se navega al resuelto para no romper la atribución.
            const destinoParametrizado = contenido?.ctaLink || '';
            if (destinoParametrizado && !mismaRuta(destinoParametrizado, acceso.path)) {
                console.warn(
                    `[AffiliateBanner] El destino parametrizado (${destinoParametrizado}) no coincide con la ruta que habilita el token (${acceso.path}). Se usa la ruta con token.`,
                );
            }

            // Se conserva el query del acceso (token de Pipeline A) sobre la ruta final.
            const [rutaResuelta, queryResuelto = ''] = acceso.path.split('?');
            const rutaFinal = destinoParametrizado && mismaRuta(destinoParametrizado, acceso.path)
                ? destinoParametrizado.split('?')[0]
                : rutaResuelta;

            toast.update(alertaEnCurso, {
                render: 'Enlace validado. Te llevamos al registro del programa.',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
            });

            navigate(queryResuelto ? `${rutaFinal}?${queryResuelto}` : rutaFinal);
        } catch (error: any) {
            // Falla de red o del servicio de atribución: la transacción no se completó.
            console.error('[AffiliateBanner] Error al resolver el acceso al programa:', error);
            toast.update(alertaEnCurso, {
                render: error?.message || 'Ocurrio un error al procesar tu registro. Intenta de nuevo.',
                type: 'error',
                isLoading: false,
                autoClose: 6000,
            });
        } finally {
            setLoading(false);
        }
    };

    // Las props siguen permitiendo un override puntual desde quien lo monte.
    const tituloHtml = contenido?.tituloHtml || (title ? sanitizeRichText(title) : '');
    const descripcionHtml = contenido?.descripcionHtml || (description ? sanitizeRichText(description) : '');
    const textoBoton = contenido?.ctaText || ctaText || '';
    const imagen = contenido?.imagen || '';

    // Sin contenido administrado el banner no se muestra: nada queda quemado.
    if (!richTextToPlain(tituloHtml) && !richTextToPlain(descripcionHtml)) {
        return null;
    }

    const hayImagen = Boolean(imagen) && !imagenFallida;

    return (
        <div className="bg-background py-12 md:py-24">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                    className={`grid grid-cols-1 items-center gap-8 overflow-hidden rounded-xl bg-card shadow-2xl dark:bg-card md:gap-12 ${hayImagen ? 'md:grid-cols-2' : ''}`}
                >
                    {hayImagen ? (
                        <div className="order-1 h-[250px] w-full min-h-[250px] bg-muted/50 sm:h-[350px] md:h-full md:min-h-[450px]">
                            <img
                                src={imagen}
                                alt={richTextToPlain(tituloHtml)}
                                className="h-full w-full object-cover"
                                onError={() => setImagenFallida(true)}
                            />
                        </div>
                    ) : null}

                    <div className="order-2 space-y-4 p-6 text-center md:p-12 md:text-left">
                        {contenido?.badge ? (
                            <Badge
                                className="mb-2 border-primary/20 bg-primary/20 font-semibold text-primary transition-colors hover:bg-primary/30"
                                variant="outline"
                            >
                                {contenido.badge}
                            </Badge>
                        ) : null}

                        {tituloHtml ? (
                            <h2
                                className="text-2xl font-extrabold leading-tight text-foreground dark:text-foreground sm:text-3xl md:text-4xl"
                                dangerouslySetInnerHTML={{ __html: tituloHtml }}
                            />
                        ) : null}

                        {descripcionHtml ? (
                            <div
                                className="mx-auto max-w-xl pb-4 text-sm text-muted-foreground dark:text-muted-foreground sm:text-base md:mx-0"
                                dangerouslySetInnerHTML={{ __html: descripcionHtml }}
                            />
                        ) : null}

                        {textoBoton ? (
                            <Button
                                id="btn-cta-banner-afiliados"
                                onClick={() => void handleCtaClick()}
                                disabled={loading}
                                className="h-auto rounded-lg px-6 py-3 text-base font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Validando enlace…
                                    </>
                                ) : (
                                    <>
                                        {textoBoton}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
