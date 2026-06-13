import React from 'react';
import type { GobernanzaPermisosFormProps } from './types';
import { createGobernanzaPermisoFormRoute } from './gobernanzaPermisoFormRoute';

const ENDPOINT_ID = 'perm-admin-tenant-global-actualizar-sa';
const PermAdminActualizarHerenciaSaFormRoute = createGobernanzaPermisoFormRoute(ENDPOINT_ID);

export function PermAdminActualizarHerenciaSaForm({
  embeddedApiForm,
}: GobernanzaPermisosFormProps): React.ReactElement {
  if (!embeddedApiForm) return <PermAdminActualizarHerenciaSaFormRoute />;
  return <>{embeddedApiForm}</>;
}

export default PermAdminActualizarHerenciaSaForm;
