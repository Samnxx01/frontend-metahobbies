import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasActualizarDiosForm;
const ReglasActualizarDiosFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasActualizarDiosForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasActualizarDiosFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Actualizar regla DIOS"
      hint="Sincroniza la regla plataforma del tenantSuperAdmin elegido."
    />
  );
}
