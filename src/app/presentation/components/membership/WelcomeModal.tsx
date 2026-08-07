import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    getPublicidadImageUrl,
    obtenerPublicidadModalActiva,
    obtenerTiposPublicidad,
    type PublicidadModal,
} from '@/app/services/contenidoDestacadoService';
import type { WelcomeModalProps } from '@/types/components';
import { sanitizeRichText, richTextToPlain } from '@/app/utils/sanitizeRichText';

interface ModalContent {
    /** HTML con los estilos parametrizados desde el panel. */
    titleHtml: string;
    /** Texto sin formato para el titulo accesible y las validaciones. */
    titlePlain: string;
    subtitle: string;
    bodyHtml: string;
    bodyPlain: string;
    price: string;
    buttonText: string;
    buttonLink: string;
    imageUrl: string;
}

const toModalContent = (publicidad: PublicidadModal): ModalContent => ({
    titleHtml: sanitizeRichText(publicidad.tittle),
    titlePlain: richTextToPlain(publicidad.tittle),
    subtitle: String(publicidad.subtittle || '').trim(),
    bodyHtml: sanitizeRichText(publicidad.body),
    bodyPlain: richTextToPlain(publicidad.body),
    price: publicidad.price ? String(publicidad.price) : '',
    buttonText: richTextToPlain(publicidad.buttonText),
    buttonLink: String(publicidad.buttonLink || '').trim(),
    imageUrl: getPublicidadImageUrl(publicidad),
});

export default function WelcomeModal({
    open: controlledOpen,
    onClose,
}: Partial<WelcomeModalProps> = {}): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const [internalOpen, setInternalOpen] = useState<boolean>(false);
    const [modalContent, setModalContent] = useState<ModalContent | null>(null);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    useEffect(() => {
        let mounted = true;

        const fetchModalContent = async (): Promise<void> => {
            try {
                const [publicidad, tipos] = await Promise.all([
                    obtenerPublicidadModalActiva({ path: location.pathname }),
                    obtenerTiposPublicidad(),
                ]);
                if (!mounted) return;

                // Solo se abre con contenido de tipo modal: un carrusel, un banner
                // o una sección tienen su propio componente en la página.
                const render = tipos.find((tipo) => tipo.codigo === publicidad?.presentacion)?.visual?.render
                    || publicidad?.presentacion;
                const esModal = !publicidad?.presentacion || render === 'MODAL';

                if (!publicidad?.estado || !esModal) {
                    setModalContent(null);
                    setInternalOpen(false);
                    return;
                }

                const content = toModalContent(publicidad);
                if (!content.titlePlain || !content.bodyPlain) {
                    setModalContent(null);
                    setInternalOpen(false);
                    return;
                }

                setModalContent(content);
                setInternalOpen(true);
            } catch (error) {
                if (!mounted) return;
                console.error('No se pudo cargar el modal publicitario activo:', error);
                setModalContent(null);
                setInternalOpen(false);
            }
        };

        void fetchModalContent();

        return () => {
            mounted = false;
        };
    }, [location.pathname]);

    const handleClose = (): void => {
        if (onClose) {
            onClose();
        } else {
            setInternalOpen(false);
        }
    };

    const handleAcquire = (): void => {
        handleClose();
        if (!modalContent?.buttonLink) return;

        if (/^https?:\/\//i.test(modalContent.buttonLink)) {
            window.location.assign(modalContent.buttonLink);
            return;
        }

        navigate(modalContent.buttonLink);
    };

    const handleOpenChange = (open: boolean): void => {
        if (!open) {
            handleClose();
        }
    };

    if (!modalContent) {
        return <></>;
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[95%] max-h-[90vh] overflow-hidden border-none p-0 sm:w-[80%] md:max-w-[800px]">
                <div className="sr-only">
                    <DialogTitle>{modalContent.titlePlain}</DialogTitle>
                    <DialogDescription>{modalContent.bodyPlain}</DialogDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div
                        className="h-[200px] w-full bg-muted bg-contain bg-center bg-no-repeat md:h-[400px]"
                        style={{
                            backgroundImage: modalContent.imageUrl ? `url(${modalContent.imageUrl})` : undefined,
                        }}
                    />

                    <div className="flex flex-col justify-center p-6 sm:p-8">
                        <h2
                            className="mb-3 text-3xl font-bold text-primary"
                            dangerouslySetInnerHTML={{ __html: modalContent.titleHtml }}
                        />

                        {modalContent.subtitle ? (
                            <p className="mb-3 text-lg font-semibold">
                                {modalContent.subtitle}
                            </p>
                        ) : null}

                        <div
                            className="mb-4 text-lg text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: modalContent.bodyHtml }}
                        />

                        {modalContent.price ? (
                            <p className="mb-6 text-2xl font-semibold text-primary">
                                {modalContent.price}
                            </p>
                        ) : null}

                        {modalContent.buttonText && modalContent.buttonLink ? (
                            <Button
                                onClick={handleAcquire}
                                className="w-full rounded-lg py-6 text-lg font-semibold"
                            >
                                {modalContent.buttonText}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
