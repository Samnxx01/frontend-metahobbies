import React from 'react';
import type { GobernanzaPermisosFormProps } from './types';
import { ParametrosGobernanzaWithRouting } from '../';

const ENDPOINT_ID = 'perm-listar-herencias';

export function PermListarHerenciasForm({ embeddedApiForm }: GobernanzaPermisosFormProps): React.ReactElement {
  if (!embeddedApiForm) return (
    <ParametrosGobernanzaWithRouting mode="full" initialSection="permisos" lockedSection="permisos" allowedEndpointIds={[ENDPOINT_ID]} initialEndpointId={ENDPOINT_ID} singleFormInline />
  );
  return <>{embeddedApiForm}</>;
}

export default PermListarHerenciasForm;

