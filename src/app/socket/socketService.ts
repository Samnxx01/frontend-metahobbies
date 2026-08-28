import { io, Socket } from "socket.io-client";
import { observarDatosRealtime } from "@/app/realtime/dataRealtime";

export const SOCKET_INSTANCE_CREATED_EVENT = "mabs:socket-instance-created";

// Global socket instance
let socket: Socket | null = null;


// Conectar socket
export const conectarSocket = (): Socket | null => {
    const token = localStorage.getItem("token");
    const API_URL = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_SOCKET_URL ?? '';

    if (!token) {
        return null;
    }

    const s: Socket = io(API_URL, {
        auth: { token },
        transports: ["websocket"],
    });

    observarDatosRealtime(s);

    socket = s;
    window.dispatchEvent(new CustomEvent<Socket>(SOCKET_INSTANCE_CREATED_EVENT, { detail: s }));

    return s;
};

// Desconectar
export const desconectadoUsu = (): void => {
    if (socket) {
        socket.disconnect();
    }
};

// Obtener socket
export const getSocket = (): Socket | null => socket;

export const reconectarSocket = (): Socket | null => {
    const currentSocket = socket ?? conectarSocket();
    if (currentSocket && !currentSocket.connected) currentSocket.connect();
    return currentSocket;
};

// Emitir evento
export const emitSocketEvent = (event: string, data?: any): void => {
    if (socket?.connected) {
        socket.emit(event, data);
    }
};

// Escuchar evento
export const onSocketEvent = (
    event: string,
    callback: (data: any) => void
): void => {
    if (!socket) {
        return;
    }

    socket.on(event, callback);
};

// Remover listeners
export const offSocketEvent = (
    event: string,
    callback?: (data: any) => void
): void => {
    if (!socket) return;

    callback ? socket.off(event, callback) : socket.off(event);
};
