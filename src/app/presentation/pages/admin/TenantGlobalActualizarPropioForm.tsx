import { ParametrosGobernanzaWithRouting } from './gobernanza/ParametrosGobernanzaWithRouting';

const ENDPOINT_ID = 'tenant-global-actualizar-propio' as const;

/** Formulario exclusivo del tenantGlobal autenticado; el destino procede del JWT. */
export default function TenantGlobalActualizarPropioForm() {
  return (
    <ParametrosGobernanzaWithRouting
      mode="full"
      initialSection="tenant"
      lockedSection="tenant"
      allowedEndpointIds={[ENDPOINT_ID]}
      singleFormInline
    />
  );
}
