import { useCallback, useEffect, useState } from 'react';
import reglasVentasService, { type TipoReglaVentaCatalogo } from '@/app/services/reglasVentasService';

export function useTiposReglaVenta({
  admin = false,
  refreshKey = 0,
  enabled = true,
}: { admin?: boolean; refreshKey?: number; enabled?: boolean } = {}) {
  const [tipos, setTipos] = useState<TipoReglaVentaCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!enabled) return [];
    setLoading(true);
    setError(null);
    try {
      const data = admin
        ? await reglasVentasService.listarTiposAdmin()
        : await reglasVentasService.listarTiposActivos();
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
    [tipos],
  );

  const comportamientoPorCodigo = useCallback(
    (codigo: string) => tipos.find((t) => t.codigo === codigo)?.comportamiento ?? null,
    [tipos],
  );

  return { tipos, loading, error, recargar, labelPorCodigo, comportamientoPorCodigo };
}
