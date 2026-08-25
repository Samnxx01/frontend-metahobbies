import React from 'react';

import { GobernanzaTenantParametrizadoPage } from './tenant-forms/gobernanzaTenantFormRoute';

/** Wrapper sin props para rutasSeguridad; el formulario activo se resuelve desde gobernanzaModuloConfigs. */
export default function GobernanzaTenantRoutePage(): React.ReactElement {
  return <GobernanzaTenantParametrizadoPage />;
}
