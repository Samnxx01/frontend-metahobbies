import { useCallback, useEffect, useState } from 'react';
import {
  fetchMiniCartConfig,
  getBootstrapMiniCartConfig,
  type MiniCartConfig,
} from '@/app/config/miniCartConfig';

export function useMiniCartConfig() {
  const [config, setConfig] = useState<MiniCartConfig>(() => getBootstrapMiniCartConfig());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<MiniCartConfig> => {
    setLoading(true);
    try {
      const next = await fetchMiniCartConfig();
      setConfig(next);
      return next;
    } catch {
      const fallback = getBootstrapMiniCartConfig();
      setConfig(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { config, loading, reload };
}
