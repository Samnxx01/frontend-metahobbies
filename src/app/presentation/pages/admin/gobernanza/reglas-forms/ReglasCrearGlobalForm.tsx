import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasCrearGlobalForm;
const ReglasCrearGlobalFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasCrearGlobalForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasCrearGlobalFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Crear reglas globales"
      hint="Alta de reglas de jerarquía por tenant global (POST globales/reglas/jerarquia/roles)."
    />
  );
}
