import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';
import { ParametrosGobernanzaWithRouting } from '../';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasCrearGlobalForm;

export function ReglasCrearGlobalForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return (
    <ParametrosGobernanzaWithRouting mode="full" initialSection="reglas" lockedSection="reglas" allowedEndpointIds={[ENDPOINT_ID]} initialEndpointId={ENDPOINT_ID} singleFormInline />
  );
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Crear reglas globales"
      hint="Alta de reglas de jerarquía por tenant global (POST globales/reglas/jerarquia/roles)."
    />
  );
}
