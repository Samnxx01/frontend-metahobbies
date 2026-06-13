import { useCallback, useEffect, useState } from 'react';
import productosService, { type ProductoCatalogoLimites } from '@/app/services/productosService';

export const DEFAULT_PRODUCTO_CATALOGO_LIMITES: ProductoCatalogoLimites = {
  nombreMax: 120,
  descripcionMax: 2000,
  descripcionCortaMax: 500,
  miniCartSidePanelThreshold: 2,
  miniCartMaxProductos: 10,
};

export function useProductoCatalogoConfig(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options;
  const [config, setConfig] = useState<ProductoCatalogoLimites>(DEFAULT_PRODUCTO_CATALOGO_LIMITES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (): Promise<ProductoCatalogoLimites> => {
    setLoading(true);
    try {
      const data = await productosService.obtenerLimitesCatalogo();
      const merged = { ...DEFAULT_PRODUCTO_CATALOGO_LIMITES, ...data };
      setConfig(merged);
      setLoaded(true);
      return merged;
    } catch {
      setConfig(DEFAULT_PRODUCTO_CATALOGO_LIMITES);
      setLoaded(true);
      return DEFAULT_PRODUCTO_CATALOGO_LIMITES;
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (payload?: Partial<ProductoCatalogoLimites>): Promise<ProductoCatalogoLimites> => {
    setSaving(true);
    try {
      const body = payload ?? config;
      const saved = await productosService.actualizarLimitesCatalogo(body);
      const merged = { ...DEFAULT_PRODUCTO_CATALOGO_LIMITES, ...saved };
      setConfig(merged);
      return merged;
    } finally {
      setSaving(false);
    }
  }, [config]);

  const patch = useCallback((partial: Partial<ProductoCatalogoLimites>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setConfig(DEFAULT_PRODUCTO_CATALOGO_LIMITES);
  }, []);

  useEffect(() => {
    if (autoLoad) void load();
  }, [autoLoad, load]);

  return {
    config,
    setConfig,
    patch,
    reset,
    load,
    save,
    loading,
    saving,
    loaded,
  };
}
