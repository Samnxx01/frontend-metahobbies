import React, { useState } from 'react';
import ComisionArbolProductoModal from './ComisionArbolProductoModal';
import GeneradorEnlaceVentasToolbar from './GeneradorEnlaceVentasToolbar';
import VentaWompiSecuenciaModal from './VentaWompiSecuenciaModal';

export type GeneradorEnlaceVentasModalsProps = {
    /** Ubicación visual de la barra de botones (sin duplicar modales). */
    toolbarClassName?: string;
};

/**
 * Toolbar + modales del generador de enlace (cada botón abre su formulario en modal).
 */
export default function GeneradorEnlaceVentasModals({
    toolbarClassName,
}: GeneradorEnlaceVentasModalsProps): React.ReactElement {
    const [modalArbolAbierto, setModalArbolAbierto] = useState(false);
    const [modalSecuenciaAbierto, setModalSecuenciaAbierto] = useState(false);

    return (
        <>
            <GeneradorEnlaceVentasToolbar
                className={toolbarClassName}
                onOpenSecuenciaWompi={() => setModalSecuenciaAbierto(true)}
                onOpenParametrizarArbol={() => setModalArbolAbierto(true)}
            />

            <ComisionArbolProductoModal
                open={modalArbolAbierto}
                onOpenChange={setModalArbolAbierto}
            />
            <VentaWompiSecuenciaModal
                open={modalSecuenciaAbierto}
                onOpenChange={setModalSecuenciaAbierto}
            />
        </>
    );
}
