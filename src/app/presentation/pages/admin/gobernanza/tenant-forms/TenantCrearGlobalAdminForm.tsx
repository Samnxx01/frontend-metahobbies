import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';
import { ParametrosGobernanzaWithRouting } from '../';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantCrearGlobalAdminForm;

export function TenantCrearGlobalAdminForm(props: GobernanzaTenantFormProps): React.ReactElement {
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
  return (
    <TenantFormShell
      {...props}
      eyebrow="Alta tenantGlobal"
      hint="Formulario operativo para crear un tenantGlobal dentro de la rama permitida por el JWT."
    />
  );
}
