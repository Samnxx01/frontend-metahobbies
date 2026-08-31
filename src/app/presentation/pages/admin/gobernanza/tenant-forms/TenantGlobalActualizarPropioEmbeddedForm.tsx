import React from 'react';
import { ParametrosGobernanzaWithRouting } from '../ParametrosGobernanzaWithRouting';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';

const ENDPOINT_ID = 'tenant-global-actualizar-propio' as const;

/** Edición del TG autenticado. No comparte selector ni alcance con la edición de SA. */
export function TenantGlobalActualizarPropioForm(
  props: GobernanzaTenantFormProps,
): React.ReactElement {
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
      eyebrow="Edición de mi Tenant Global"
      hint="El destino se obtiene del JWT. No selecciona Tenant SA ni permite modificar otra rama."
    />
  );
}
