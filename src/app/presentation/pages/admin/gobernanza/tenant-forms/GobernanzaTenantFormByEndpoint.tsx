import React from 'react';
import type { GobernanzaTenantFormProps } from './types';
import { TenantActualizarGlobalForm } from './TenantActualizarGlobalForm';
import { TenantCrearGlobalAdminForm } from './TenantCrearGlobalAdminForm';
import { TenantCrearGlobalUsuarioForm } from './TenantCrearGlobalUsuarioForm';
import { TenantDesactivarGlobalForm } from './TenantDesactivarGlobalForm';
import { TenantEliminarGlobalForm } from './TenantEliminarGlobalForm';
import { TenantListarLibresForm } from './TenantListarLibresForm';
import { TenantSuperAdminInsertForm } from './TenantSuperAdminInsertForm';
import { ENDPOINT_ID_BY_TENANT_COMPONENT } from './gobernanzaTenantFormRegistry';
import { TENANT_SUPERADMIN_INSERT_ENDPOINT_ID_SET } from '../tenantSuperAdminInsertEndpoints';

const REGISTRY_BY_ENDPOINT: Record<string, React.ComponentType<GobernanzaTenantFormProps>> = {
  'tenant-actualizar-global': TenantActualizarGlobalForm,
  'tenant-crear-global-admin': TenantCrearGlobalAdminForm,
  'tenant-crear-global-usuario': TenantCrearGlobalUsuarioForm,
  'tenant-desactivar-global': TenantDesactivarGlobalForm,
  'tenant-eliminar-global': TenantEliminarGlobalForm,
  'tenant-listar-libres': TenantListarLibresForm,
  'tenant-listar-libres-superadmin': TenantListarLibresForm,
  'tenant-listar-libres-tenantglobal': TenantListarLibresForm,
  'tenant-superadmin-insert-dios': TenantSuperAdminInsertForm,
  'tenant-superadmin-insert-usuario': TenantSuperAdminInsertForm,
  'tenant-superadmin-insert-rol-tenant': TenantSuperAdminInsertForm,
  'tenant-superadmin-insert-rol-admin': TenantSuperAdminInsertForm,
  'tenant-superadmin-insert-documento': TenantSuperAdminInsertForm,
};

const REGISTRY_BY_COMPONENT: Record<string, React.ComponentType<GobernanzaTenantFormProps>> = {
  TenantActualizarGlobalForm,
  TenantCrearGlobalAdminForm,
  TenantCrearGlobalUsuarioForm,
  TenantSuperAdminInsertForm,
  TenantDesactivarGlobalForm,
  TenantEliminarGlobalForm,
  TenantListarLibresForm,
};

export type GobernanzaTenantFormByEndpointProps = GobernanzaTenantFormProps & {
  formularioComponent?: string | null;
};

export function resolverTenantFormComponent(
  formularioComponent?: string | null
): React.ComponentType<GobernanzaTenantFormProps> | null {
  const key = String(formularioComponent || '').trim();
  if (key && REGISTRY_BY_COMPONENT[key]) return REGISTRY_BY_COMPONENT[key];
  const endpointId = ENDPOINT_ID_BY_TENANT_COMPONENT[key];
  if (endpointId && REGISTRY_BY_ENDPOINT[endpointId]) return REGISTRY_BY_ENDPOINT[endpointId];
  return null;
}

/** Resolución por formularioComponent en gobernanzaModuloConfigs / rutaseguridads. */
export function GobernanzaTenantFormByEndpoint({
  formularioComponent,
  endpoint,
  embeddedApiForm,
  ...props
}: GobernanzaTenantFormByEndpointProps): React.ReactElement {
  const FormByComponent = resolverTenantFormComponent(formularioComponent);
  if (FormByComponent) {
    return <FormByComponent endpoint={endpoint} embeddedApiForm={embeddedApiForm} {...props} />;
  }

  const endpointId = endpoint?.id ?? '';
  const Form =
    REGISTRY_BY_ENDPOINT[endpointId]
    ?? (TENANT_SUPERADMIN_INSERT_ENDPOINT_ID_SET.has(endpointId) ? TenantSuperAdminInsertForm : null)
    ?? TenantListarLibresForm;
  return <Form endpoint={endpoint} embeddedApiForm={embeddedApiForm} {...props} />;
}
