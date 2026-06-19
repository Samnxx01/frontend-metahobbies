import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasEliminarGlobalForm;
const ReglasEliminarGlobalFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasEliminarGlobalForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasEliminarGlobalFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Eliminar regla global"
      hint="Eliminación definitiva de regla global (header x-regla-id)."
    />
  );
}
