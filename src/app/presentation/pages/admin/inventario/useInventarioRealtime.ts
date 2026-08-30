import { useEffect, useRef } from 'react';
import { INVENTARIO_BROWSER_EVENT } from '@/app/realtime/dataRealtime';
import type { InventarioInvalidadoEvent } from '@/app/realtime/realtimeEventTypes';

export const useInventarioRealtime = (onInvalidado: (evento: InventarioInvalidadoEvent) => void | Promise<void>): void => {
  const handlerRef = useRef(onInvalidado);
  handlerRef.current = onInvalidado;
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let pending: InventarioInvalidadoEvent | null = null;
    const listener = (event: Event): void => {
      const incoming = (event as CustomEvent<InventarioInvalidadoEvent>).detail;
      pending = pending ? { ...incoming, scopes: [...new Set([...pending.scopes, ...incoming.scopes])] } : incoming;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const eventToHandle = pending;
        pending = null;
        if (eventToHandle) void Promise.resolve(handlerRef.current(eventToHandle)).catch(() => undefined);
      }, 250);
    };
    window.addEventListener(INVENTARIO_BROWSER_EVENT, listener);
    return () => {
      window.removeEventListener(INVENTARIO_BROWSER_EVENT, listener);
      clearTimeout(timeoutId);
    };
  }, []);
};
