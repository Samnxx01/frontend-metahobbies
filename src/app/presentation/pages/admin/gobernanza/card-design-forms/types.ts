import type { ReactNode } from 'react';
import type { GobernanzaEndpointCapabilities } from '../gobernanzaEndpointCapabilities';
import type { EndpointSpec } from '../parametrosGobernanzaTypes';
import type { GobernanzaCardDesign } from '../gobernanzaCardDesignTypes';

export type GobernanzaEndpointDesignFormProps = {
  endpoint: EndpointSpec;
  value: GobernanzaCardDesign;
  onChange: (next: GobernanzaCardDesign) => void;
  /** Controles de diseño bloqueados; sigue visible inventario y vista previa. */
  readOnly?: boolean;
  /** Capacidades por sesión (scope + reglas DIOS); alimenta inventario de acciones. */
  capabilities?: GobernanzaEndpointCapabilities;
  /**
   * Formulario API ya renderizado por el padre (`renderForm` de ParametrosGobernanza).
   * Permite ver Ejecutar / resultados junto al editor de diseño sin duplicar lógica.
   */
  embeddedApiForm?: ReactNode;
};
