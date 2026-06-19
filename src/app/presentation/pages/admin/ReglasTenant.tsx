import React from 'react';
import { useLocation } from 'react-router-dom';

import ParametrosGobernanza from './ParametrosGobernanza';
import { GOBERNANZA_TIPO_SECTION_REGLAS_SA } from './gobernanza/gobernanzaActionIds';

/**
 * Hub Reglas SA (ReglasTenant): lista formularios publicados en gobernanzaModuloConfigs
 * cuyo tipo (gobernanzaModuloTipos) tiene section «reglas».
 * Al elegir una pestaña se renderiza el componente en la misma vista (sin navegar).
 */
export default function ReglasTenant(): React.ReactElement {
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
      tipoSection={GOBERNANZA_TIPO_SECTION_REGLAS_SA}
    />
  );
}
