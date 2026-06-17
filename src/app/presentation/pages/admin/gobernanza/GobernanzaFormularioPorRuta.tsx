import React from 'react';
import { useLocation } from 'react-router-dom';
import ParametrosGobernanza from '../ParametrosGobernanza';
import { endpointIdDesdeComponente } from './permisos-forms/gobernanzaPermisosFormRegistry';

export type GobernanzaFormularioPorRutaProps = {
  /** Sección gobernanza (default permisos). */
  section?: 'tenant' | 'permisos' | 'corporativo' | 'reglas';
  moduloSlug?: string;
  /** Resuelve preferredActionId vía catálogo (p. ej. PermListarHerenciasForm). */
  formularioComponent?: string | null;
  preferredActionId?: string | null;
};

/**
 * Monta un formulario publicado en gobernanzaModuloConfigs según el path SPA actual
 * (menuPath + formularioComponent), no el catálogo quemado de endpoints.
 */
export function GobernanzaFormularioPorRuta({
  section = 'permisos',
  moduloSlug = 'permisos',
  formularioComponent = null,
  preferredActionId: preferredActionIdProp = null,
}: GobernanzaFormularioPorRutaProps): React.ReactElement {
  const { pathname } = useLocation();
  const preferredActionId =
    String(preferredActionIdProp || '').trim()
    || endpointIdDesdeComponente(formularioComponent)
    || null;

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

export default GobernanzaFormularioPorRuta;
