import { useCallback, useEffect, useState } from 'react';
import { fetchGobernanzaModuloTiposSections } from './gobernanzaModuloService';
import { mergeSectionsOpciones } from './gobernanzaModuloTipoDefaults';

export function useGobernanzaModuloTiposSections(
  enabled = true,
  sugerida?: string | null
) {
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return [];
    setLoading(true);
    try {
      const rows = await fetchGobernanzaModuloTiposSections();
      const merged = mergeSectionsOpciones(rows, sugerida, []);
      setSections(merged);
      return merged;
    } catch {
      const merged = mergeSectionsOpciones([], sugerida, []);
      setSections(merged);
      return merged;
    } finally {
      setLoading(false);
    }
  }, [enabled, sugerida]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sections, loading, refresh };
}
