import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Importar componentes de Shadcn
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { WelcomeModalProps } from '@/types/components';

export default function WelcomeModal({
    open: controlledOpen,
    onClose,
    membershipType = "estándar"
}: Partial<WelcomeModalProps> = {}): React.ReactElement {
    const navigate = useNavigate();
    // Shadcn Dialog maneja el estado 'open' internamente si usas onOpenChange,
    // pero mantenemos el estado local para la apertura inicial.
    const [internalOpen, setInternalOpen] = useState<boolean>(true);
    
    // Use controlled open state if provided, otherwise use internal state
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const handleClose = (): void => {
        if (onClose) {
            onClose();
        } else {
            setInternalOpen(false);
        }
    };

    const handleAcquire = (): void => {
        handleClose();
        navigate('/membresia/pago');
    };

    const handleOpenChange = (open: boolean): void => {
        if (!open) {
            handleClose();
        }
    };

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
                            backgroundImage: 'url(/assets/images/membership-banner.jpg)',
                        }}
                    />

                    {/* Contenido lado derecho - Reemplaza Grid item md={6} xs={12} y Box */}
                    <div className="p-6 sm:p-8 flex flex-col justify-center"> {/* Ajustamos padding si es necesario */}

                        {/* Título Principal - Reemplaza Typography variant="h4" */}
                        <h2 className="mb-3 text-3xl font-bold text-primary">
                            ¡Adquiere tu Membresía!
                        </h2>

                        {/* Subtítulo - Reemplaza Typography variant="h6" */}
                        <p className="mb-3 text-lg font-medium">
                            Empieza a ganar <span className="text-primary font-bold">25% de ganancias</span> por ventas
                        </p>

                        {/* Descripción - Reemplaza Typography con estilos custom */}
                        <p className="mb-4 text-muted-foreground text-lg">
                            Únete a nuestro exclusivo programa de membresía {membershipType} y comienza a generar ingresos mientras recomiendas nuestros productos.
                        </p>

                        {/* Precio - Reemplaza Typography variant="h5" */}
                        <p className="mb-6 text-2xl font-semibold text-primary">
                            COP $200,000
                        </p>

                        {/* Botón - Reemplaza Button */}
                        <Button
                            onClick={handleAcquire}
                            className="w-full py-6 text-lg font-semibold rounded-lg"
                        >
                            Adquirir Membresía
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}