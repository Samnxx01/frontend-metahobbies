import type { GobernanzaModuloFiltrosVistaApi } from './gobernanzaModuloApiTypes';

export function filtrosVistaPlain(
  fv?: GobernanzaModuloFiltrosVistaApi | null
): GobernanzaModuloFiltrosVistaApi {
  return {
    tenantSuperAdminIds: (fv?.tenantSuperAdminIds ?? []).map(String).filter(Boolean),
    tenantGlobalIds: (fv?.tenantGlobalIds ?? []).map(String).filter(Boolean),
    usuarioIds: (fv?.usuarioIds ?? []).map(String).filter(Boolean),
  };
}

export function contarAlcancesParametrizados(
  fv?: GobernanzaModuloFiltrosVistaApi | null
): number {
  const plain = filtrosVistaPlain(fv);
  return (
    plain.tenantSuperAdminIds.length +
    plain.tenantGlobalIds.length +
    plain.usuarioIds.length
  );
}

export function tieneAlcancesParametrizados(
  fv?: GobernanzaModuloFiltrosVistaApi | null
): boolean {
  return contarAlcancesParametrizados(fv) > 0;
}

export function filtrarConfigsConAlcancesParametrizados<
  T extends { filtrosVista?: GobernanzaModuloFiltrosVistaApi | null }
>(configs: T[] = []): T[] {
  return configs.filter((cfg) => tieneAlcancesParametrizados(cfg.filtrosVista));
}
