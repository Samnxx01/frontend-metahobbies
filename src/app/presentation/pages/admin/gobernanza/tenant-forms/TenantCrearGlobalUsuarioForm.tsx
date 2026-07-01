import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';
import { ParametrosGobernanzaWithRouting } from '../';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantCrearGlobalUsuarioForm;

export function TenantCrearGlobalUsuarioForm(props: GobernanzaTenantFormProps): React.ReactElement {
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
      hint="Formulario operativo para crear el tenant global desde el scope JWT disponible."
    />
  );
}
