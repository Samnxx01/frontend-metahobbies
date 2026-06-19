import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasDesactivarGlobalForm;
const ReglasDesactivarGlobalFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasDesactivarGlobalForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasDesactivarGlobalFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Desactivar regla global"
      hint="Desactivación reversible de regla global (header x-regla-id)."
    />
  );
}
