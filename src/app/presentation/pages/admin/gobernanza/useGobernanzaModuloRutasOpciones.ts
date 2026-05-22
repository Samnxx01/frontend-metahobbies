import { useCallback, useEffect, useState } from 'react';
import { fetchGobernanzaModuloRutasOpciones } from './gobernanzaModuloService';
import type { GobernanzaRutaOpcionApi } from './gobernanzaModuloApiTypes';

export function useGobernanzaModuloRutasOpciones(slug: string | null, enabled = true) {
  const [rutas, setRutas] = useState<GobernanzaRutaOpcionApi[]>([]);
  const [sugerida, setSugerida] = useState<GobernanzaRutaOpcionApi | null>(null);
  const [ayuda, setAyuda] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGobernanzaModuloRutasOpciones(slug ?? undefined);
      setRutas(data?.rutas ?? []);
      setSugerida(data?.sugerida ?? null);
      setAyuda(data?.meta?.ayuda ?? null);
    } catch (err: unknown) {
      setRutas([]);
      setSugerida(null);
      setAyuda(null);
      setError(err instanceof Error ? err.message : 'Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  }, [enabled, slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rutas, sugerida, ayuda, loading, error, refresh };
}
