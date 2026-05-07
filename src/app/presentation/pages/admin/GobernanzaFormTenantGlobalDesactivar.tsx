import { ParametrosGobernanzaWithRouting } from './gobernanza';

const ENDPOINT_ID = 'tenant-desactivar-global' as const;

/**
 * Pantalla dedicada: DELETE desactivar tenant global.
 * Ruta dinámica (BD): `GobernanzaFormTenantGlobalDesactivar`
 * Query opcional: `?endpoint=tenant-desactivar-global`
 */
export default function GobernanzaFormTenantGlobalDesactivar() {
  return (
    <ParametrosGobernanzaWithRouting
      mode="full"
      initialSection="tenant"
      lockedSection="tenant"
      allowedEndpointIds={[ENDPOINT_ID]}
    />
  );
}
