import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { richTextToPlain } from '@/app/utils/sanitizeRichText';
import type { PublicidadPosicion, TipoPublicidadVisual } from '@/app/services/contenidoDestacadoService';
import type { AboutUsContenido } from './AboutUsView';

interface AboutUsWidgetProps {
    contenido: AboutUsContenido;
    onBotonClick?: () => void;
    /** Anclaje y ancho máximo parametrizados en el tipo de publicidad. */
    visual: TipoPublicidadVisual;
}

/**
 * Anclaje en pantallas medianas en adelante. En móvil la tarjeta flotante se
 * fija abajo ocupando el ancho disponible, que es lo cómodo en un teléfono.
 */
const CLASES_POSICION: Record<PublicidadPosicion, string> = {
    SUPERIOR_IZQUIERDA: 'sm:top-4 sm:bottom-auto sm:left-4 sm:right-auto sm:translate-x-0 sm:translate-y-0',
    SUPERIOR_CENTRO: 'sm:top-4 sm:bottom-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:translate-y-0',
    SUPERIOR_DERECHA: 'sm:top-4 sm:bottom-auto sm:right-4 sm:left-auto sm:translate-x-0 sm:translate-y-0',
    CENTRO_IZQUIERDA: 'sm:top-1/2 sm:bottom-auto sm:left-4 sm:right-auto sm:translate-x-0 sm:-translate-y-1/2',
    CENTRO: 'sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2',
    CENTRO_DERECHA: 'sm:top-1/2 sm:bottom-auto sm:right-4 sm:left-auto sm:translate-x-0 sm:-translate-y-1/2',
    INFERIOR_IZQUIERDA: 'sm:bottom-4 sm:top-auto sm:left-4 sm:right-auto sm:translate-x-0 sm:translate-y-0',
    INFERIOR_CENTRO: 'sm:bottom-4 sm:top-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:translate-y-0',
    INFERIOR_DERECHA: 'sm:bottom-4 sm:top-auto sm:right-4 sm:left-auto sm:translate-x-0 sm:translate-y-0',
};

/** Base en móvil: pegada al borde inferior y ocupando el ancho de la pantalla. */
const POSICION_MOVIL = 'inset-x-3 bottom-3';

/**
 * Tarjeta de contenido. Flotando usa un layout vertical compacto; plasmada
 * reparte el ancho: contenido a la izquierda e imagen a la derecha.
 */
export default function AboutUsWidget({
    contenido,
    onBotonClick,
    visual,
}: AboutUsWidgetProps): React.ReactElement | null {
    const [cerrado, setCerrado] = useState(false);
    const [imagenFallida, setImagenFallida] = useState(false);

    if (cerrado) return null;

    const flotante = visual.flotante !== false;
    const cerrable = visual.cerrable !== false;
    const ancho = visual.ancho || '22rem';
    const hayImagen = Boolean(contenido.imagen) && !imagenFallida;

    const clasesContenedor = flotante
        ? `fixed z-50 ${POSICION_MOVIL} sm:inset-x-auto ${CLASES_POSICION[visual.posicion || 'INFERIOR_DERECHA'] || CLASES_POSICION.INFERIOR_DERECHA}`
        : 'mx-auto';

    const botonCerrar = cerrable ? (
        <Button
            id="btn-cerrar-widget-publicidad"
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setCerrado(true)}
            aria-label="Cerrar"
        >
            <X className="h-4 w-4" />
        </Button>
    ) : null;

    const imagen = hayImagen ? (
        <img
            src={contenido.imagen}
            alt={richTextToPlain(contenido.tituloHtml)}
            className={flotante
                ? 'mt-2 h-24 w-full object-contain px-3 sm:h-32 sm:px-4'
                : 'h-32 w-full object-contain sm:h-40 md:h-48 lg:h-56'}
            onError={() => setImagenFallida(true)}
        />
    ) : null;

    const textos = (
        <div className={flotante ? 'space-y-2 p-3 sm:space-y-3 sm:p-4' : 'space-y-3'}>
            {contenido.tituloHtml ? (
                <h2
                    className={flotante
                        ? 'text-sm font-bold leading-tight text-foreground sm:text-base md:text-lg'
                        : 'text-base font-bold leading-tight text-foreground sm:text-lg md:text-xl'}
                    dangerouslySetInnerHTML={{ __html: contenido.tituloHtml }}
                />
            ) : null}

            {contenido.descripcionHtml ? (
                <div
                    className={flotante
                        ? 'line-clamp-3 text-xs text-muted-foreground sm:line-clamp-4 sm:text-sm'
                        : 'text-xs text-muted-foreground sm:text-sm'}
                    dangerouslySetInnerHTML={{ __html: contenido.descripcionHtml }}
                />
            ) : null}

            {contenido.botonTexto ? (
                <Button
                    id="btn-cta-widget-publicidad"
                    type="button"
                    onClick={onBotonClick}
                    className={flotante
                        ? 'w-full rounded-full text-xs font-semibold sm:text-sm'
                        : 'w-full rounded-full text-xs font-semibold sm:w-auto sm:px-8 sm:text-sm'}
                    size="sm"
                >
                    {contenido.botonTexto}
                </Button>
            ) : null}
        </div>
    );

    const tarjeta = (
        <aside
            className={`${clasesContenedor} relative overflow-hidden rounded-xl border border-border bg-card shadow-xl ${flotante ? 'w-auto sm:w-full' : 'w-full'}`}
            // El ancho configurado solo acota en pantallas grandes; abajo manda el viewport.
            style={{ maxWidth: `min(${ancho}, 100%)` }}
            role="complementary"
            aria-label={richTextToPlain(contenido.tituloHtml)}
        >
            {flotante ? (
                <>
                    <div className="flex items-start justify-between gap-2 p-3 pb-0 sm:p-4 sm:pb-0">
                        {contenido.badge ? (
                            <Badge variant="outline" className="border-primary/20 bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/20">
                                {contenido.badge}
                            </Badge>
                        ) : <span />}
                        {botonCerrar}
                    </div>
                    {imagen}
                    {textos}
                </>
            ) : (
                <div className="p-4 sm:p-6">
                    {cerrable ? (
                        <div className="absolute right-2 top-2 z-10">{botonCerrar}</div>
                    ) : null}

                    {/* Contenido a la izquierda, imagen a la derecha */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                        <div className="min-w-0 flex-1 space-y-3 order-2 md:order-1">
                            {contenido.badge ? (
                                <Badge variant="outline" className="border-primary/20 bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/20">
                                    {contenido.badge}
                                </Badge>
                            ) : null}
                            {textos}
                        </div>

                        {hayImagen ? (
                            <div className="order-1 w-full shrink-0 md:order-2 md:w-2/5 lg:w-1/3">
                                {imagen}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </aside>
    );

    // Plasmada: se integra en el flujo de la página, dentro del contenedor central.
    if (!flotante) {
        return (
            <section className="bg-background py-6 sm:py-8">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {tarjeta}
                </div>
            </section>
        );
    }

    return tarjeta;
}
