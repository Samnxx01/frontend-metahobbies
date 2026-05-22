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
    try {
      const data = await inventarioService.listarTarjetasConfig(tenantSuperAdminId);
      setTarjetas(data);
    } catch {
      setTarjetas([]);
    } finally {
      setLoading(false);
    }
  }, [tenantSuperAdminId]);

  useEffect(() => {
    void refreshTarjetas();
  }, [refreshTarjetas]);

  const menuTabs = useMemo(
    () => inventarioTabsDesdeTarjetasDinamicas(tarjetas, user),
    [tarjetas, user],
  );

  return {
    tarjetas,
    menuTabs,
    menuTabsDesdeApi: menuTabs.length > 0,
    loading,
    refreshTarjetas,
  };
}
