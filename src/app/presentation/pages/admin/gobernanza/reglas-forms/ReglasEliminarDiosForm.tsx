import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasEliminarDiosForm;
const ReglasEliminarDiosFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasEliminarDiosForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasEliminarDiosFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Eliminar regla DIOS"
      hint="Eliminación de regla de plataforma por tenantSuperAdmin e id."
    />
  );
}
