import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';
import { ParametrosGobernanzaWithRouting } from '../';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantActualizarGlobalForm;

export function TenantActualizarGlobalForm(props: GobernanzaTenantFormProps): React.ReactElement {
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
      eyebrow="Edición tenant SA"
      hint="Actualiza únicamente TenantSuperAdmin descendientes de la rama autorizada por el JWT."
    />
  );
}
