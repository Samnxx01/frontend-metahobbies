import type { Socket } from 'socket.io-client';
import type { InventarioInvalidadoEvent } from './realtimeEventTypes';

export const INVENTARIO_SOCKET_EVENT = 'inventario:invalidado';
export const INVENTARIO_BROWSER_EVENT = 'mabs:inventario-invalidado';

export const observarDatosRealtime = (socket: Socket): void => {
  let conectadoUnaVez = false;
  socket.on('connect', () => {
    if (conectadoUnaVez) {
      window.dispatchEvent(new CustomEvent<InventarioInvalidadoEvent>(INVENTARIO_BROWSER_EVENT, {
        detail: { eventId: `reconnect-${Date.now()}`, occurredAt: new Date().toISOString(), scopes: ['configuracion'], method: 'RECONNECT', resource: 'socket', changedBy: null },
      }));
    }
    conectadoUnaVez = true;
  });
  socket.on(INVENTARIO_SOCKET_EVENT, (evento: InventarioInvalidadoEvent) => {
    window.dispatchEvent(new CustomEvent<InventarioInvalidadoEvent>(INVENTARIO_BROWSER_EVENT, { detail: evento }));
  });
};
