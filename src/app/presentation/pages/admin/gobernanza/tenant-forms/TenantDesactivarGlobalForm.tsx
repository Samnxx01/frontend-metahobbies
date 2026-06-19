import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { createGobernanzaTenantFormRoute } from './gobernanzaTenantFormRoute';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantDesactivarGlobalForm;
const TenantDesactivarGlobalFormRoute = createGobernanzaTenantFormRoute(ENDPOINT_ID);

export function TenantDesactivarGlobalForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <TenantDesactivarGlobalFormRoute />;
  return (
    <TenantFormShell
      {...props}
      eyebrow="Bloqueo tenantGlobal"
      hint="Formulario operativo para desactivar el tenant global usando el ID publico seleccionado."
    />
  );
}
