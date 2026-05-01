import { getGovernedLogoutPath } from '@/app/services/governedNavigation';

export type ResponseType = 'raw' | string;
export type ApiHeaders = Record<string, string>;

export type ApiOptions = Omit<RequestInit, 'body' | 'headers'> & {
    body?: unknown;
    headers?: ApiHeaders;
    responseType?: ResponseType;
    useAuth?: boolean;
    logoutOn401?: boolean;
};

const buildSafeHeaders = (
    headers: ApiHeaders | undefined,
    useAuth: boolean,
    token: string | null
): ApiHeaders => {
    const safeHeaders: ApiHeaders = {
        'Content-Type': 'application/json',
        ...(headers || {}),
    };

    if (useAuth && token) {
        safeHeaders['metasploit'] = token;
        safeHeaders['Authorization'] = `Bearer ${token}`;
    } else {
        delete safeHeaders['metasploit'];
        delete safeHeaders['Authorization'];
        delete safeHeaders['x-token'];
    }

    return safeHeaders;
};

export const apiFetch = async (
    endpoint: string,
    options: ApiOptions
): Promise<any | Response | null> => {
    const token: string | null = localStorage.getItem('token');
    const useAuth: boolean = options.useAuth ?? true;
    const logoutOn401: boolean = options.logoutOn401 ?? true;
    const requestOptions: ApiOptions = { ...options };

    requestOptions.headers = buildSafeHeaders(requestOptions.headers, useAuth, token);

    if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
        requestOptions.body = JSON.stringify(requestOptions.body);
    }

    if (requestOptions.body instanceof FormData) {
        delete (requestOptions.headers as ApiHeaders)['Content-Type'];
    }

    try {
        const response: Response = await fetch(endpoint, requestOptions as RequestInit);

        // Verificar si es 401 Unauthorized en endpoints autenticados
        if (response.status === 401 && useAuth && logoutOn401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            // Limpiar caches de sesión para que el próximo login no restaure rutas stale.
            // No importamos routeService (dep circular), borramos el key directamente.
            localStorage.removeItem('mabs_private_home_route');
            window.location.href = getGovernedLogoutPath();
            throw new Error('Sesion expirada. Por favor inicia sesion nuevamente.');
        }

        if (requestOptions.responseType === 'raw') {
            if (!response.ok) {
                throw new Error(response.statusText || 'Error de red en respuesta raw');
            }
            return response;
        }

        const contentType: string | null = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new Error(response.statusText || 'Error de red');
            }
            return null;
        }

        const data: any = await response.json();

        if (!response.ok) {
            const backendMsg =
                data?.msg ||
                data?.message ||
                data?.error ||
                data?.detalle ||
                (Array.isArray(data?.errors)
                    ? data.errors.map((e: any) => e?.msg || e?.message || String(e)).join(' | ')
                    : null) ||
                (typeof data === 'object' ? JSON.stringify(data) : String(data));
            throw new Error(`[${response.status}] ${backendMsg}`);
        }

        return data;
    } catch (error: any) {
        console.error(`Error en fetch a ${endpoint}:`, error.message);
        throw error;
    }
};

export const apiFetchPublic = async (
    endpoint: string,
    options: Omit<ApiOptions, 'useAuth' | 'logoutOn401'> = {}
): Promise<any | Response | null> => {
    return apiFetch(endpoint, {
        ...options,
        useAuth: false,
        logoutOn401: false,
    });
};
