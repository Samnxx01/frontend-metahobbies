import { useCallback, useEffect, useState } from 'react';
import reglasContablesService, { type TipoReglaContableCatalogo } from '@/app/services/reglasContablesService';

export function useTiposReglaContable({
  admin = false,
  refreshKey = 0,
  enabled = true,
}: { admin?: boolean; refreshKey?: number; enabled?: boolean } = {}) {
  const [tipos, setTipos] = useState<TipoReglaContableCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!enabled) return [];
    setLoading(true);
    setError(null);
    try {
      const data = admin
        ? await reglasContablesService.listarTiposAdmin()
        : await reglasContablesService.listarTiposActivos();
      setTipos(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^\[\d+\]\s*/, '') : 'Error cargando tipos';
      setError(msg);
      setTipos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [admin, enabled]);

  useEffect(() => {
    void recargar();
  }, [recargar, refreshKey]);

  const labelPorCodigo = useCallback(
    (codigo: string) => tipos.find((t) => t.codigo === codigo)?.nombre ?? codigo,
    [tipos]
  );

  return { tipos, loading, error, recargar, labelPorCodigo };
}
