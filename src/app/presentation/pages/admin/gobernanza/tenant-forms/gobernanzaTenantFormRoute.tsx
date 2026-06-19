import React from 'react';
import { useLocation } from 'react-router-dom';
import ParametrosGobernanza from '../../ParametrosGobernanza';

export type GobernanzaTenantParametrizadoPageProps = {
  /** Acción del catálogo al abrir subruta (p. ej. tenant-listar-libres-superadmin). */
  preferredActionId?: string;
  section?: 'tenant' | 'permisos' | 'corporativo' | 'reglas';
  moduloSlug?: string;
};

/**
 * Vista tenant alimentada por gobernanzaModuloConfigs: formulario en la subruta publicada.
 * Sin query ?accion= — la acción se resuelve por menuPath + preferredActionId.
 */
export function GobernanzaTenantParametrizadoPage({
  preferredActionId,
  section = 'tenant',
  moduloSlug = 'tenant',
}: GobernanzaTenantParametrizadoPageProps): React.ReactElement {
  const { pathname } = useLocation();

  return (
    <ParametrosGobernanza
      mode="superAdmin"
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

/** Página de subformulario en rutasSeguridad con acción sugerida al entrar. */
export function createGobernanzaTenantFormRoute(
  preferredActionId?: string,
  opts?: Pick<GobernanzaTenantParametrizadoPageProps, 'section' | 'moduloSlug'>,
) {
  return function GobernanzaTenantFormRoute(): React.ReactElement {
    return (
      <GobernanzaTenantParametrizadoPage
        preferredActionId={preferredActionId}
        section={opts?.section}
        moduloSlug={opts?.moduloSlug}
      />
    );
  };
}
