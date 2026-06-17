import type { ReactNode } from 'react';
import type { EndpointSpec } from '../parametrosGobernanzaTypes';

export type GobernanzaPermisosFormProps = {
  endpoint?: EndpointSpec;
  /** Presente cuando el wrapper vive dentro de ParametrosGobernanza; ausente en ruta dinámica. */
  embeddedApiForm?: ReactNode;
};
