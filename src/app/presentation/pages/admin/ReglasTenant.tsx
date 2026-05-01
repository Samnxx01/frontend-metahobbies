import ParametrosGobernanza from './ParametrosGobernanza';

const REGLAS_TENANT_IDS = [
  'tenant-crear-global-reglas',
  'tenant-listar-reglas',
  'tenant-actualizar-global-reglas',
  'tenant-desactivar-global-reglas',
];

export default function ReglasTenant() {
  return (
    <ParametrosGobernanza
      mode="full"
      initialSection="tenant"
      lockedSection="tenant"
      allowedEndpointIds={REGLAS_TENANT_IDS}
    />
  );
}
