import React from 'react';
import { useLocation } from 'react-router-dom';

import ParametrosGobernanza from './ParametrosGobernanza';
import { GOBERNANZA_TIPO_SECTION_TENANT_GLOBAL } from './gobernanza/gobernanzaActionIds';

/**
 * Hub TenantGlobal: lista formularios publicados en gobernanzaModuloConfigs
 * cuyo tipo (gobernanzaModuloTipos) tiene section «tenant-global».
 * Audiencia: JWT con rol tenantGlobal (sin tenantSuperAdmin en scope).
 */
export default function TenantGlobal(): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <ParametrosGobernanza
      mode="full"
      initialSection="tenant"
      lockedSection="tenant"
      inlineModuloSlug="tenant"
      shellVariant="compact"
      enableCardDesignEditor={false}
      menuPath={pathname}
      operacionesHub
      tipoSection={GOBERNANZA_TIPO_SECTION_TENANT_GLOBAL}
    />
  );
}
