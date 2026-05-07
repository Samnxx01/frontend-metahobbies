import { ParametrosGobernanzaWithRouting } from './gobernanza';

const ENDPOINT_ID = 'tenant-crear-global-usuario' as const;

/**
 * Flujo puro tenantGlobal — POST crear tenant global desde tenantGlobal.
 * El formulario se renderiza en el modal del padre `ParametrosGobernanza` (Configurar / Ejecutar).
 *
 * Ruta dinámica (BD): `GobernanzaFormTenantGlobalCrearUsuario`
 * Query opcional para abrir el modal al cargar: `?endpoint=tenant-crear-global-usuario`
 */
export default function GobernanzaFormTenantGlobalCrearUsuario() {
  return (
    <ParametrosGobernanzaWithRouting
      mode="full"
      initialSection="tenant"
      lockedSection="tenant"
      allowedEndpointIds={[ENDPOINT_ID]}
    />
  );
}
