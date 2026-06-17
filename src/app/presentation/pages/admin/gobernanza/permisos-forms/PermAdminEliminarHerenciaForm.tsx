import React from 'react';
import type { GobernanzaPermisosFormProps } from './types';
import { createGobernanzaPermisoFormRoute } from './gobernanzaPermisoFormRoute';

const ENDPOINT_ID = 'perm-admin-tenant-global-eliminar';
const PermAdminEliminarHerenciaFormRoute = createGobernanzaPermisoFormRoute(ENDPOINT_ID);

export function PermAdminEliminarHerenciaForm({
  embeddedApiForm,
}: GobernanzaPermisosFormProps): React.ReactElement {
  if (!embeddedApiForm) return <PermAdminEliminarHerenciaFormRoute />;
  return <>{embeddedApiForm}</>;
}

export default PermAdminEliminarHerenciaForm;
