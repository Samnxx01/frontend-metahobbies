import React from 'react';
import { ReglasFormShell } from './ReglasFormShell';
import type { GobernanzaReglasFormProps } from './types';
import { createGobernanzaReglasFormRoute } from './gobernanzaReglasFormRoute';
import { ENDPOINT_ID_BY_REGLAS_COMPONENT } from './gobernanzaReglasFormRegistry';

const ENDPOINT_ID = ENDPOINT_ID_BY_REGLAS_COMPONENT.ReglasListarTenantForm;
const ReglasListarTenantFormRoute = createGobernanzaReglasFormRoute(ENDPOINT_ID);

export function ReglasListarTenantForm(props: GobernanzaReglasFormProps): React.ReactElement {
  if (!props.embeddedApiForm) return <ReglasListarTenantFormRoute />;
  return (
    <ReglasFormShell
      {...props}
      eyebrow="Listar reglas tenant"
      hint="Consulta GET de reglas creadas por tenant global."
    />
  );
}
