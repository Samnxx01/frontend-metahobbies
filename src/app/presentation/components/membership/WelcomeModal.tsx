import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Importar componentes de Shadcn
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

export default function WelcomeModal({
    open: controlledOpen,
    onClose,
    membershipType = "estándar"
}: Partial<WelcomeModalProps> = {}): React.ReactElement {
    const navigate = useNavigate();
    const [internalOpen, setInternalOpen] = useState<boolean>(true);
    const [modalContent, setModalContent] = useState<ModalContent | null>(null);
    
    // Use controlled open state if provided, otherwise use internal state
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    useEffect(() => {
        // Simular obtención de datos (hardcoded)
        const fetchModalContent = () => {
            const content: ModalContent = {
                title: "🎉 ¡Oferta Especial de Lanzamiento!",
                subtitle: "Obtén <span class='text-primary font-bold'>50% de descuento</span> en tu primera membresía",
                body: `Aprovecha esta promoción exclusiva por tiempo limitado. Únete ahora a nuestra membresía ${membershipType} y empieza a disfrutar de todos los beneficios desde el primer día.`,
                price: "COP $100,000",
                buttonText: "Aprovechar Oferta Ahora",
                buttonLink: "/productos",
                imageUrl: "/public/assets/images/products/product2.png"
            };
            setModalContent(content);
        };

        fetchModalContent();
    }, [membershipType]);

    const handleClose = (): void => {
        if (onClose) {
            onClose();
        } else {
            setInternalOpen(false);
        }
    };

    const handleAcquire = (): void => {
        handleClose();
        if (modalContent?.buttonLink) {
            navigate(modalContent.buttonLink);
        }
    };

    const handleOpenChange = (open: boolean): void => {
        if (!open) {
            handleClose();
        }
    };

    if (!modalContent) {
        return <></>;
    }

    // La lógica de Modal, Backdrop, y Transitions se maneja de forma nativa por Dialog
    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {/* Reemplaza Modal. 
            DialogContent es el cuerpo real del modal.
            - w-[95%] sm:w-[80%] md:max-w-[800px] reemplaza width responsivo.
            - max-h-[90vh] reemplaza maxHeight.
            - p-0 remueve el padding por defecto del DialogContent.
            */}
            <DialogContent className="p-0 border-none w-[95%] sm:w-[80%] md:max-w-[800px] max-h-[90vh] overflow-hidden">

              
                {/* Grid Container de MUI se reemplaza por un Grid de Tailwind */}
                <div className="grid grid-cols-1 md:grid-cols-2">

                    {/* Imagen lado izquierdo - Reemplaza Grid item md={6} xs={12} y Box */}
                    <div className="h-[200px] md:h-[400px] w-full bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${modalContent.imageUrl})`,
                        }}
                    />

                    {/* Contenido lado derecho - Reemplaza Grid item md={6} xs={12} y Box */}
                    <div className="p-6 sm:p-8 flex flex-col justify-center">

                        {/* Título Principal */}
                        <h2 className="mb-3 text-3xl font-bold text-primary">
                            {modalContent.title}
                        </h2>

                        {/* Subtítulo */}
                        <p 
                            className="mb-3 text-lg font-medium"
                            dangerouslySetInnerHTML={{ __html: modalContent.subtitle }}
                        />

                        {/* Descripción */}
                        <p className="mb-4 text-muted-foreground text-lg">
                            {modalContent.body}
                        </p>

                        {/* Precio */}
                        <p className="mb-6 text-2xl font-semibold text-primary">
                            {modalContent.price}
                        </p>

                        {/* Botón */}
                        <Button
                            onClick={handleAcquire}
                            className="w-full py-6 text-lg font-semibold rounded-lg"
                        >
                            {modalContent.buttonText}
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}