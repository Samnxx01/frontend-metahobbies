import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GOBERNANZA_PARAMETRIZACION_UI_SETS_VACIO,
  toParametrizacionUiSets,
  type GobernanzaParametrizacionUi,
  type GobernanzaParametrizacionUiSets,
} from './gobernanzaParametrizacionUi';
import { fetchGobernanzaParametrizacionUi, peekGobernanzaParametrizacionUiCache } from './gobernanzaModuloService';

export type UseGobernanzaParametrizacionUiOptions = {
  enabled?: boolean;
};

/**
 * Conjuntos de endpointId para ParametrosGobernanza, derivados de gobernanzaModuloConfigs.
 */
export function useGobernanzaParametrizacionUi(options: UseGobernanzaParametrizacionUiOptions = {}) {
  const enabled = options.enabled !== false;
  const [raw, setRaw] = useState<GobernanzaParametrizacionUi | null>(() =>
    peekGobernanzaParametrizacionUiCache()
  );
  const [loading, setLoading] = useState(enabled && !peekGobernanzaParametrizacionUiCache());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setRaw(null);
      return;
    }
    const cached = peekGobernanzaParametrizacionUiCache();
    if (cached) {
      setRaw(cached);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGobernanzaParametrizacionUi();
      setRaw(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar parametrización UI');
      setRaw(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sets: GobernanzaParametrizacionUiSets = useMemo(
    () => (raw ? toParametrizacionUiSets(raw) : GOBERNANZA_PARAMETRIZACION_UI_SETS_VACIO),
    [raw]
  );

  return {
    loading,
    error,
    raw,
    sets,
    refresh,
    ready: Boolean(raw) && !loading,
  };
}

export type GobernanzaParametrizacionUiState = ReturnType<typeof useGobernanzaParametrizacionUi>;
