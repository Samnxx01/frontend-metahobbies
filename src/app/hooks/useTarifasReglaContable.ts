import { useCallback, useEffect, useState } from 'react';
import reglasContablesService, { type TarifaReglaContable } from '@/app/services/reglasContablesService';

export function useTarifasReglaContable({
  admin = false,
  tipoReglaCodigo,
  refreshKey = 0,
  enabled = true,
}: {
  admin?: boolean;
  tipoReglaCodigo?: string;
  refreshKey?: number;
  enabled?: boolean;
} = {}) {
  const [tarifas, setTarifas] = useState<TarifaReglaContable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!enabled) return [];
    setLoading(true);
    setError(null);
    try {
      const data = admin
        ? await reglasContablesService.listarTarifasAdmin()
        : await reglasContablesService.listarTarifasActivas(tipoReglaCodigo);
      setTarifas(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^\[\d+\]\s*/, '') : 'Error cargando tarifas';
      setError(msg);
      setTarifas([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [admin, tipoReglaCodigo, enabled]);

  useEffect(() => {
    void recargar();
  }, [recargar, refreshKey]);

  return { tarifas, loading, error, recargar };
}
