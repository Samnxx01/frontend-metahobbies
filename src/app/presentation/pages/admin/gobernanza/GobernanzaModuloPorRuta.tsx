import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ParametrosGobernanza from '../ParametrosGobernanza';
import { GOBERNANZA_MODULO_TENANT, getGobernanzaModuloBySlug } from './gobernanzaModuloConfig';
import { getGobernanzaModuloCatalogoLocal, normalizeGobernanzaModuloSlug } from './gobernanzaModulosCatalog';

export type GobernanzaModuloPorRutaProps = {
  moduloSlug?: string;
  mode?: 'full' | 'rules' | 'superAdmin' | 'superAdminRules';
};

/**
 * Página por `:modulo` — el menú y acciones los carga GobernanzaModuloDinamico vía API.
 */
export function GobernanzaModuloPorRuta({
  moduloSlug: moduloSlugProp,
  mode = 'full',
}: GobernanzaModuloPorRutaProps): React.ReactElement {
  const params = useParams<{ modulo?: string }>();
  const slug = normalizeGobernanzaModuloSlug(
    moduloSlugProp ?? params.modulo ?? GOBERNANZA_MODULO_TENANT.slug
  );

  const section = useMemo(() => {
    const local = getGobernanzaModuloCatalogoLocal(slug);
    if (local) return local.section;
    return getGobernanzaModuloBySlug(slug)?.section ?? 'tenant';
  }, [slug]);

  const conocido = getGobernanzaModuloCatalogoLocal(slug) || getGobernanzaModuloBySlug(slug);

  if (!conocido) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-foreground">Módulo no encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No existe configuración local para «{slug}». Registra el módulo en el catálogo o en el API.
        </p>
      </div>
    );
  }

  return (
    <ParametrosGobernanza
      mode={mode}
      initialSection={section}
      lockedSection={section}
      inlineModuloSlug={slug}
    />
  );
}

export default GobernanzaModuloPorRuta;
