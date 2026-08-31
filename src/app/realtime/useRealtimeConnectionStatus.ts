import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, reconectarSocket, SOCKET_INSTANCE_CREATED_EVENT } from '@/app/socket/socketService';

export const useRealtimeConnectionStatus = (): boolean => {
  const [connected, setConnected] = useState(() => Boolean(getSocket()?.connected));
  useEffect(() => {
    let observedSocket: Socket | null = null;
    const onConnect = (): void => setConnected(true);
    const onDisconnect = (): void => setConnected(false);
    const observe = (candidate: Socket | null): void => {
      if (observedSocket === candidate) return;
      observedSocket?.off('connect', onConnect);
      observedSocket?.off('disconnect', onDisconnect);
      observedSocket = candidate;
      setConnected(Boolean(candidate?.connected));
      candidate?.on('connect', onConnect);
      candidate?.on('disconnect', onDisconnect);
    };
    const onCreated = (event: Event): void => observe((event as CustomEvent<Socket>).detail);
    const ensureConnected = (): void => {
      if (!localStorage.getItem('token')) return;
      observe(reconectarSocket());
    };
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') ensureConnected();
    };

    ensureConnected();
    window.addEventListener(SOCKET_INSTANCE_CREATED_EVENT, onCreated);
    window.addEventListener('online', ensureConnected);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const watchdogId = window.setInterval(ensureConnected, 5_000);
    return () => {
      window.removeEventListener(SOCKET_INSTANCE_CREATED_EVENT, onCreated);
      window.removeEventListener('online', ensureConnected);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(watchdogId);
      observedSocket?.off('connect', onConnect);
      observedSocket?.off('disconnect', onDisconnect);
    };
  }, []);
  return connected;
};
