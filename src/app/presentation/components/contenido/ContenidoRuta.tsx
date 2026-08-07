import React from 'react';
import AboutUs from '@/app/presentation/components/about/AboutUs';

/**
 * Renderiza el contenido administrado asociado a la ruta actual.
 * Se monta en los layouts para que cualquier vista con un registro activo lo
 * muestre sin tener que tocar cada página; si no hay registro, no pinta nada.
 *
 * El archivo y su carpeta evitan la palabra "publicidad": los bloqueadores de
 * anuncios cancelan la descarga del módulo en desarrollo (ERR_BLOCKED_BY_CLIENT),
 * porque Vite sirve cada archivo por una URL que incluye su ruta.
 */
export default function ContenidoRuta(): React.ReactElement {
    return <AboutUs />;
}
