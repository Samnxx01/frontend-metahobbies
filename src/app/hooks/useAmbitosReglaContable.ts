import { useCallback, useEffect, useState } from 'react';
import reglasContablesService, { type AmbitoReglaContable } from '@/app/services/reglasContablesService';

export type UseAmbitosReglaContableOptions = {
  admin?: boolean;
  refreshKey?: number;
  enabled?: boolean;
};

export function useAmbitosReglaContable({
  admin = false,
  refreshKey = 0,
  enabled = true,
}: UseAmbitosReglaContableOptions = {}) {
  const [ambitos, setAmbitos] = useState<AmbitoReglaContable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async (): Promise<AmbitoReglaContable[]> => {
    if (!enabled) return [];
    setLoading(true);
    setError(null);
    try {
      const data = admin
        ? await reglasContablesService.listarAmbitosAdmin()
        : await reglasContablesService.listarAmbitosActivos();
      setAmbitos(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^\[\d+\]\s*/, '') : 'Error cargando ámbitos';
      setError(msg);
      setAmbitos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [admin, enabled]);

  useEffect(() => {
    void recargar();
  }, [recargar, refreshKey]);

  const labelPorCodigo = useCallback(
    (codigo: string) => ambitos.find((a) => a.codigo === codigo)?.nombre ?? codigo,
    [ambitos]
  );

  const resolverPorCodigo = useCallback(
    (codigo: string) => ambitos.find((a) => a.codigo === codigo),
    [ambitos]
  );

  return { ambitos, loading, error, recargar, labelPorCodigo, resolverPorCodigo };
}
