import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasActualizarGlobalForm;
const ReglasActualizarGlobalFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasActualizarGlobalForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasActualizarGlobalFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Actualizar reglas globales"
      hint="PUT de regla global con header x-regla-id."
    />
  );
}
