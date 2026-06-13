import { MARCO_AFILIADO_CODIGO } from '../constants/catalog-filters';
import type { RolMarcoParametrizable } from '../types/marco.types';
import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

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

  return {
    _id: resolveEntityPublicId(rol as { iud?: string; _id?: string; id?: string }),
    rol: nombre,
    codigo,
    scopeKey: buildMarcoScopeKeyFromRolNombre(nombre),
    tenantCorporativo,
  };
}
