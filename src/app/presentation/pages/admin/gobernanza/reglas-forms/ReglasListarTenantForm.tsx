import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';
import { ParametrosGobernanzaWithRouting } from '../';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasListarTenantForm;

export function ReglasListarTenantForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return (
    <ParametrosGobernanzaWithRouting mode="full" initialSection="reglas" lockedSection="reglas" allowedEndpointIds={[ENDPOINT_ID]} initialEndpointId={ENDPOINT_ID} singleFormInline />
  );
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Listar reglas tenant"
      hint="Consulta GET de reglas creadas por tenant global."
    />
  );
}
