import React from 'react';
import type { GobernanzaPermisosFormProps } from './types';
import { createGobernanzaPermisoFormRoute } from './gobernanzaPermisoFormRoute';

const ENDPOINT_ID = 'perm-listar-herencias';
const PermListarHerenciasFormRoute = createGobernanzaPermisoFormRoute(ENDPOINT_ID);

export function PermListarHerenciasForm({ embeddedApiForm }: GobernanzaPermisosFormProps): React.ReactElement {
  if (!embeddedApiForm) return <PermListarHerenciasFormRoute />;
  return <>{embeddedApiForm}</>;
}

export default PermListarHerenciasForm;

