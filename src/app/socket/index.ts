// Main socket service exports
export * from './socketService';

// Socket types exports
export * from './socketTypes';

// Socket events exports
export * from './socketEvents';

// Socket hook exports
export * from './useSocket';

// Re-export commonly used functions for backward compatibility
export { 
    conectarSocket as connectSocket,
    desconectadoUsu as disconnectUser 
} from './socketService';