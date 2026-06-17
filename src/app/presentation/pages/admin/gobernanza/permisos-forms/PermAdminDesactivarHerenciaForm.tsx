import React from 'react';
import type { GobernanzaPermisosFormProps } from './types';
import { createGobernanzaPermisoFormRoute } from './gobernanzaPermisoFormRoute';

const ENDPOINT_ID = 'perm-admin-tenant-global-desactivar';
const PermAdminDesactivarHerenciaFormRoute = createGobernanzaPermisoFormRoute(ENDPOINT_ID);

export function PermAdminDesactivarHerenciaForm({
  embeddedApiForm,
}: GobernanzaPermisosFormProps): React.ReactElement {
  if (!embeddedApiForm) return <PermAdminDesactivarHerenciaFormRoute />;
  return <>{embeddedApiForm}</>;
}

export default PermAdminDesactivarHerenciaForm;
