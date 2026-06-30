import React from 'react';
import { useLocation } from 'react-router-dom';
import ParametrosGobernanza from '../../ParametrosGobernanza';
import { GOBERNANZA_TIPO_SECTION_REGLAS_SA } from '../gobernanzaActionIds';

export type GobernanzaReglasParametrizadoPageProps = {
  preferredActionId?: string;
  section?: 'tenant' | 'permisos' | 'corporativo' | 'reglas';
  moduloSlug?: string;
};

/**
 * Vista de reglas alimentada por gobernanzaModuloConfigs.
 * operacionesHub mantiene pestañas del hub y renderiza el formulario en el padre.
 */
export function GobernanzaReglasParametrizadoPage({
  preferredActionId,
  section = 'reglas',
  moduloSlug = 'reglas',
}: GobernanzaReglasParametrizadoPageProps): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <ParametrosGobernanza
      mode="full"
      initialSection={section}
      lockedSection={section}
      inlineModuloSlug={moduloSlug}
      menuPath={pathname}
      preferredActionId={preferredActionId}
      shellVariant="compact"
      enableCardDesignEditor={false}
      operacionesHub
      tipoSection={GOBERNANZA_TIPO_SECTION_REGLAS_SA}
    />
  );
}

export function createGobernanzaReglasFormRoute(
  preferredActionId?: string,
  opts?: Pick<GobernanzaReglasParametrizadoPageProps, 'section' | 'moduloSlug'>,
) {
  return function GobernanzaReglasFormRoute(): React.ReactElement {
    return (
      <GobernanzaReglasParametrizadoPage
        preferredActionId={preferredActionId}
        section={opts?.section}
        moduloSlug={opts?.moduloSlug}
      />
    );
  };
}
