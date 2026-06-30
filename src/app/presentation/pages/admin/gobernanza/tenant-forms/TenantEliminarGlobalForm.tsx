import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';
import { ParametrosGobernanzaWithRouting } from '../';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantEliminarGlobalForm;

export function TenantEliminarGlobalForm(props: GobernanzaTenantFormProps): React.ReactElement {
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
      eyebrow="Eliminacion tenantGlobal"
      hint="Formulario operativo de eliminacion definitiva. El ID se envia normalizado como identificador publico."
    />
  );
}
