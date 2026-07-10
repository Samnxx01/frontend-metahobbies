import { useCallback, useEffect, useRef } from 'react';

const SCAN_INTERVAL_MS = 50;
const MIN_CHARS = 4;
const RESET_MS = 300;

/**
 * Detecta la entrada de una pistola láser de código de barras (HID keyboard emulator).
 * La pistola envía todos los caracteres muy rápido (< 50ms entre cada uno) y termina con Enter.
 * Los campos de texto (input/textarea/select) manejan su propio tecleo y se ignoran aquí.
 *
 * Para cualquier otro elemento (botones, enlaces, body, etc.) SÍ se sigue el ritmo de las
 * teclas: si al llegar el Enter el patrón coincide con una lectura de pistola (>= MIN_CHARS
 * caracteres, todos con < SCAN_INTERVAL_MS de separación), se bloquea el comportamiento nativo
 * del navegador (preventDefault/stopPropagation) para que ese Enter NO active el botón/enlace
 * que tenga el foco (p. ej. "Exportar" descargando un archivo) y en su lugar se dispara onScan.
 * Si el Enter no coincide con ese patrón (un humano navegando con Tab+Enter), se deja pasar
 * normal para no romper la accesibilidad por teclado.
 *
 * Se escucha en fase de captura para adelantarse a cualquier handler nativo o de React.
 *
 * Uso: pasar activo=false cuando ya hay un input con foco que captura el scanner directamente.
 */
export function useBarcodeScanner(
  onScan: (codigo: string) => void,
  activo = true,
): void {
  const bufferRef = useRef('');
  const tiemposRef = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    tiemposRef.current = [];
  }, []);

  useEffect(() => {
    if (!activo) return;

    const onKeyDown = (e: KeyboardEvent): void => {
      const tag = ((e.target as HTMLElement)?.tagName ?? '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const now = Date.now();

      if (e.key === 'Enter') {
        const codigo = bufferRef.current.trim();
        const times = tiemposRef.current;
        const esEscaneo =
          codigo.length >= MIN_CHARS
          && times.length >= 2
          && (times[times.length - 1] - times[0]) / times.length < SCAN_INTERVAL_MS;
        if (esEscaneo) {
          // Evita que el Enter de la pistola active el botón/enlace enfocado
          // (ej. "Exportar"), que de otro modo dispararía su acción nativa (descarga).
          e.preventDefault();
          e.stopPropagation();
          onScan(codigo);
        }
        resetBuffer();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      if (e.key.length === 1) {
        tiemposRef.current.push(now);
        bufferRef.current += e.key;
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(resetBuffer, RESET_MS);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activo, onScan, resetBuffer]);
}
