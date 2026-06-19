import React from 'react';

import {
  resolverReglasFormComponent,
  resolverReglasFormPorEndpoint,
} from './gobernanzaReglasFormResolver';
import { ReglasListarTenantForm } from './ReglasListarTenantForm';
import type { GobernanzaReglasFormProps } from './types';

export type GobernanzaReglasFormByEndpointProps = GobernanzaReglasFormProps & {
  formularioComponent?: string | null;
};

/** Resolución por componente en gobernanzaModuloConfigs / gobernanzaModuloTipos o por endpointId. */
export function GobernanzaReglasFormByEndpoint({
  formularioComponent,
  embeddedApiForm,
  endpoint,
  ...props
}: GobernanzaReglasFormByEndpointProps): React.ReactElement {
  const Form =
    resolverReglasFormComponent(formularioComponent)
    ?? resolverReglasFormPorEndpoint(endpoint?.id)
    ?? ReglasListarTenantForm;

  return (
    <Form
      embeddedApiForm={embeddedApiForm}
      endpoint={endpoint}
      formularioComponent={formularioComponent}
      {...props}
    />
  );
}
