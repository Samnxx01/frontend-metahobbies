import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from '../../../providers/LoadingProvider';

export default function NavigationLoader(): null {
    const { showLoading, hideLoading } = useLoading();
    const location = useLocation();
    const timerRef = useRef<number | null>(null);
    const isInitialMount = useRef<boolean>(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        showLoading();

        timerRef.current = setTimeout(() => {
            hideLoading();
        }, 500);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [location.pathname, showLoading, hideLoading]);

    return null;
}