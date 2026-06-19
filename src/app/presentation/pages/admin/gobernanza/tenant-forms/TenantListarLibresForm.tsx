import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { createGobernanzaTenantFormRoute } from './gobernanzaTenantFormRoute';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantListarLibresForm;
const TenantListarLibresFormRoute = createGobernanzaTenantFormRoute(ENDPOINT_ID);

export function TenantListarLibresForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <TenantListarLibresFormRoute />;
  return (
    <TenantFormShell
      {...props}
      eyebrow="Consulta tenant"
      hint="Formulario operativo de consulta. La respuesta se filtra por el alcance del JWT y la rama parametrizada."
    />
  );
}
