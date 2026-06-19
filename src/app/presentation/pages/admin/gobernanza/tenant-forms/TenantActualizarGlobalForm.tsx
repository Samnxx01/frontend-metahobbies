import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { createGobernanzaTenantFormRoute } from './gobernanzaTenantFormRoute';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantActualizarGlobalForm;
const TenantActualizarGlobalFormRoute = createGobernanzaTenantFormRoute(ENDPOINT_ID);

export function TenantActualizarGlobalForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <TenantActualizarGlobalFormRoute />;
  return (
    <TenantFormShell
      {...props}
      eyebrow="Edicion tenantGlobal"
      hint="Formulario operativo de actualizacion por ID publico normalizado antes de enviarlo al API."
    />
  );
}
