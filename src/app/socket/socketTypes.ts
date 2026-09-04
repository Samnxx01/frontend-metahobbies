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

export interface ColoresPaletaSocket {
    COLOR_PRIMARY?: string;
    COLOR_ACCENT?: string;
    COLOR_LIGHT?: string;
    COLOR_BG?: string;
    COLOR_CHAMPAGNE?: string;
    COLOR_SUNSET?: string;
    COLOR_TEXT?: string;
    FONT_FAMILY?: string;
}

// Socket events interface - Define all possible socket events
export interface SocketEvents {
    'ping-usuario': void;
    'user-connected': { userId: string; timestamp: string };
    'user-disconnected': { userId: string; timestamp: string };
    'membership-updated': { userId: string; membershipData: any };
    'payment-processed': { userId: string; paymentId: string; status: string };
    'notification': { userId: string; message: string; type: 'info' | 'warning' | 'error' | 'success' };
    'paleta-colores-actualizada': { colores: ColoresPaletaSocket };
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
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: SocketEventCallback) => void;
    off: (event: string, callback?: SocketEventCallback) => void;
}

import type { Socket } from 'socket.io-client';
