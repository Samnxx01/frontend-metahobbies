import type { AccionOption } from '@/app/services/routesService';
import type { Route } from '@/app/services/routesService';
import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';
import type { MarcoPermisosAfiliado } from '../types/marco.types';
import { normalizeIdList, toId } from './toId';

export function normalizeMarcoPermisosAfiliado(
  marco: MarcoPermisosAfiliado | null | undefined
): MarcoPermisosAfiliado | null {
  if (!marco) return null;

  const id = resolveEntityPublicId(marco);

  return {
    ...marco,
    ...(id ? { _id: id, iud: id } : {}),
    rolCorporativoId: marco.rolCorporativoId
      ? normalizePublicIdForApi(marco.rolCorporativoId)
      : marco.rolCorporativoId,
    vistas: normalizeIdList(marco.vistas),
    acciones: normalizeIdList(marco.acciones),
  };
}

export function normalizeRouteCatalogRow(route: Route): Route {
  const id = toId(route);
  return id ? { ...route, iud: id, _id: id } : route;
}

export function normalizeAccionCatalogRow(accion: AccionOption): AccionOption {
  const id = toId(accion);
  return id ? { ...accion, _id: id, iud: id } : accion;
}
