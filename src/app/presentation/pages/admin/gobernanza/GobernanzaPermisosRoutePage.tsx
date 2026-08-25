import React from 'react';

import { GobernanzaPermisosParametrizadoPage } from './permisos-forms/gobernanzaPermisoFormRoute';

/** Wrapper sin props para rutasSeguridad; conserva el hub y las tabs parametrizadas de permisos. */
export default function GobernanzaPermisosRoutePage(): React.ReactElement {
  return <GobernanzaPermisosParametrizadoPage />;
}
