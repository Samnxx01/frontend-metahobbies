/** Texto operativo por endpoint de alta tenantSuperAdmin (INSERT). */
export const TENANT_SUPERADMIN_INSERT_HINTS: Record<string, { eyebrow: string; hint: string }> = {
  'tenant-superadmin-insert-dios': {
    eyebrow: 'Bootstrap DIOS',
    hint: 'POST /api/guardar/registro/admin/dios — crea usuario DIOS y, por defecto, el documento en tenantsupertenants.',
  },
  'tenant-superadmin-insert-usuario': {
    eyebrow: 'Usuario SuperAdmin',
    hint: 'POST /api/registro/usuario/superadmin — usuario SUPER_ADMIN; en bootstrap vacío también inserta tenantSuperAdmin.',
  },
  'tenant-superadmin-insert-rol-tenant': {
    eyebrow: 'Rol + tenant SA (SYSTEM_USER)',
    hint: 'POST /api/seguridad/tenant/roles — rol DIOS con tenant por defecto (requiere SYSTEM_USER_ID en servidor).',
  },
  'tenant-superadmin-insert-rol-admin': {
    eyebrow: 'Rol DIOS público',
    hint: 'POST /api/seguridad/roles/admin — bootstrap sin JWT; solo rol DIOS sin refs tenantGlobal/corporativo.',
  },
  'tenant-superadmin-insert-documento': {
    eyebrow: 'Documento tenantSuperAdmin',
    hint: 'POST .../superAdmin/tenant/global — elige NVL 0 / LIBRE para INSERT en tenantsupertenants (sub-SA bajo tu jerarquía).',
  },
  'tenant-crear-global-admin': {
    eyebrow: 'Alta tenantSuperAdmin / global',
    hint: 'Mismo POST superAdmin/tenant/global: NVL 0 → tenantsupertenants; NVL 1/2 → tenantGlobal o corporativo.',
  },
};

export function resolveTenantSuperAdminInsertHint(endpointId: string | undefined): {
  eyebrow: string;
  hint: string;
} {
  const id = String(endpointId || '').trim();
  return (
    TENANT_SUPERADMIN_INSERT_HINTS[id] ?? {
      eyebrow: 'Alta tenantSuperAdmin',
      hint: 'Operación parametrizada sobre endpoints que insertan en tenantsupertenants.',
    }
  );
}
