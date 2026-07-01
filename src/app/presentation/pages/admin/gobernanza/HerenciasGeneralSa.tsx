import React from 'react';
import ParametrosGobernanza from '../ParametrosGobernanza';
import { GOBERNANZA_TIPO_SECTION_PERMISOS_SA } from './gobernanzaActionIds';

/**
 * Hub de herencias SA: menú y acciones vienen del sistema parametrizado (gobernanzaModuloConfigs).
 * Usa el mismo flujo de tabs inline que PermisosGlobal / ReglasTenant.
 */
export function HerenciasGeneralSa(): React.ReactElement {
  return (
    <ParametrosGobernanza
      mode="full"
      operacionesHub={true}
      tipoSection={GOBERNANZA_TIPO_SECTION_PERMISOS_SA}
      lockedSection="permisos"
      shellVariant="compact"
      enableCardDesignEditor={false}
    />
  );
}
