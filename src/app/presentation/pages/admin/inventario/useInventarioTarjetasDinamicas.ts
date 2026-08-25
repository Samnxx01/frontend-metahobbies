import { useCallback, useEffect, useMemo, useState } from 'react';
import inventarioService, { type InventarioConfigTarjeta } from '@/app/services/inventarioService';
import {
  inventarioTabsDesdeTarjetasDinamicas,
  inventarioTenantSuperAdminIdDesdeUsuario,
  type InventarioJwtScopeUserLike,
  type InventarioTabValue,
} from './inventarioModulosCatalog';

type UseInventarioTarjetasDinamicasResult = {
  tarjetas: InventarioConfigTarjeta[];
  /** Pestañas para `InventarioMenuTabs` (API o catálogo + JWT). */
  menuTabs: Array<{ value: InventarioTabValue; label: string }>;
  /** true si el menú viene de GET `/config/tarjetas`. */
  menuTabsDesdeApi: boolean;
  loading: boolean;
  refreshTarjetas: () => Promise<void>;
};

/**
 * GET `/api/inventario/config/tarjetas` — misma fuente para ConfigInventario y InventarioMenuTabs.
 */
export function useInventarioTarjetasDinamicas(
  user: InventarioJwtScopeUserLike | null | undefined,
): UseInventarioTarjetasDinamicasResult {
  const [tarjetas, setTarjetas] = useState<InventarioConfigTarjeta[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantSuperAdminId = useMemo(
    () => inventarioTenantSuperAdminIdDesdeUsuario(user),
    [user],
  );

  const refreshTarjetas = useCallback(async () => {
    setLoading(true);
    console.info('[MABS][INVENTARIO][TARJETAS] Solicitando configuracion dinamica', {
      tenantSuperAdminId: tenantSuperAdminId ?? null,
      pathname: window.location.pathname,
    });
    try {
      const data = await inventarioService.listarTarjetasConfig(tenantSuperAdminId);
      console.info('[MABS][INVENTARIO][TARJETAS] Respuesta recibida', {
        total: data.length,
        tarjetas: data.map((tarjeta) => ({
          id: tarjeta.id,
          rutaId: tarjeta.rutaId,
          path: tarjeta.path,
          tab: tarjeta.tab,
          component: tarjeta.contenido?.component ?? null,
        })),
      });
      setTarjetas(data);
    } catch (error) {
      console.error('[MABS][INVENTARIO][TARJETAS] Error cargando configuracion dinamica', error);
      setTarjetas([]);
    } finally {
      setLoading(false);
    }
  }, [tenantSuperAdminId]);

  useEffect(() => {
    void refreshTarjetas();
  }, [refreshTarjetas]);

  useEffect(() => {
    const handleRoutesUpdated = (): void => {
      console.info('[MABS][INVENTARIO][TARJETAS] Ruta de seguridad actualizada; refrescando tarjetas');
      void refreshTarjetas();
    };
    window.addEventListener('admin-routes-updated', handleRoutesUpdated);
    return () => window.removeEventListener('admin-routes-updated', handleRoutesUpdated);
  }, [refreshTarjetas]);

  const menuTabs = useMemo(
    () => inventarioTabsDesdeTarjetasDinamicas(tarjetas, user),
    [tarjetas, user],
  );

  useEffect(() => {
    console.info('[MABS][INVENTARIO][TARJETAS] Pestañas resueltas', {
      menuTabs,
      fuente: menuTabs.length > 0 ? 'API_CONFIG_TARJETAS' : 'SIN_TARJETAS',
    });
  }, [menuTabs]);

  return {
    tarjetas,
    menuTabs,
    menuTabsDesdeApi: menuTabs.length > 0,
    loading,
    refreshTarjetas,
  };
}
