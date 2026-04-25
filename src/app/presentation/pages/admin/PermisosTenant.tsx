import ParametrosGobernanza from './ParametrosGobernanza';

const PERMISOS_TENANT_IDS = [
  'perm-usuario-tenant-global',
  'perm-admin-tenant-global-listar',
  'perm-admin-tenant-global-actualizar',
  'perm-admin-tenant-global-desactivar',
];

export default function PermisosTenant() {
  return (
    <ParametrosGobernanza
      mode="full"
      initialSection="permisos"
      lockedSection="permisos"
      allowedEndpointIds={PERMISOS_TENANT_IDS}
    />
  );
}
