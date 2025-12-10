import { io, Socket } from "socket.io-client";

// Global socket instance
let socket: Socket | null = null;


// Conectar socket
export const conectarSocket = (): Socket | null => {
    const token = localStorage.getItem("token");
    const API_URL = import.meta.env.PUBLIC_BASE_URL;

    if (!token) {
        console.warn("⚠ No token → No socket");
        return null;
    }

    const s: Socket = io(API_URL, {
        auth: { token },
        transports: ["websocket"],
    });

    socket = s;

    s.on("connect", () => console.log("⚡ Socket conectado:", s.id));
    s.on("disconnect", () => console.log("🔴 Socket desconectado"));

    return s;
};

// Desconectar
export const desconectadoUsu = (): void => {
    if (socket) {
        socket.disconnect();
        console.log("🔌 Socket desconectado manualmente");
    }
};

// Obtener socket
export const getSocket = (): Socket | null => socket;

// Emitir evento
export const emitSocketEvent = (event: string, data?: any): void => {
    if (socket?.connected) {
        socket.emit(event, data);
    } else {
        console.warn("⚠ No se puede emitir, socket desconectado:", event);
    }
};

// Escuchar evento
export const onSocketEvent = (
    event: string,
    callback: (data: any) => void
): void => {
    if (!socket) {
        console.warn("⚠ Socket no inicializado:", event);
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