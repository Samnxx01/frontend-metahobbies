import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Truck } from "lucide-react";
import type { HeroBannerProps } from '@/types/components';
import {
    getPublicidadImageUrls,
    getDiapositivaImageUrl,
    obtenerPublicidadesActivas,
    type PublicidadModal,
} from '@/app/services/contenidoDestacadoService';
import { sanitizeRichText, richTextToPlain } from '@/app/utils/sanitizeRichText';

interface Slide {
    id: string;
    /** Titulo y bajada con los estilos parametrizados en el panel. */
    titleHtml: string;
    subtitleHtml: string;
    titlePlain: string;
    discount: string;
    image: string;
    cta: string;
    ctaLink: string;
    badge: string;
}

/**
 * Cada contenido activo aporta sus imágenes al carrusel: una diapositiva por
 * imagen (hasta 4), todas con los textos y el boton del registro.
 */
const toSlides = (publicidad: PublicidadModal, index: number): Slide[] => {
    const base = {
        titleHtml: sanitizeRichText(publicidad.tittle),
        subtitleHtml: sanitizeRichText(publicidad.body),
        titlePlain: richTextToPlain(publicidad.tittle),
        discount: publicidad.price ? String(publicidad.price) : '',
        cta: richTextToPlain(publicidad.buttonText),
        ctaLink: String(publicidad.buttonLink || '').trim(),
        badge: String(publicidad.subtittle || '').trim(),
    };

    const baseId = String(publicidad.iud || publicidad._id || index);

    // Diapositivas parametrizadas: cada una trae su propio contenido.
    const diapositivas = (publicidad.diapositivas || [])
        .slice()
        .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));

    if (diapositivas.length) {
        return diapositivas.map((diapo, posicion) => ({
            id: `${baseId}-d${posicion}`,
            titleHtml: sanitizeRichText(diapo.tittle) || base.titleHtml,
            subtitleHtml: sanitizeRichText(diapo.body) || base.subtitleHtml,
            titlePlain: richTextToPlain(diapo.tittle) || base.titlePlain,
            discount: String(diapo.price || '').trim() || base.discount,
            // Boton propio de la diapositiva: no hereda el del registro para que
            // cada una pueda llevar su propio texto y destino (o ninguno).
            cta: richTextToPlain(diapo.buttonText),
            ctaLink: String(diapo.buttonLink || '').trim(),
            badge: String(diapo.subtittle || '').trim() || base.badge,
            image: getDiapositivaImageUrl(diapo) || '',
        }));
    }

    // Sin diapositivas: cada imagen de la galería es una diapositiva.
    const imagenes = getPublicidadImageUrls(publicidad);
    if (!imagenes.length) return [{ ...base, id: baseId, image: '' }];

    return imagenes.map((image, posicion) => ({
        ...base,
        id: `${baseId}-${posicion}`,
        image,
    }));
};

export default function HeroBanner({
    onCtaClick
}: HeroBannerProps = {}): React.ReactElement | null {
    const [activeSlide, setActiveSlide] = useState<number>(0);
    const [slides, setSlides] = useState<Slide[]>([]);
    const navigate = useNavigate();
    const location = useLocation();

    // Las diapositivas son los contenidos activos con presentacion CARRUSEL
    // asociados a esta ruta: nada va quemado en el componente.
    useEffect(() => {
        let activo = true;

        const cargarSlides = async (): Promise<void> => {
            const consultar = (comoVisitante: boolean, conRuta: boolean) => obtenerPublicidadesActivas({
                path: location.pathname,
                // Sin `seccionPath` se resuelven los carruseles que no tienen
                // ruta asignada; al ser de tipo CARRUSEL su lugar es este banner.
                ...(conRuta ? { seccionPath: location.pathname } : {}),
                presentacion: 'CARRUSEL',
                comoVisitante,
            });

            // Primero el carrusel propio de la ruta; si no hay, el que no tiene ruta.
            const intentar = async (comoVisitante: boolean): Promise<PublicidadModal[]> => {
                const porRuta = await consultar(comoVisitante, true);
                return porRuta.length ? porRuta : consultar(comoVisitante, false);
            };

            let publicidades: PublicidadModal[] = [];
            try {
                publicidades = await intentar(false);
            } catch (error) {
                console.error('No se pudo cargar el carrusel con la sesion activa:', error);
            }

            if (!publicidades.length) {
                try {
                    publicidades = await intentar(true);
                } catch (error) {
                    console.error('No se pudo cargar el carrusel:', error);
                }
            }

            if (!activo) return;
            setSlides(publicidades.flatMap(toSlides));
            setActiveSlide(0);
        };

        void cargarSlides();

        return () => {
            activo = false;
        };
    }, [location.pathname]);

    const nextSlide = (): void => {
        setActiveSlide((prev) => (slides.length ? (prev + 1) % slides.length : 0));
    };

    const prevSlide = (): void => {
        setActiveSlide((prev) => (slides.length ? (prev - 1 + slides.length) % slides.length : 0));
    };

    const handleCtaClick = (slide: Slide): void => {
        if (slide.ctaLink) {
            if (/^https?:\/\//i.test(slide.ctaLink)) {
                window.location.assign(slide.ctaLink);
                return;
            }
            navigate(slide.ctaLink);
            return;
        }

        if (onCtaClick) onCtaClick();
    };

    useEffect(() => {
        if (slides.length < 2) return;
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [activeSlide, slides.length]);

    // Sin contenidos activos el carrusel no se muestra.
    if (!slides.length) return null;

    return (
        <div className="relative w-full overflow-hidden bg-background py-4 md:py-8">
            <div className="relative mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-8">
                <div
                    className="relative flex min-h-[360px] w-full items-center overflow-hidden rounded-lg bg-card bg-linear-to-br from-card to-muted sm:min-h-[470px] md:min-h-[520px]"
                >
                    <div
                        className="flex w-full transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                    >
                        {slides.map((slide) => (
                            <div
                                key={slide.id}
                                className="flex min-h-[360px] min-w-full max-w-full flex-col items-center justify-center gap-4 overflow-hidden px-6 py-6 text-foreground sm:min-h-[470px] sm:gap-5 sm:px-16 md:min-h-[520px] md:flex-row md:gap-8 md:px-14 md:py-10 lg:px-20"
                            >
                                <div className="relative z-10 flex min-w-0 w-full flex-1 flex-col items-center text-center md:items-start md:text-left">
                                    {slide.badge ? (
                                        <span className="mb-3 inline-flex min-h-7 max-w-full items-center rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                                            {slide.badge}
                                        </span>
                                    ) : null}
                                    {slide.discount ? (
                                        <span className="mb-2 text-lg font-extrabold text-primary sm:text-xl">
                                            {slide.discount}
                                        </span>
                                    ) : null}
                                    {slide.titleHtml ? (
                                        <h1
                                            className="mb-3 max-w-full break-words text-[clamp(1.65rem,8vw,2.25rem)] font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl"
                                            dangerouslySetInnerHTML={{ __html: slide.titleHtml }}
                                        />
                                    ) : null}
                                    {slide.subtitleHtml ? (
                                        <div className="mb-4 flex max-w-full items-start justify-center gap-2 md:justify-start">
                                            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground md:h-6 md:w-6" />
                                            <div
                                                className="min-w-0 break-words text-sm font-medium text-muted-foreground sm:text-base md:text-lg"
                                                dangerouslySetInnerHTML={{ __html: slide.subtitleHtml }}
                                            />
                                        </div>
                                    ) : null}
                                    {slide.cta ? (
                                        <Button
                                            onClick={() => handleCtaClick(slide)}
                                            className="max-w-full rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 sm:px-8 sm:py-3 sm:text-base"
                                        >
                                            {slide.cta}
                                        </Button>
                                    ) : null}
                                </div>

                                {slide.image ? (
                                    <div className="relative z-0 flex min-w-0 w-full flex-1 items-center justify-center">
                                        <img
                                            src={slide.image}
                                            alt={slide.titlePlain}
                                            className="h-auto max-h-[180px] w-full max-w-[260px] object-contain transition-transform duration-300 ease-in-out sm:max-h-[230px] sm:max-w-xs md:max-h-[340px] md:max-w-sm md:perspective-[1000px] md:rotate-y-[-5deg] md:hover:rotate-y-0"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    {slides.length > 1 ? (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 z-20 -translate-y-1/2 bg-background/70 hover:bg-background/90 sm:left-4"
                                onClick={prevSlide}
                                aria-label="Anterior"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 z-20 -translate-y-1/2 bg-background/70 hover:bg-background/90 sm:right-4"
                                onClick={nextSlide}
                                aria-label="Siguiente"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </>
                    ) : null}
                </div>

                <div className="mt-4 flex justify-center gap-2 sm:mt-6">
                    {(slides.length > 1 ? slides : []).map((_, index) => (
                        <div
                            key={index}
                            onClick={() => setActiveSlide(index)}
                            className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${index === activeSlide ? "bg-primary w-4 h-4" : "bg-muted-foreground/30"}
                                hover:scale-125`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
