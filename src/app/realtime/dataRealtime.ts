import type { Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import type { InventarioInvalidadoEvent } from './realtimeEventTypes';

export const INVENTARIO_SOCKET_EVENT = 'inventario:invalidado';
export const INVENTARIO_BROWSER_EVENT = 'mabs:inventario-invalidado';
const DEPLOYMENT_SOCKET_EVENT = 'deployment-version';
const DEPLOYMENT_STORAGE_KEY = 'mabs:deployment-version';
const DEPLOYMENT_TOAST_ID = 'mabs:nuevo-despliegue';

interface DeploymentVersionEvent {
  version: string;
  versionCorta?: string;
  servicio?: string;
  iniciadoEn?: string;
}

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
  socket.on(DEPLOYMENT_SOCKET_EVENT, (despliegue: DeploymentVersionEvent) => {
    const incomingVersion = String(despliegue?.version || '').trim();
    if (!incomingVersion) return;

    const previousVersion = localStorage.getItem(DEPLOYMENT_STORAGE_KEY);
    localStorage.setItem(DEPLOYMENT_STORAGE_KEY, incomingVersion);
    if (!previousVersion || previousVersion === incomingVersion) return;

    toast.warn('Hay una nueva versión disponible. Haz clic aquí para actualizar la aplicación.', {
      toastId: DEPLOYMENT_TOAST_ID,
      autoClose: false,
      closeOnClick: true,
      onClick: () => window.location.reload(),
    });
  });
};
