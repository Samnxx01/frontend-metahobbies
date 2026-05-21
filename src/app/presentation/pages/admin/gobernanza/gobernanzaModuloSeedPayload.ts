import { GOBERNANZA_MODULOS_CATALOGO } from './gobernanzaModulosCatalog';
import { ENDPOINTS } from './parametrosGobernanzaEndpoints';

/** Acciones tenant para payload de upsert (ids alineados a parametrosGobernanzaEndpoints). */
const TENANT_ACCION_IDS = [
  'tenant-listar-libres-tenantglobal',
  'tenant-crear-global-usuario',
  'tenant-actualizar-global',
  'tenant-desactivar-global',
  'tenant-eliminar-global',
] as const;

function accionesDesdeEndpoints(ids: readonly string[]) {
  return ids
    .map((id) => ENDPOINTS.find((e) => e.id === id))
    .filter(Boolean)
    .map((e, idx) => ({
      id: e!.id,
      method: e!.method,
      path: e!.path,
      title: e!.title,
      description: e!.description,
      shortLabel:
        e!.id === 'tenant-listar-libres-tenantglobal'
          ? 'Consulta'
          : e!.id === 'tenant-crear-global-usuario'
            ? 'Alta'
            : e!.id === 'tenant-actualizar-global'
              ? 'Edición'
              : e!.id === 'tenant-desactivar-global'
                ? 'Bloqueo'
                : e!.id === 'tenant-eliminar-global'
                  ? 'Eliminación'
                  : '',
      actor: e!.actor,
      orden: (idx + 1) * 10,
    }));
}

export type GobernanzaModuloRutaBinding = {
  rutaId?: string | null;
  rutaPath?: string | null;
};

export type GobernanzaModuloFiltrosVistaPayload = {
  tenantSuperAdminIds?: string[];
  tenantGlobalIds?: string[];
  usuarioIds?: string[];
};

export type GobernanzaModuloUpsertCampos = {
  label?: string;
  description?: string;
  menuPath?: string;
  filtrosVista?: GobernanzaModuloFiltrosVistaPayload;
};

/**
 * Payload para POST /gobernanza/modulos/upsert (requiere rutaId o rutaPath en rutasSeguridad).
 */
export function buildGobernanzaModuloUpsertPayload(
  slug: string,
  ruta: GobernanzaModuloRutaBinding | string,
  campos?: GobernanzaModuloUpsertCampos
): Record<string, unknown> | null {
  const local = GOBERNANZA_MODULOS_CATALOGO.find((m) => m.slug === slug);
  if (!local) return null;

  const binding: GobernanzaModuloRutaBinding =
    typeof ruta === 'string' ? { rutaPath: ruta } : ruta;

  if (!binding.rutaId && !binding.rutaPath?.trim()) return null;

  const label = String(campos?.label ?? local.label).trim();
  const description = String(campos?.description ?? local.description).trim();
  const menuPath = String(campos?.menuPath ?? binding.rutaPath ?? '').trim();
  if (!label) return null;
  if (!menuPath && !binding.rutaId) return null;

  const acciones =
    slug === 'tenant' ? accionesDesdeEndpoints(TENANT_ACCION_IDS) : [];

  const fv = campos?.filtrosVista;

  return {
    ...(binding.rutaId ? { rutaId: binding.rutaId } : {}),
    ...(binding.rutaPath?.trim() ? { rutaPath: binding.rutaPath.trim() } : {}),
    ...(menuPath ? { menuPath } : {}),
    slug: local.slug,
    section: local.section,
    label,
    description,
    ...(fv
      ? {
          filtrosVista: {
            tenantSuperAdminIds: fv.tenantSuperAdminIds ?? [],
            tenantGlobalIds: fv.tenantGlobalIds ?? [],
            usuarioIds: fv.usuarioIds ?? [],
          },
        }
      : {}),
    frontPathSegment: local.frontPathSegment,
    orden: local.orden,
    defaultActionId: slug === 'tenant' ? TENANT_ACCION_IDS[0] : null,
    actionQueryParam: 'accion',
    acciones,
  };
}

export function buildGobernanzaModulosBulkSeed(
  rutasPorSlug: Record<string, string>
): { modulos: Record<string, unknown>[] } {
  const modulos: Record<string, unknown>[] = [];
  for (const [slug, rutaPath] of Object.entries(rutasPorSlug)) {
    const item = buildGobernanzaModuloUpsertPayload(slug, rutaPath);
    if (item) modulos.push(item);
  }
  return { modulos };
}
