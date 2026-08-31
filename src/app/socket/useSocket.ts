import { useState, useEffect, useCallback } from 'react';
import { conectarSocket, getSocket } from './socketService';
import { socketEmitters, socketListeners, socketCleanup } from './socketEvents';
import type { SocketStatus } from './socketTypes';
import type { Socket } from 'socket.io-client';

// Hook return interface
interface UseSocketReturn {
    socket: Socket | null;
    status: SocketStatus;
    isConnected: boolean;
    connect: () => Socket | null;
    emit: typeof socketEmitters;
    on: typeof socketListeners;
    off: typeof socketCleanup;
}

// Custom hook for socket functionality
export const useSocket = (): UseSocketReturn => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<SocketStatus>('disconnected');

    const connect = useCallback((): Socket | null => {
        if (socket?.connected) {
            console.log('Socket already connected');
            return socket;
        }

        setStatus('connecting');
        
        try {
            const newSocket = conectarSocket();
            
            if (newSocket) {
                setSocket(newSocket);
                
                newSocket.on('connect', () => {
                    setStatus('connected');
                    console.log('Socket connected via hook');
                });
                
                newSocket.on('disconnect', () => {
                    setStatus('disconnected');
                    console.log('Socket disconnected via hook');
                });
                
                newSocket.on('connect_error', () => {
                    setStatus('error');
                    console.error('Socket connection error');
                });
                
                return newSocket;
            } else {
                setStatus('error');
                return null;
            }
        } catch (error) {
            console.error('Error connecting socket:', error);
            setStatus('error');
            return null;
        }
    }, [socket]);

    // Initialize socket on mount
    useEffect(() => {
        const currentSocket = getSocket();
        if (currentSocket) {
            setSocket(currentSocket);
            setStatus(currentSocket.connected ? 'connected' : 'disconnected');
        }
    }, []);

    return {
        socket,
        status,
        isConnected: status === 'connected',
        connect,
        emit: socketEmitters,
        on: socketListeners,
        off: socketCleanup,
    };
};
