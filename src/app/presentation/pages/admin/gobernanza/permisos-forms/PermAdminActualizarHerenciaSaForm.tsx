import React from 'react';
import type { GobernanzaPermisosFormProps } from './types';
import { ParametrosGobernanzaWithRouting } from '../';

const ENDPOINT_ID = 'perm-admin-tenant-global-actualizar-sa';

export function PermAdminActualizarHerenciaSaForm({
  embeddedApiForm,
}: GobernanzaPermisosFormProps): React.ReactElement {
  if (!embeddedApiForm) return (
    <ParametrosGobernanzaWithRouting mode="full" initialSection="permisos" lockedSection="permisos" allowedEndpointIds={[ENDPOINT_ID]} initialEndpointId={ENDPOINT_ID} singleFormInline />
  );
  return <>{embeddedApiForm}</>;
}

export default PermAdminActualizarHerenciaSaForm;
