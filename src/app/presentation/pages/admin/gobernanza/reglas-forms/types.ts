import type { ReactNode } from 'react';
import type { GobernanzaEndpointCapabilities } from '../gobernanzaEndpointCapabilities';
import type { EndpointSpec } from '../parametrosGobernanzaTypes';

export type GobernanzaReglasFormProps = {
  endpoint?: EndpointSpec;
  embeddedApiForm?: ReactNode;
  capabilities?: GobernanzaEndpointCapabilities;
  formularioComponent?: string | null;
};
