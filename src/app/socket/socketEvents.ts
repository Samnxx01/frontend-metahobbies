import { getSocket, emitSocketEvent, onSocketEvent, offSocketEvent } from './socketService';
import type { SocketEvents, SocketEventCallback } from './socketTypes';

// Typed event emitters
export const socketEmitters = {
    // Ping the server to keep connection alive
    pingUser: (): void => {
        emitSocketEvent('ping-usuario');
    },

    // Notify server of user connection
    notifyUserConnected: (userId: string): void => {
        emitSocketEvent('user-connected', { 
            userId, 
            timestamp: new Date().toISOString() 
        });
    },

    // Notify server of user disconnection
    notifyUserDisconnected: (userId: string): void => {
        emitSocketEvent('user-disconnected', { 
            userId, 
            timestamp: new Date().toISOString() 
        });
    },

    // Send custom event with data
    sendCustomEvent: (event: keyof SocketEvents, data?: any): void => {
        emitSocketEvent(event, data);
    },
};

// Typed event listeners
export const socketListeners = {
    // Listen for user connection events
    onUserConnected: (callback: SocketEventCallback<SocketEvents['user-connected']>): void => {
        onSocketEvent('user-connected', callback);
    },

    // Listen for user disconnection events
    onUserDisconnected: (callback: SocketEventCallback<SocketEvents['user-disconnected']>): void => {
        onSocketEvent('user-disconnected', callback);
    },

    // Listen for membership updates
    onMembershipUpdated: (callback: SocketEventCallback<SocketEvents['membership-updated']>): void => {
        onSocketEvent('membership-updated', callback);
    },

    // Listen for payment processed events
    onPaymentProcessed: (callback: SocketEventCallback<SocketEvents['payment-processed']>): void => {
        onSocketEvent('payment-processed', callback);
    },

    // Listen for notifications
    onNotification: (callback: SocketEventCallback<SocketEvents['notification']>): void => {
        onSocketEvent('notification', callback);
    },

    // Generic listener for any event
    onCustomEvent: (event: keyof SocketEvents, callback: SocketEventCallback): void => {
        onSocketEvent(event, callback);
    },

    onPaletaColoresActualizada: (callback: SocketEventCallback<SocketEvents['paleta-colores-actualizada']>): void => {
        onSocketEvent('paleta-colores-actualizada', callback);
    },
};

// Event listener cleanup functions
export const socketCleanup = {
    // Remove user connection listener
    offUserConnected: (callback?: SocketEventCallback): void => {
        offSocketEvent('user-connected', callback);
    },

    // Remove user disconnection listener
    offUserDisconnected: (callback?: SocketEventCallback): void => {
        offSocketEvent('user-disconnected', callback);
    },

    // Remove membership update listener
    offMembershipUpdated: (callback?: SocketEventCallback): void => {
        offSocketEvent('membership-updated', callback);
    },

    // Remove payment processed listener
    offPaymentProcessed: (callback?: SocketEventCallback): void => {
        offSocketEvent('payment-processed', callback);
    },

    // Remove notification listener
    offNotification: (callback?: SocketEventCallback): void => {
        offSocketEvent('notification', callback);
    },

    // Remove custom event listener
    offCustomEvent: (event: keyof SocketEvents, callback?: SocketEventCallback): void => {
        offSocketEvent(event, callback);
    },

    offPaletaColoresActualizada: (callback?: SocketEventCallback<SocketEvents['paleta-colores-actualizada']>): void => {
        offSocketEvent('paleta-colores-actualizada', callback);
    },

    // Remove all listeners
    removeAllListeners: (): void => {
        const socket = getSocket();
        if (socket) {
            socket.removeAllListeners();
        }
    },
};