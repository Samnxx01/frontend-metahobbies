import { MARCO_AFILIADO_CODIGO } from '../constants/catalog-filters';
import type { RolMarcoParametrizable } from '../types/marco.types';
import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

export const MARCO_PERMISOS_ROL_SESSION_KEY = 'mabs.marcoPermisos.rolCorporativoId';

export function normalizeRolMarcoParametrizable(
  rol: RolMarcoParametrizable | Record<string, unknown>
): RolMarcoParametrizable {
  const id = resolveEntityPublicId(rol as { iud?: string; _id?: string; id?: string });
  const mapped =
    'codigo' in rol && 'scopeKey' in rol
      ? (rol as RolMarcoParametrizable)
      : mapRolCorporativoAMarco(rol as Record<string, unknown>);
  return { ...mapped, _id: id || mapped._id };
}

export function readPersistedRolMarcoId(): string | null {
  try {
    const id = sessionStorage.getItem(MARCO_PERMISOS_ROL_SESSION_KEY);
    return id?.trim() || null;
  } catch {
    return null;
  }
}

export function persistRolMarcoId(rolId: string | null): void {
  try {
    if (rolId) {
      sessionStorage.setItem(MARCO_PERMISOS_ROL_SESSION_KEY, rolId);
    } else {
      sessionStorage.removeItem(MARCO_PERMISOS_ROL_SESSION_KEY);
    }
  } catch {
    /* sessionStorage no disponible */
  }
}

export function buildMarcoCodigoFromRolNombre(rolNombre: string): string {
  const nombre = String(rolNombre || 'ROL').trim().toUpperCase();
  if (nombre === 'CLIENTE') return MARCO_AFILIADO_CODIGO;
  return `${nombre}_PLATAFORMA`;
}

export function buildMarcoScopeKeyFromRolNombre(rolNombre: string): string {
  return `marcoPermisosAfiliado:${buildMarcoCodigoFromRolNombre(rolNombre)}`;
}

export function mapRolCorporativoAMarco(
  rol: Record<string, unknown>
): RolMarcoParametrizable {
  const nombre = String(rol.rol || '').trim().toUpperCase();
  const tenantCorporativo = rol.tenantCorporativo
    ? normalizePublicIdForApi(rol.tenantCorporativo)
    : null;
  const codigo =
    nombre === 'CLIENTE' && !tenantCorporativo
      ? MARCO_AFILIADO_CODIGO
      : buildMarcoCodigoFromRolNombre(nombre);

  const id = resolveEntityPublicId(rol as { iud?: string; _id?: string; id?: string });
  return {
    _id: id,
    rol: nombre,
    codigo,
    scopeKey: buildMarcoScopeKeyFromRolNombre(nombre),
    tenantCorporativo,
  };
}
