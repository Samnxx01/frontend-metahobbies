import React from 'react';
import { useLocation } from 'react-router-dom';
import ParametrosGobernanza from '../../ParametrosGobernanza';

export type GobernanzaReglasParametrizadoPageProps = {
  preferredActionId?: string;
  section?: 'tenant' | 'permisos' | 'corporativo' | 'reglas';
  moduloSlug?: string;
};

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
