import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { createGobernanzaTenantFormRoute } from './gobernanzaTenantFormRoute';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_TENANT_COMPONENT.TenantCrearGlobalUsuarioForm;
const TenantCrearGlobalUsuarioFormRoute = createGobernanzaTenantFormRoute(ENDPOINT_ID);

export function TenantCrearGlobalUsuarioForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <TenantCrearGlobalUsuarioFormRoute />;
  return (
    <TenantFormShell
      {...props}
      eyebrow="Alta tenantGlobal"
      hint="Formulario operativo para crear el tenant global desde el scope JWT disponible."
    />
  );
}
