import { ParametrosGobernanzaWithRouting } from './gobernanza';

const ENDPOINT_ID = 'tenant-eliminar-global' as const;

/**
 * Pantalla dedicada: DELETE eliminar tenant global.
 * Ruta dinámica (BD): `GobernanzaFormTenantGlobalEliminar`
 * Query opcional: `?endpoint=tenant-eliminar-global`
 */
export default function GobernanzaFormTenantGlobalEliminar() {
  return (
    <ParametrosGobernanzaWithRouting
      mode="full"
      initialSection="tenant"
      lockedSection="tenant"
      allowedEndpointIds={[ENDPOINT_ID]}
    />
  );
}
