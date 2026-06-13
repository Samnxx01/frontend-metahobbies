import React from 'react';

import { GobernanzaFormularioPorRuta } from '../GobernanzaFormularioPorRuta';

import { resolverPermisosFormComponent } from './gobernanzaPermisosFormRegistry';
import type { GobernanzaPermisosFormProps } from './types';

export type GobernanzaPermisosFormByEndpointProps = GobernanzaPermisosFormProps & {
  formularioComponent?: string | null;
};

/** Resolución por nombre de componente en gobernanzaModuloConfigs / gobernanzaModuloTipos. */
export function GobernanzaPermisosFormByEndpoint({
  formularioComponent,
  embeddedApiForm,
  ...props
}: GobernanzaPermisosFormByEndpointProps): React.ReactElement {
  const Form = resolverPermisosFormComponent(formularioComponent);

  if (Form) {
    return <Form embeddedApiForm={embeddedApiForm} {...props} />;
  }

  if (embeddedApiForm) {
    return <>{embeddedApiForm}</>;
  }

  return <GobernanzaFormularioPorRuta section="permisos" moduloSlug="permisos" formularioComponent={formularioComponent} />;
}
