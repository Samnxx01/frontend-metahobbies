import { createContext, useContext, useState, useCallback } from 'react';
import LoadingScreen from '@/app/presentation/components/common/LoadingScreen';

const LoadingContext = createContext(null);

export function useLoading() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within LoadingProvider');
    }
    return context;
}

export default function LoadingProvider({ children }) {
    const [loading, setLoading] = useState(false);

    const showLoading = useCallback(() => setLoading(true), []);
    const hideLoading = useCallback(() => setLoading(false), []);

    return (
        <LoadingContext.Provider value={{ showLoading, hideLoading }}>
            {loading && <LoadingScreen />}
            {children}
        </LoadingContext.Provider>
    );
}