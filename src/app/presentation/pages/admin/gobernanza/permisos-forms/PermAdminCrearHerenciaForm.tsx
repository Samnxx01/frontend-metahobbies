import React from 'react';
import type { GobernanzaPermisosFormProps } from './types';
import { createGobernanzaPermisoFormRoute } from './gobernanzaPermisoFormRoute';

const ENDPOINT_ID = 'perm-admin-tenant-global';
const PermAdminCrearHerenciaFormRoute = createGobernanzaPermisoFormRoute(ENDPOINT_ID);

export function PermAdminCrearHerenciaForm({ embeddedApiForm }: GobernanzaPermisosFormProps): React.ReactElement {
  if (!embeddedApiForm) return <PermAdminCrearHerenciaFormRoute />;
  return <>{embeddedApiForm}</>;
}

export default PermAdminCrearHerenciaForm;
