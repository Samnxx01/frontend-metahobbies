import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { fetchGobernanzaModulosCatalogo } from './gobernanzaModuloService';
import type {
  GobernanzaModuloCatalogoItemApi,
  GobernanzaModuloFiltrosVistaApi,
} from './gobernanzaModuloApiTypes';
import {
  getGobernanzaModuloCatalogoLocal,
  gobernanzaModulosParaGridConfig,
  type GobernanzaModuloCatalogo,
} from './gobernanzaModulosCatalog';

export type GobernanzaModuloGridItem = {
  slug: string;
  moduloId?: string | null;
  rutaId?: string | null;
  title: string;
  description: string;
  path: string;
  pathSegment: string;
  icon: GobernanzaModuloCatalogo['icon'];
  section: GobernanzaModuloCatalogo['section'];
  disponible: boolean;
  accionesDisponibles: number;
  registradoEnBd?: boolean;
  menuPath?: string;
  filtrosVista?: GobernanzaModuloFiltrosVistaApi;
};

function gridDesdeApi(modulos: GobernanzaModuloCatalogoItemApi[]): GobernanzaModuloGridItem[] {
  return modulos
    .filter((m) => m.slug)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((m) => {
      const local = getGobernanzaModuloCatalogoLocal(m.slug);
      const moduloId = m.id ?? (m as { iud?: string | null }).iud ?? null;
      const registradoEnBd = Boolean(m.registradoEnBd ?? moduloId);
      return {
        slug: m.slug,
        moduloId,
        rutaId: m.rutaId ?? null,
        title: m.label,
        description: m.description,
        path: m.menuPath || m.frontPath || m.rutaPath || `/admin/parametros-gobernanza/${m.frontPathSegment}`,
        menuPath: m.menuPath || m.frontPath || m.rutaPath || undefined,
        filtrosVista: m.filtrosVista ?? {
          tenantSuperAdminIds: [],
          tenantGlobalIds: [],
          usuarioIds: [],
        },
        pathSegment: m.frontPathSegment,
        icon: local?.icon ?? Building2,
        section: m.section,
        disponible: m.disponible !== false,
        accionesDisponibles: m.accionesDisponibles ?? 0,
        registradoEnBd,
      };
    });
}

/**
 * Catálogo dinámico para ConfigGobernanza (misma idea que useInventarioTarjetasDinamicas).
 */
export function useGobernanzaModulosCatalogo() {
  const [modulosApi, setModulosApi] = useState<GobernanzaModuloCatalogoItemApi[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGobernanzaModulosCatalogo();
      setModulosApi(Array.isArray(res.modulos) ? res.modulos : []);
    } catch (err: unknown) {
      setModulosApi(null);
      setError(err instanceof Error ? err.message : 'Error al cargar módulos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const grid = useMemo((): GobernanzaModuloGridItem[] => {
    if (modulosApi?.length) return gridDesdeApi(modulosApi);
    return gobernanzaModulosParaGridConfig().map((m) => ({
      ...m,
      disponible: true,
      accionesDisponibles: 0,
    }));
  }, [modulosApi]);

  const modulosDesdeApi = Boolean(
    modulosApi?.some((m) => Boolean(m.registradoEnBd ?? m.id)),
  );

  return {
    grid,
    modulosDesdeApi,
    loading,
    error,
    refresh,
  };
}
