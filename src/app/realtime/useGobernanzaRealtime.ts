import { useEffect, useRef } from 'react';
import { GOBERNANZA_BROWSER_EVENT } from './dataRealtime';
import type { GobernanzaInvalidadaEvent } from './realtimeEventTypes';

export function useGobernanzaRealtime(
  onInvalidado: (evento: GobernanzaInvalidadaEvent) => void | Promise<void>,
): void {
  const handlerRef = useRef(onInvalidado);
  handlerRef.current = onInvalidado;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let pending: GobernanzaInvalidadaEvent | null = null;

    const listener = (event: Event): void => {
      const incoming = (event as CustomEvent<GobernanzaInvalidadaEvent>).detail;
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

    window.addEventListener(GOBERNANZA_BROWSER_EVENT, listener);
    return () => {
      window.removeEventListener(GOBERNANZA_BROWSER_EVENT, listener);
      clearTimeout(timeoutId);
    };
  }, []);
}
