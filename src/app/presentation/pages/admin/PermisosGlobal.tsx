import { useLocation } from 'react-router-dom';

import ParametrosGobernanza from './ParametrosGobernanza';
import { GOBERNANZA_TIPO_SECTION_PERMISOS_SA } from './gobernanza/gobernanzaActionIds';

/**
 * Hub de operaciones permisos (tenant SA): menú desde gobernanzaModuloConfigs.
 * Al elegir una tarjeta navega a la subruta del formulario (sin ?accion= en URL).
 */
export default function PermisosGlobal() {
  const { pathname } = useLocation();

  return (
    <ParametrosGobernanza
      mode="full"
      initialSection="permisos"
      lockedSection="permisos"
      inlineModuloSlug="permisos"
      shellVariant="compact"
      enableCardDesignEditor={false}
      menuPath={pathname}
      operacionesHub
      tipoSection={GOBERNANZA_TIPO_SECTION_PERMISOS_SA}
    />
  );
}
