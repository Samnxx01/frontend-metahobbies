import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { createGobernanzaTenantFormRoute } from './gobernanzaTenantFormRoute';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantCrearGlobalAdminForm;
const TenantCrearGlobalAdminFormRoute = createGobernanzaTenantFormRoute(ENDPOINT_ID);

export function TenantCrearGlobalAdminForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <TenantCrearGlobalAdminFormRoute />;
  return (
    <TenantFormShell
      {...props}
      eyebrow="Alta tenantSuperAdmin"
      hint="Formulario operativo para crear un tenant administrador del sistema validado por jerarquia."
    />
  );
}
