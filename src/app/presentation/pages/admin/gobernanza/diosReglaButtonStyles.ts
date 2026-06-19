/** Botones Crear / Sincronizar regla DIOS — COLOR_SUNSET de la paleta activa. */
import { BTN_ACTION, BTN_PENDING } from '@/app/utils/buttonStyles';

export const DIOS_REGLA_BTN_ACTIVO = BTN_ACTION;

export const DIOS_REGLA_BTN_PENDIENTE = BTN_PENDING;

export function diosReglaExecuteButtonClassName(
  scopeJwtSaSinCorporativoValidado: boolean,
  esJwtSoloTenantSuperAdmin: boolean,
): string | undefined {
  if (scopeJwtSaSinCorporativoValidado) return DIOS_REGLA_BTN_ACTIVO;
  if (esJwtSoloTenantSuperAdmin) return DIOS_REGLA_BTN_PENDIENTE;
  return undefined;
}
