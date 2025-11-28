// Socket authentication interface
export interface SocketAuth {
    token: string;
}

// Socket connection options interface
export interface SocketOptions {
    auth: SocketAuth;
    transports: string[];
    reconnection: boolean;
}

// Socket events interface - Define all possible socket events
export interface SocketEvents {
    'ping-usuario': void;
    'user-connected': { userId: string; timestamp: string };
    'user-disconnected': { userId: string; timestamp: string };
    'membership-updated': { userId: string; membershipData: any };
    'payment-processed': { userId: string; paymentId: string; status: string };
    'notification': { userId: string; message: string; type: 'info' | 'warning' | 'error' | 'success' };
    // Add more events as needed
}

// Socket connection status
export type SocketStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Socket event callback type
export type SocketEventCallback<T = any> = (data: T) => void;

// Socket context interface for React context
export interface SocketContextType {
    socket: Socket | null;
    status: SocketStatus;
    connect: () => Socket | null;
    disconnect: () => void;
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: SocketEventCallback) => void;
    off: (event: string, callback?: SocketEventCallback) => void;
}

import type { Socket } from 'socket.io-client';