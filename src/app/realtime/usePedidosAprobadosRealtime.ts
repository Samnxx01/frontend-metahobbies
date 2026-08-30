import { useEffect, useRef } from 'react';
import { PEDIDOS_APROBADOS_BROWSER_EVENT } from './dataRealtime';
import type { PedidosAprobadosInvalidadoEvent } from './realtimeEventTypes';

export function usePedidosAprobadosRealtime(
  onInvalidado: (evento: PedidosAprobadosInvalidadoEvent) => void | Promise<void>,
): void {
  const handlerRef = useRef(onInvalidado);
  handlerRef.current = onInvalidado;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let pending: PedidosAprobadosInvalidadoEvent | null = null;
    const listener = (event: Event): void => {
      const incoming = (event as CustomEvent<PedidosAprobadosInvalidadoEvent>).detail;
      pending = pending
        ? { ...incoming, scopes: [...new Set([...pending.scopes, ...incoming.scopes])] }
        : incoming;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const next = pending;
        pending = null;
        if (next) void Promise.resolve(handlerRef.current(next)).catch(() => undefined);
      }, 300);
    };

    window.addEventListener(PEDIDOS_APROBADOS_BROWSER_EVENT, listener);
    return () => {
      window.removeEventListener(PEDIDOS_APROBADOS_BROWSER_EVENT, listener);
      clearTimeout(timeoutId);
    };
  }, []);
}
