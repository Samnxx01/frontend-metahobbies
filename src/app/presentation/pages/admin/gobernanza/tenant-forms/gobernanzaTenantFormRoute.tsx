import React from 'react';
import { useLocation } from 'react-router-dom';
import ParametrosGobernanza from '../../ParametrosGobernanza';
import {
  GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN,
} from '../gobernanzaActionIds';

export type GobernanzaTenantParametrizadoPageProps = {
  /** Acción del catálogo al abrir subruta (p. ej. tenant-listar-libres-superadmin). */
  preferredActionId?: string;
  section?: 'tenant' | 'permisos' | 'corporativo' | 'reglas';
  moduloSlug?: string;
  tipoSection?: string | null;
};

/**
 * Vista tenant alimentada por gobernanzaModuloConfigs.
 * operacionesHub mantiene pestañas del hub y renderiza el formulario en el padre.
 */
export function GobernanzaTenantParametrizadoPage({
  preferredActionId,
  section = 'tenant',
  moduloSlug = 'tenant',
  tipoSection = null,
}: GobernanzaTenantParametrizadoPageProps): React.ReactElement {
  const { pathname } = useLocation();
  const tipoSectionResolved =
    tipoSection
    ?? (section === 'tenant' ? GOBERNANZA_TIPO_SECTION_TENANT_SUPER_ADMIN : null);

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
      operacionesHub
      tipoSection={tipoSectionResolved}
    />
  );
}

/** Página de subformulario en rutasSeguridad con acción sugerida al entrar. */
export function createGobernanzaTenantFormRoute(
  preferredActionId?: string,
  opts?: Pick<GobernanzaTenantParametrizadoPageProps, 'section' | 'moduloSlug' | 'tipoSection'>,
) {
  return function GobernanzaTenantFormRoute(): React.ReactElement {
    return (
      <GobernanzaTenantParametrizadoPage
        preferredActionId={preferredActionId}
        section={opts?.section}
        moduloSlug={opts?.moduloSlug}
        tipoSection={opts?.tipoSection}
      />
    );
  };
}
