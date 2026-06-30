import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';
import { ParametrosGobernanzaWithRouting } from '../';
import { resolveTenantSuperAdminInsertHint } from './tenantSuperAdminInsertHints';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantSuperAdminInsertForm;

/**
 * Formulario parametrizable (gobernanzaModuloConfigs) para INSERT en `tenantsupertenants`.
 * El endpoint concreto lo resuelve ParametrosGobernanza según `endpointId` de la pestaña.
 */
export function TenantSuperAdminInsertForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) {
    return (
      <ParametrosGobernanzaWithRouting
        mode="full"
        initialSection="tenant"
        lockedSection="tenant"
        allowedEndpointIds={[ENDPOINT_ID]}
        singleFormInline
      />
    );
  }

  const { eyebrow, hint } = resolveTenantSuperAdminInsertHint(props.endpoint?.id);

  return (
    <TenantFormShell
      {...props}
      eyebrow={eyebrow}
      hint={hint}
    />
  );
}
