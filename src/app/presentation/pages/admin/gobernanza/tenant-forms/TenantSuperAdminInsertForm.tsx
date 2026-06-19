import React from 'react';
import { TenantFormShell } from './TenantFormShell';
import type { GobernanzaTenantFormProps } from './types';
import { createGobernanzaTenantFormRoute } from './gobernanzaTenantFormRoute';
import { resolveTenantSuperAdminInsertHint } from './tenantSuperAdminInsertHints';

const TenantSuperAdminInsertFormRoute = createGobernanzaTenantFormRoute('tenant-superadmin-insert-documento');

/**
 * Formulario parametrizable (gobernanzaModuloConfigs) para INSERT en `tenantsupertenants`.
 * El endpoint concreto lo resuelve ParametrosGobernanza según `endpointId` de la pestaña.
 */
export function TenantSuperAdminInsertForm(props: GobernanzaTenantFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <TenantSuperAdminInsertFormRoute />;

  const { eyebrow, hint } = resolveTenantSuperAdminInsertHint(props.endpoint?.id);

  return (
    <TenantFormShell
      {...props}
      eyebrow={eyebrow}
      hint={hint}
    />
  );
}
