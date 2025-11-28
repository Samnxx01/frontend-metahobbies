import { io, Socket } from "socket.io-client";
import type { SocketOptions } from './socketTypes';

// Global socket instance
let socket: Socket | null = null;

// Function to connect to socket with authentication
export const conectarSocket = (): Socket | null => {
    const token = localStorage.getItem("token");

    if (!token) {
        console.warn("⚠️ No token → No me conecto al socket");
        return null;
    }

    const socketOptions: SocketOptions = {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
    };

    const newSocket = io("/api/", socketOptions);

    setSocket(newSocket);
    
    newSocket.on("connect", () => {
        console.log("⚡ Socket conectado:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
        console.log("🔴 Socket desconectado");
    });

    // Ping every second to keep connection alive
    const pingInterval = setInterval(() => {
        if (newSocket.connected) {
            newSocket.emit("ping-usuario");
        }
    }, 1000);

    // Clean up interval on disconnect
    newSocket.on("disconnect", () => {
        clearInterval(pingInterval);
    });

    return newSocket;
};

// Function to disconnect socket
export const desconectadoUsu = (): void => {
    if (socket && socket.connected) {
        socket.disconnect();
        console.log("🔌 Socket desconectado");
    }
};

// Function to set socket instance
export const setSocket = (instance: Socket | null): void => {
    socket = instance;
};

// Function to get current socket instance
export const getSocket = (): Socket | null => {
    return socket;
};

// Function to emit event to socket
export const emitSocketEvent = (event: string, data?: any): void => {
    if (socket && socket.connected) {
        socket.emit(event, data);
    } else {
        console.warn("⚠️ Socket no conectado, no se puede emitir evento:", event);
    }
};

// Function to listen for socket events
export const onSocketEvent = (event: string, callback: (data: any) => void): void => {
    if (socket) {
        socket.on(event, callback);
    } else {
        console.warn("⚠️ Socket no disponible para escuchar evento:", event);
    }
};

// Function to remove socket event listener
export const offSocketEvent = (event: string, callback?: (data: any) => void): void => {
    if (socket) {
        if (callback) {
            socket.off(event, callback);
        } else {
            socket.off(event);
        }
    }
};