import ParametrosGobernanza from './ParametrosGobernanza';

const REGLAS_ADMIN_IDS = [
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-crear-dios-reglas',
  'tenant-actualizar-dios-reglas',
];

export default function ReglasTenantAdmin() {
  return (
    <ParametrosGobernanza
      mode="full"
      initialSection="tenant"
      lockedSection="tenant"
      allowedEndpointIds={REGLAS_ADMIN_IDS}
    />
  );
}
