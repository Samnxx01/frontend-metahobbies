import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import LoadingScreen from '@/app/presentation/components/common/LoadingScreen';

// Interfaces para el Loading Provider
interface LoadingContextType {
    showLoading: () => void;
    hideLoading: () => void;
}

interface LoadingProviderProps {
    children: ReactNode;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function useLoading(): LoadingContextType {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within LoadingProvider');
    }
    return context;
}

export default function LoadingProvider({ children }: LoadingProviderProps) {
    const [loading, setLoading] = useState<boolean>(false);

    const showLoading = useCallback((): void => setLoading(true), []);
    const hideLoading = useCallback((): void => setLoading(false), []);

    const value: LoadingContextType = {
        showLoading,
        hideLoading
    };

    return (
        <LoadingContext.Provider value={value}>
            {loading && <LoadingScreen />}
            {children}
        </LoadingContext.Provider>
    );
}