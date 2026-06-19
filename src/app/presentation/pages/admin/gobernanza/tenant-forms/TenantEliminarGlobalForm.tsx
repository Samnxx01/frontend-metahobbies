import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { createGobernanzaTenantFormRoute } from './gobernanzaTenantFormRoute';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantEliminarGlobalForm;
const TenantEliminarGlobalFormRoute = createGobernanzaTenantFormRoute(ENDPOINT_ID);

export function TenantEliminarGlobalForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <TenantEliminarGlobalFormRoute />;
  return (
    <TenantFormShell
      {...props}
      eyebrow="Eliminacion tenantGlobal"
      hint="Formulario operativo de eliminacion definitiva. El ID se envia normalizado como identificador publico."
    />
  );
}
