import { useCallback, useEffect, useState } from 'react';
import reglasContablesService, {
  type AplicaEnRegla,
  type ReglaContable,
  type TipoReglaContable,
} from '@/app/services/reglasContablesService';

export type UseReglasContablesOptions = {
  /** Solo reglas activas vía GET /api/inventario/config/reglas-contables */
  activas?: boolean;
  tipo?: TipoReglaContable | TipoReglaContable[];
  aplicaEn?: AplicaEnRegla;
  refreshKey?: number;
  enabled?: boolean;
};

const filtrarReglas = (
  reglas: ReglaContable[],
  tipo?: TipoReglaContable | TipoReglaContable[],
  aplicaEn?: AplicaEnRegla
): ReglaContable[] => {
  let out = reglas;
  if (tipo) {
    const tipos = Array.isArray(tipo) ? tipo : [tipo];
    out = out.filter((r) => tipos.includes(r.tipo));
  }
  if (aplicaEn) {
    out = out.filter((r) => r.aplicaEn === aplicaEn || r.aplicaEn === 'AMBOS');
  }
  return out.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
};

/**
 * Hook de solo lectura sobre el endpoint de reglas contables activas.
 */
export function useReglasContables({
  activas = true,
  tipo,
  aplicaEn,
  refreshKey = 0,
  enabled = true,
}: UseReglasContablesOptions = {}) {
  const [reglas, setReglas] = useState<ReglaContable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async (): Promise<ReglaContable[]> => {
    if (!enabled) return [];
    setLoading(true);
    setError(null);
    try {
      const data = activas
        ? await reglasContablesService.listarActivas()
        : await reglasContablesService.listarAdmin();
      const filtradas = filtrarReglas(data, tipo, aplicaEn);
      setReglas(filtradas);
      return filtradas;
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^\[\d+\]\s*/, '') : 'Error cargando reglas';
      setError(msg);
      setReglas([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [activas, tipo, aplicaEn, enabled]);

  useEffect(() => {
    void recargar();
  }, [recargar, refreshKey]);

  const resolverPorCodigo = useCallback(
    (codigo: string) => reglas.find((r) => r.codigo === codigo),
    [reglas]
  );

  return { reglas, loading, error, recargar, resolverPorCodigo };
}
