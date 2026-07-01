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

export interface DianPingData {
    ok: boolean;
    latencyMs: number;
    ambiente?: string;
    respuestaDian?: Record<string, unknown>;
    error?: string;
}

export interface DianPingResponse {
    ok: boolean;
    data: DianPingData;
}

export const pingDianSoap = async (): Promise<DianPingResponse> => {
    return apiFetch('/api/health/dian-ping', { method: 'GET', useAuth: false, logoutOn401: false });
};
