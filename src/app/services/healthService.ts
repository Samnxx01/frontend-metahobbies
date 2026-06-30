import { apiFetch } from './api';

export interface HealthStatusItem {
    status: 'ok' | 'error';
}

export interface HealthResponse {
    ok: boolean;
    status: 'ok' | 'degraded';
    timestamp: string;
    base_de_datos: {
        mongodb: HealthStatusItem;
    };
    servicios_externos: {
        wompi: HealthStatusItem;
        dian: HealthStatusItem;
    };
}

export const getHealthStatus = async (): Promise<HealthResponse> => {
    return apiFetch('/api/health', { method: 'GET', useAuth: false, logoutOn401: false });
};
