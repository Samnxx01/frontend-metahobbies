import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasCrearDiosForm;
const ReglasCrearDiosFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasCrearDiosForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasCrearDiosFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Crear regla DIOS"
      hint="Regla de plataforma para rol DIOS (POST dios/reglas/jerarquia/roles)."
    />
  );
}
