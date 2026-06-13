import React from 'react';

import { GobernanzaFormularioPorRuta } from '../GobernanzaFormularioPorRuta';

import { resolverReglasFormComponent } from './gobernanzaReglasFormRegistry';
import type { GobernanzaReglasFormProps } from './gobernanzaReglasFormRegistry';

export type GobernanzaReglasFormByEndpointProps = GobernanzaReglasFormProps & {
  formularioComponent?: string | null;
};

/** Resolución por nombre de componente en gobernanzaModuloConfigs / gobernanzaModuloTipos. */
export function GobernanzaReglasFormByEndpoint({
  formularioComponent,
  embeddedApiForm,
  ...props
}: GobernanzaReglasFormByEndpointProps): React.ReactElement {
  const Form = resolverReglasFormComponent(formularioComponent);

  if (Form) {
    return <Form embeddedApiForm={embeddedApiForm} formularioComponent={formularioComponent} {...props} />;
  }

  if (embeddedApiForm) {
    return <>{embeddedApiForm}</>;
  }

  return (
    <GobernanzaFormularioPorRuta
      section="reglas"
      moduloSlug="reglas"
      formularioComponent={formularioComponent}
    />
  );
}
