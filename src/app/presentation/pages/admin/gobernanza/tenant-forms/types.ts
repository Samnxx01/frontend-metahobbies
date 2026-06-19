import type { ReactNode } from 'react';
import type { GobernanzaEndpointCapabilities } from '../gobernanzaEndpointCapabilities';
import type { EndpointSpec } from '../parametrosGobernanzaTypes';

export type GobernanzaTenantFormProps = {
  endpoint?: EndpointSpec;
  /** Presente cuando el wrapper vive dentro de ParametrosGobernanza; ausente en ruta dinámica. */
  embeddedApiForm?: ReactNode;
  capabilities?: GobernanzaEndpointCapabilities;
};
