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
    type PublicidadModal,
} from '@/app/services/publicidadService';
import type { WelcomeModalProps } from '@/types/components';

interface ModalContent {
    title: string;
    subtitle: string;
    body: string;
    price: string;
    buttonText: string;
    buttonLink: string;
    imageUrl: string;
}

const toModalContent = (publicidad: PublicidadModal): ModalContent => ({
    title: String(publicidad.tittle || '').trim(),
    subtitle: String(publicidad.subtittle || '').trim(),
    body: String(publicidad.body || '').trim(),
    price: publicidad.price ? String(publicidad.price) : '',
    buttonText: String(publicidad.buttonText || '').trim(),
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
                const publicidad = await obtenerPublicidadModalActiva({ path: location.pathname });
                if (!mounted) return;

                if (!publicidad?.estado) {
                    setModalContent(null);
                    setInternalOpen(false);
                    return;
                }

                const content = toModalContent(publicidad);
                if (!content.title || !content.body) {
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
                    <DialogTitle>{modalContent.title}</DialogTitle>
                    <DialogDescription>{modalContent.body}</DialogDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div
                        className="h-[200px] w-full bg-muted bg-contain bg-center bg-no-repeat md:h-[400px]"
                        style={{
                            backgroundImage: modalContent.imageUrl ? `url(${modalContent.imageUrl})` : undefined,
                        }}
                    />

                    <div className="flex flex-col justify-center p-6 sm:p-8">
                        <h2 className="mb-3 text-3xl font-bold text-primary">
                            {modalContent.title}
                        </h2>

                        {modalContent.subtitle ? (
                            <p className="mb-3 text-lg font-semibold">
                                {modalContent.subtitle}
                            </p>
                        ) : null}

                        <p className="mb-4 text-lg text-muted-foreground">
                            {modalContent.body}
                        </p>

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
