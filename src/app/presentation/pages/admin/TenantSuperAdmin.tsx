import React from 'react';
import { useLocation } from 'react-router-dom';

import ParametrosGobernanza from './ParametrosGobernanza';
import { GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN } from './gobernanza/gobernanzaActionIds';

/**
 * Hub TenantSuperAdmin: lista todos los formularios publicados en gobernanzaModuloConfigs
 * cuyo tipo (gobernanzaModuloTipos) tiene section «gobernanza».
 * Al elegir una pestaña se renderiza el componente en la misma vista (sin navegar).
 */
export default function TenantSuperAdmin(): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <ParametrosGobernanza
      mode="superAdmin"
      initialSection="tenant"
      lockedSection="tenant"
      inlineModuloSlug="tenant"
      shellVariant="compact"
      enableCardDesignEditor={false}
      menuPath={pathname}
      operacionesHub
      tipoSection={GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN}
    />
  );
}
