import { ParametrosGobernanzaWithRouting } from './gobernanza';

const ENDPOINT_ID = 'tenant-actualizar-global' as const;

/**
 * Pantalla dedicada: PUT actualizar tenant global.
 * Ruta dinámica (BD): componente = nombre de archivo sin `.tsx` → `GobernanzaFormTenantGlobalActualizar`
 * Query opcional: `?endpoint=tenant-actualizar-global`
 */
export default function GobernanzaFormTenantGlobalActualizar() {
  return (
    <ParametrosGobernanzaWithRouting
      mode="full"
      initialSection="tenant"
      lockedSection="tenant"
      allowedEndpointIds={[ENDPOINT_ID]}
    />
  );
}
