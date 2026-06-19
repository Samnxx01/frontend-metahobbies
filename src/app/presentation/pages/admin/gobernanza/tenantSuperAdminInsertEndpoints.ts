import type { EndpointSpec } from './parametrosGobernanzaTypes';

/** IDs de endpoints que insertan o aseguran documentos en `tenantsupertenants`. */
export const TENANT_SUPERADMIN_INSERT_ENDPOINT_IDS = [
  'tenant-superadmin-insert-dios',
  'tenant-superadmin-insert-usuario',
  'tenant-superadmin-insert-rol-tenant',
  'tenant-superadmin-insert-rol-admin',
  'tenant-superadmin-insert-documento',
] as const;

export const TENANT_SUPERADMIN_INSERT_ENDPOINT_ID_SET = new Set<string>(
  TENANT_SUPERADMIN_INSERT_ENDPOINT_IDS,
);

/** Bootstrap / registro público: JWT opcional. */
export const TENANT_SUPERADMIN_INSERT_OPTIONAL_AUTH_IDS = new Set<string>([
  'tenant-superadmin-insert-dios',
  'tenant-superadmin-insert-usuario',
  'tenant-superadmin-insert-rol-admin',
]);

/** Mismo POST .../superAdmin/tenant/global (selects dinámicos compartidos). */
export const TENANT_SUPERADMIN_CREACION_SUPER_ADMIN_API_IDS = new Set<string>([
  'tenant-crear-global-admin',
  'tenant-superadmin-insert-documento',
]);

export function esEndpointCreacionSaDocumento(endpointId: string | undefined): boolean {
  return TENANT_SUPERADMIN_CREACION_SUPER_ADMIN_API_IDS.has(String(endpointId || '').trim());
}

export function esEndpointAltaTenantPanel(endpointId: string | undefined): boolean {
  const id = String(endpointId || '').trim();
  return (
    esEndpointCreacionSaDocumento(id) ||
    id === 'tenant-crear-global-usuario' ||
    id === 'tenant-crear-global-admin'
  );
}

const FIELDS_CREAR_DOCUMENTO_SA: EndpointSpec['fields'] = [
  { name: 'nvlGeneracionTenant', label: 'Nivel generacion tenant (NVL 0 / LIBRE)', type: 'id', required: true },
  { name: 'tipo_tenant', label: 'Tipo tenant', type: 'id', required: true },
  { name: 'coporativo', label: 'Corporativo (empresa)', type: 'id' },
  { name: 'apisDominios', label: 'Apis dominios', type: 'id', required: true },
  { name: 'accionesUsu', label: 'Accion usuario', type: 'id', required: true },
  { name: 'rolesMabs', label: 'Rol mabs', type: 'id', required: true },
];

/**
 * Catálogo operativo: altas en colección `tenantsupertenants` (directo o vía bootstrap).
 * Parametrizar en gobernanzaModuloConfigs con `formularioComponent: TenantSuperAdminInsertForm`
 * y `endpointId` según la pestaña.
 */
export const TENANT_SUPERADMIN_INSERT_ENDPOINTS: EndpointSpec[] = [
  {
    id: 'tenant-superadmin-insert-dios',
    section: 'tenant',
    actor: 'ambos',
    method: 'POST',
    path: '/api/guardar/registro/admin/dios',
    title: 'Bootstrap DIOS + tenantSuperAdmin',
    description:
      'Registro usuario DIOS. Con parametrizarTenantSuperAdmin=true (default) el servidor ejecuta asegurarTenantSuperAdmin → INSERT en tenantsupertenants. JWT opcional (registro híbrido).',
    fields: [
      { name: 'correo', label: 'Correo', type: 'text', required: true },
      { name: 'password', label: 'Contraseña', type: 'text', required: true },
      { name: 'fecha_nacimiento', label: 'Fecha nacimiento (ISO)', type: 'text', required: true, placeholder: '1990-01-15' },
      { name: 'nombre_cliente', label: 'Nombre cliente', type: 'text', required: true },
      {
        name: 'parametrizarTenantSuperAdmin',
        label: 'Parametrizar tenantSuperAdmin',
        type: 'text',
        placeholder: 'true | false (default true)',
      },
    ],
  },
  {
    id: 'tenant-superadmin-insert-usuario',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/registro/usuario/superadmin',
    title: 'Usuario SuperAdmin + tenant SA',
    description:
      'Alta usuario SUPER_ADMIN. Sin tenants activos hace bootstrap y asegurarTenantSuperAdmin (INSERT SA). Con JWT puedes enviar tenantSuperAdminId destino.',
    fields: [
      { name: 'tenantSuperAdminId', label: 'Tenant SuperAdmin destino', type: 'id' },
      { name: 'correo', label: 'Correo', type: 'text', required: true },
      { name: 'password', label: 'Contraseña', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'apellido', label: 'Apellido', type: 'text', required: true },
      { name: 'cc', label: 'Documento (CC)', type: 'text', required: true },
      { name: 'telefono', label: 'Teléfono', type: 'text', required: true },
      { name: 'direccion', label: 'Dirección', type: 'text', required: true },
      { name: 'rh', label: 'RH', type: 'text', required: true, placeholder: 'A+ | A- | B+ | ...' },
      { name: 'fecha_nacimiento', label: 'Fecha nacimiento (ISO)', type: 'text', required: true },
    ],
  },
  {
    id: 'tenant-superadmin-insert-rol-tenant',
    section: 'tenant',
    actor: 'ambos',
    method: 'POST',
    path: '/api/seguridad/tenant/roles',
    title: 'Rol DIOS + tenant SA (SYSTEM_USER)',
    description:
      'Crea rol DIOS vía crearRolesDios → crearTenantPorDefecto → INSERT en tenantsupertenants. Requiere SYSTEM_USER_ID en servidor.',
    fields: [{ name: 'rol', label: 'Nombre rol', type: 'text', required: true, placeholder: 'DIOS' }],
  },
  {
    id: 'tenant-superadmin-insert-rol-admin',
    section: 'tenant',
    actor: 'ambos',
    method: 'POST',
    path: '/api/seguridad/roles/admin',
    title: 'Rol admin bootstrap (sin JWT)',
    description:
      'Bootstrap rol DIOS sin JWT → crearRolesDios → crearTenantPorDefecto → INSERT SA. Solo rol DIOS sin tenantGlobal/tenantCorporativo en body.',
    fields: [{ name: 'rol', label: 'Nombre rol', type: 'text', required: true, placeholder: 'DIOS' }],
  },
  {
    id: 'tenant-superadmin-insert-documento',
    section: 'tenant',
    actor: 'tenantSuperAdmin',
    method: 'POST',
    path: '/api/config/global/creacion/superAdmin/tenant/global',
    title: 'Insertar documento tenantSuperAdmin (NVL 0)',
    description:
      'POST superAdmin/tenant/global con NVL 0 / LIBRE → tenantCompraRepository.crear → tenantsupertenants. NVL 1/2 crea tenantGlobal o corporativo.',
    fields: FIELDS_CREAR_DOCUMENTO_SA,
  },
];
