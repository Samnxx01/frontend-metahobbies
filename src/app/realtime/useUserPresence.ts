import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, SOCKET_INSTANCE_CREATED_EVENT } from '@/app/socket/socketService';

const PRESENCE_EVENT = 'usuarios:presencia:estado';
const PRESENCE_REQUEST_EVENT = 'usuarios:presencia:solicitar';

interface PresencePayload {
  onlineUserIds?: string[];
}

export const useUserPresence = (enabled: boolean): ReadonlySet<string> => {
  const [onlineUserIds, setOnlineUserIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!enabled) {
      setOnlineUserIds(new Set());
      return;
    }

    let observedSocket: Socket | null = null;
    const onPresence = (payload: PresencePayload): void => {
      setOnlineUserIds(new Set((payload.onlineUserIds || []).map((id) => String(id).trim().toLowerCase()).filter(Boolean)));
    };
    const requestPresence = (): void => observedSocket?.emit(PRESENCE_REQUEST_EVENT);
    const observe = (candidate: Socket | null): void => {
      if (observedSocket === candidate) return;
      observedSocket?.off(PRESENCE_EVENT, onPresence);
      observedSocket?.off('connect', requestPresence);
      observedSocket = candidate;
      candidate?.on(PRESENCE_EVENT, onPresence);
      candidate?.on('connect', requestPresence);
      if (candidate?.connected) requestPresence();
    };
    const onSocketCreated = (event: Event): void => observe((event as CustomEvent<Socket>).detail);

    observe(getSocket());
    window.addEventListener(SOCKET_INSTANCE_CREATED_EVENT, onSocketCreated);
    return () => {
      window.removeEventListener(SOCKET_INSTANCE_CREATED_EVENT, onSocketCreated);
      observedSocket?.off(PRESENCE_EVENT, onPresence);
      observedSocket?.off('connect', requestPresence);
    };
  }, [enabled]);

  return onlineUserIds;
};
