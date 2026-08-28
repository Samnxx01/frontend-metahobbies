import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, SOCKET_INSTANCE_CREATED_EVENT } from '@/app/socket/socketService';

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
    observe(getSocket());
    window.addEventListener(SOCKET_INSTANCE_CREATED_EVENT, onCreated);
    return () => {
      window.removeEventListener(SOCKET_INSTANCE_CREATED_EVENT, onCreated);
      observedSocket?.off('connect', onConnect);
      observedSocket?.off('disconnect', onDisconnect);
    };
  }, []);
  return connected;
};
