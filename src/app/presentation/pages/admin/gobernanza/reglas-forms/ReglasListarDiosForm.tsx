import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasListarDiosForm;
const ReglasListarDiosFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasListarDiosForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasListarDiosFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Listar reglas DIOS"
      hint="Consulta GET de reglas de plataforma por tenantSuperAdmin."
    />
  );
}
