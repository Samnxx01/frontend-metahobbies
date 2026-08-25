import React from 'react';

import { GobernanzaReglasParametrizadoPage } from './reglas-forms/gobernanzaReglasFormRoute';

/** Wrapper sin props para rutasSeguridad; conserva el hub y las tabs parametrizadas de reglas. */
export default function GobernanzaReglasRoutePage(): React.ReactElement {
  return <GobernanzaReglasParametrizadoPage />;
}
