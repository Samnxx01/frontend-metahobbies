import { useLocation } from 'react-router-dom';

import ParametrosGobernanza from './ParametrosGobernanza';

/**
 * Hub de operaciones reglas: menú desde gobernanzaModuloConfigs (section reglas).
 * Al elegir una tarjeta navega a la subruta del formulario.
 */
export default function ReglasTenant() {
  const { pathname } = useLocation();

  return (
    <ParametrosGobernanza
      mode="full"
      initialSection="reglas"
      lockedSection="reglas"
      inlineModuloSlug="reglas"
      shellVariant="compact"
      enableCardDesignEditor={false}
      menuPath={pathname}
      operacionesHub
    />
  );
}
