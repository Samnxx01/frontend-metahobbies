import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from '../../../app/providers/LoadingProvider';

export default function NavigationLoader() {
    const { showLoading, hideLoading } = useLoading();
    const location = useLocation();
    const timerRef = useRef(null);
    const isInitialMount = useRef(true);

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