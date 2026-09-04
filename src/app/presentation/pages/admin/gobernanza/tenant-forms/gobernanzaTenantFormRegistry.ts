/** Fallback endpointId cuando el tipo en BD no trae endpointId parametrizado. */
export const ENDPOINT_ID_BY_TENANT_COMPONENT: Record<string, string> = {
  TenantListarLibresForm: 'tenant-listar-libres-superadmin',
  TenantGlobal: 'tenant-listar-libres-tenantglobal',
  TenantCrearGlobalAdminForm: 'tenant-crear-global-usuario',
  TenantCrearGlobalUsuarioForm: 'tenant-crear-global-usuario',
  TenantSuperAdminInsertForm: 'tenant-superadmin-insert-documento',
  TenantActualizarGlobalForm: 'tenant-actualizar-global',
  TenantSuperAdminEstadoForm: 'tenant-superadmin-desactivar',
  TenantGlobalActualizarPropioForm: 'tenant-global-actualizar-propio',
  TenantDesactivarGlobalForm: 'tenant-desactivar-global',
  TenantEliminarGlobalForm: 'tenant-eliminar-global',
};

export function endpointIdDesdeComponenteTenant(formularioComponent?: string | null): string {
  const key = String(formularioComponent || '').trim();
  return key ? ENDPOINT_ID_BY_TENANT_COMPONENT[key] || '' : '';
}

export function resolverTenantFormComponentName(formularioComponent?: string | null): string {
  return String(formularioComponent || '').trim();
}

export function esComponenteTenantSubformulario(component: string | null | undefined): boolean {
  const name = String(component || '').trim();
  if (!name) return false;
  return /^Tenant[A-Za-z0-9]+Form$/.test(name);
}
