import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from 'lucide-react';
import type { PuntoClaveItemProps } from "@/types/components";
import { sanitizeRichText, richTextToPlain } from '@/app/utils/sanitizeRichText';
import { getPublicidadImageUrl, type PublicidadModal } from '@/app/services/contenidoDestacadoService';

export interface AboutUsContenido {
    imagen: string;
    badge: string;
    tituloHtml: string;
    descripcionHtml: string;
    puntosClave: string[];
    botonTexto: string;
    botonLink: string;
}

/** Traduce el registro de Publicidad al contenido que consume la sección. */
export const mapPublicidadToAboutUs = (publicidad: PublicidadModal): AboutUsContenido => ({
    imagen: getPublicidadImageUrl(publicidad),
    badge: String(publicidad.subtittle || '').trim(),
    tituloHtml: sanitizeRichText(publicidad.tittle),
    descripcionHtml: sanitizeRichText(publicidad.body),
    puntosClave: (publicidad.puntosClave || [])
        .map((punto) => String(punto || '').trim())
        .filter(Boolean),
    botonTexto: richTextToPlain(publicidad.buttonText),
    botonLink: String(publicidad.buttonLink || '').trim(),
});

/** Un contenido sin título ni descripción no alcanza para renderizar la sección. */
export const tieneContenidoRenderizable = (contenido: AboutUsContenido | null): boolean =>
    !!contenido && (!!richTextToPlain(contenido.tituloHtml) || !!richTextToPlain(contenido.descripcionHtml));

const PuntoClaveItem: React.FC<PuntoClaveItemProps> = ({ punto, index }) => (
    <div key={index} className="flex items-start gap-2">
        <CheckCircle className="w-5 h-5 flex-shrink-0 text-secondary mt-0.5" />
        <p className="font-medium leading-snug text-sm">
            {punto}
        </p>
    </div>
);

interface AboutUsViewProps {
    contenido: AboutUsContenido;
    onBotonClick?: () => void;
}

/**
 * Vista presentacional de la sección. La comparten la página pública y la
 * vista previa del panel administrativo, para que ambas se vean igual.
 */
export default function AboutUsView({ contenido, onBotonClick }: AboutUsViewProps): React.ReactElement {
    const [imagenFallida, setImagenFallida] = React.useState(false);

    React.useEffect(() => {
        setImagenFallida(false);
    }, [contenido.imagen]);

    return (
        <section className="py-12 md:py-24 bg-background">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">

                    {/* Sección de la Imagen (Columna 1) */}
                    {contenido.imagen ? (
                        <div className="md:col-span-4 order-1 md:order-2 flex justify-center">
                            <div className="rounded-md overflow-hidden shadow-lg w-full max-w-xs sm:max-w-sm bg-card h-[240px] sm:h-[380px] lg:h-[550px]">
                                {imagenFallida ? (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-6 text-center text-sm text-muted-foreground">
                                        <span>No se pudo cargar la imagen.</span>
                                        <span className="break-all text-xs opacity-70">{contenido.imagen}</span>
                                    </div>
                                ) : (
                                    <img
                                        src={contenido.imagen}
                                        alt={richTextToPlain(contenido.tituloHtml)}
                                        className="w-full h-full object-contain p-3 block"
                                        onError={() => setImagenFallida(true)}
                                    />
                                )}
                            </div>
                        </div>
                    ) : null}

                    {/* Sección del Contenido (Columna 2) */}
                    <div className={contenido.imagen ? 'md:col-span-8 order-2 md:order-1' : 'md:col-span-12'}>

                        {/* Chip / Badge */}
                        {contenido.badge ? (
                            <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/20 text-primary font-semibold hover:bg-primary/20">
                                {contenido.badge}
                            </Badge>
                        ) : null}

                        {/* Título Principal */}
                        {contenido.tituloHtml ? (
                            <h2
                                className="font-extrabold mt-2 mb-4 leading-tight text-foreground text-2xl sm:text-4xl lg:text-5xl"
                                dangerouslySetInnerHTML={{ __html: contenido.tituloHtml }}
                            />
                        ) : null}

                        {/* Descripción */}
                        {contenido.descripcionHtml ? (
                            <div
                                className="text-muted-foreground mb-6 text-sm sm:mb-8 sm:text-base lg:text-lg"
                                dangerouslySetInnerHTML={{ __html: contenido.descripcionHtml }}
                            />
                        ) : null}

                        {/* Puntos Clave */}
                        {contenido.puntosClave.length ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-foreground">
                                {contenido.puntosClave.map((punto: string, index: number) => (
                                    <PuntoClaveItem key={index} punto={punto} index={index} />
                                ))}
                            </div>
                        ) : null}

                        {/* Botón */}
                        {contenido.botonTexto ? (
                            <div className="mt-8 sm:mt-10">
                                <Button
                                    onClick={onBotonClick}
                                    className="w-full rounded-3xl px-6 py-3 text-sm font-semibold shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:px-10 sm:text-base"
                                >
                                    {contenido.botonTexto}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
