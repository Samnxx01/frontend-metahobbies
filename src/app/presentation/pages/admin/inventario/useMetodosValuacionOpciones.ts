import { useEffect, useState } from 'react';
import inventarioService, {
  type MetodoValuacion,
  type MetodoValuacionOpcion,
} from '@/app/services/inventarioService';

export function useMetodosValuacionOpciones(metodoDesdeConfig?: MetodoValuacion | null) {
  const [opciones, setOpciones] = useState<MetodoValuacionOpcion[]>([]);
  const [metodoActivo, setMetodoActivo] = useState<MetodoValuacion>('PROMEDIO');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await inventarioService.obtenerMetodosValuacionOpciones();
        if (cancelled) return;
        setOpciones(data.opciones);
        setMetodoActivo(data.metodoActivo);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los metodos de valuacion.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (metodoDesdeConfig) setMetodoActivo(metodoDesdeConfig);
  }, [metodoDesdeConfig]);

  return { opciones, metodoActivo, setMetodoActivo, loading, error };
}
