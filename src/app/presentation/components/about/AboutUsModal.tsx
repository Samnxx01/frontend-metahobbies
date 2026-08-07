import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { richTextToPlain } from '@/app/utils/sanitizeRichText';
import type { AboutUsContenido } from './AboutUsView';

interface AboutUsModalProps {
    contenido: AboutUsContenido;
    onBotonClick?: () => void;
}

/** Variante en modal: el contenido se abre sobre la página y el visitante lo cierra. */
export default function AboutUsModal({ contenido, onBotonClick }: AboutUsModalProps): React.ReactElement {
    const [abierto, setAbierto] = useState(true);
    const [imagenFallida, setImagenFallida] = useState(false);

    const handleBoton = (): void => {
        setAbierto(false);
        onBotonClick?.();
    };

    return (
        <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogContent className="max-h-[90vh] w-[95%] overflow-y-auto border-none p-0 sm:w-[85%] md:max-w-[850px]">
                <div className="sr-only">
                    <DialogTitle>{richTextToPlain(contenido.tituloHtml)}</DialogTitle>
                    <DialogDescription>{richTextToPlain(contenido.descripcionHtml)}</DialogDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {contenido.imagen && !imagenFallida ? (
                        <div className="flex items-center justify-center bg-muted p-4">
                            <img
                                src={contenido.imagen}
                                alt={richTextToPlain(contenido.tituloHtml)}
                                className="max-h-[220px] w-full object-contain md:max-h-[420px]"
                                onError={() => setImagenFallida(true)}
                            />
                        </div>
                    ) : null}

                    <div className={`flex flex-col justify-center p-6 sm:p-8 ${contenido.imagen && !imagenFallida ? '' : 'md:col-span-2'}`}>
                        {contenido.badge ? (
                            <Badge variant="outline" className="mb-3 w-fit border-primary/20 bg-primary/20 text-primary font-semibold hover:bg-primary/20">
                                {contenido.badge}
                            </Badge>
                        ) : null}

                        {contenido.tituloHtml ? (
                            <h2
                                className="mb-3 text-2xl font-extrabold leading-tight text-foreground sm:text-3xl"
                                dangerouslySetInnerHTML={{ __html: contenido.tituloHtml }}
                            />
                        ) : null}

                        {contenido.descripcionHtml ? (
                            <div
                                className="mb-4 text-base text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: contenido.descripcionHtml }}
                            />
                        ) : null}

                        {contenido.puntosClave.length ? (
                            <div className="mb-4 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                                {contenido.puntosClave.map((punto, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                                        <p className="text-sm font-medium leading-snug">{punto}</p>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {contenido.botonTexto ? (
                            <Button
                                id="btn-cta-modal-publicidad"
                                type="button"
                                onClick={handleBoton}
                                className="w-full rounded-full py-5 text-base font-semibold"
                            >
                                {contenido.botonTexto}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
