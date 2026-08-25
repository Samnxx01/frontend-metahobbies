import React from 'react';
import TercerosCrudModal from './components/TercerosCrudModal';

/**
 * Página envoltorio para la ruta dinámica: renderiza el CRUD de terceros
 * embebido en la página (sin overlay de diálogo), reutilizando la misma
 * lógica/tabla que el modal disparado desde "Pedidos aprobados".
 */
export default function TercerosCrudModalPage(): React.ReactElement {
    return <TercerosCrudModal open onOpenChange={() => {}} renderMode="page" />;
}
