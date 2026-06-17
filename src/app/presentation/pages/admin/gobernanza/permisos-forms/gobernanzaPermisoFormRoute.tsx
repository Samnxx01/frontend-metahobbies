import React from 'react';
import { useLocation } from 'react-router-dom';
import ParametrosGobernanza from '../../ParametrosGobernanza';

export type GobernanzaPermisosParametrizadoPageProps = {
  /** Acción del catálogo al abrir subruta (p. ej. perm-listar-herencias). */
  preferredActionId?: string;
};

/**
 * Vista de permisos alimentada por gobernanzaModuloConfigs: formulario en la subruta publicada.
 * Sin query ?accion= — la acción se resuelve por menuPath + preferredActionId.
 */
export function GobernanzaPermisosParametrizadoPage({
  preferredActionId,
}: GobernanzaPermisosParametrizadoPageProps): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <ParametrosGobernanza
      mode="superAdmin"
      initialSection="permisos"
      lockedSection="permisos"
      inlineModuloSlug="permisos"
      menuPath={pathname}
      preferredActionId={preferredActionId}
      shellVariant="compact"
      enableCardDesignEditor={false}
    />
  );
}

/** Página de subformulario en rutasSeguridad con acción sugerida al entrar. */
export function createGobernanzaPermisoFormRoute(preferredActionId?: string) {
  return function GobernanzaPermisoFormRoute(): React.ReactElement {
    return <GobernanzaPermisosParametrizadoPage preferredActionId={preferredActionId} />;
  };
}
