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

/** Catálogos públicos: no requieren contexto de pantalla SPA. */
const PUBLIC_SECURITY_ROUTE_ENDPOINTS = [
    '/seguridad/rutas/listarRutas/public',
];

const isPublicSecurityRouteEndpoint = (endpoint: string): boolean => {
    const path = String(endpoint || '').split('?')[0];
    return PUBLIC_SECURITY_ROUTE_ENDPOINTS.some((fragment) => path.includes(fragment));
};

export const HYBRID_SPA_PATH_STORAGE_KEY = 'mabs_hybrid_spa_path';

const HYBRID_SPA_PATH_BLOCKLIST = [
    /^\/public\/render\/login/i,
    /^\/login\/?$/i,
    /^\/public\/render\/registro/i,
    /^\/registro\/?$/i,
];

/** Pantallas admin/HYBRID donde el backend resuelve el formulario por path SPA. */
export const isHybridSpaFrontendPath = (pathname: string): boolean => {
    const path = String(pathname || '').trim();
    if (!path) return false;
    const lower = path.toLowerCase();
    if (HYBRID_SPA_PATH_BLOCKLIST.some((re) => re.test(lower))) return false;
    return (
        /^\/admin(\/|$)/i.test(path)
        || /\/dinamic\//i.test(lower)
        || /\/rutas\//i.test(lower)
        || /^\/public\/render\/admin/i.test(lower)
    );
};

export const persistHybridSpaPath = (pathname?: string): void => {
    if (typeof window === 'undefined') return;
    const path = String(pathname || window.location?.pathname || '').trim();
    if (path && isHybridSpaFrontendPath(path)) {
        sessionStorage.setItem(HYBRID_SPA_PATH_STORAGE_KEY, path);
    }
};

export const clearHybridSpaPath = (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(HYBRID_SPA_PATH_STORAGE_KEY);
};

const isBlockedHybridSpaPath = (pathname: string): boolean => {
    const lower = String(pathname || '').trim().toLowerCase();
    return Boolean(lower && HYBRID_SPA_PATH_BLOCKLIST.some((re) => re.test(lower)));
};

export const getHybridSpaFrontendPath = (): string => {
    if (typeof window === 'undefined') return '';
    const current = String(window.location?.pathname || '').trim();
    // En login/registro no reutilizar ruta admin guardada (evita listarRutas/admin sin JWT).
    if (isBlockedHybridSpaPath(current)) return '';
    if (current && isHybridSpaFrontendPath(current)) return current;
    const stored = String(sessionStorage.getItem(HYBRID_SPA_PATH_STORAGE_KEY) || '').trim();
    if (stored && !isBlockedHybridSpaPath(stored)) return stored;
    return '';
};

/** Sin JWT en pantalla HYBRID: no enviar token ni forzar logout en 401. */
export const resolveSeguridadRutasFetchOptions = (): Pick<ApiOptions, 'useAuth' | 'logoutOn401'> => {
    const hasToken = Boolean(localStorage.getItem('token'));
    return {
        useAuth: hasToken,
        logoutOn401: hasToken,
    };
};

const resolveSpaContext = (endpoint: string): string => {
    if (typeof window === 'undefined') return '';
    if (!endpoint.includes('/seguridad/rutas/')) return '';
    if (isPublicSecurityRouteEndpoint(endpoint)) return '';
    const resolved = getHybridSpaFrontendPath();
    if (resolved) return resolved;
    return String(sessionStorage.getItem(HYBRID_SPA_PATH_STORAGE_KEY) || '').trim();
};

const buildSafeHeaders = (
    headers: ApiHeaders | undefined,
    useAuth: boolean,
    token: string | null,
    spaFrontendPath = ''
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

    if (spaFrontendPath) {
        safeHeaders['x-mabs-frontend-path'] = spaFrontendPath;
    } else {
        delete safeHeaders['x-mabs-frontend-path'];
    }

    return safeHeaders;
};

const appendSpaContextQuery = (endpoint: string, spaFrontendPath = ''): string => {
    if (!spaFrontendPath) return endpoint;

    const join = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${join}_mabsPath=${encodeURIComponent(spaFrontendPath)}`;
};

export const apiFetch = async (
    endpoint: string,
    options: ApiOptions
): Promise<any | Response | null> => {
    const token: string | null = localStorage.getItem('token');
    const useAuth: boolean = options.useAuth ?? true;
    const logoutOn401: boolean = options.logoutOn401 ?? Boolean(token);
    const requestOptions: ApiOptions = { ...options };
    const spaFrontendPath = resolveSpaContext(endpoint);
    const resolvedEndpoint = appendSpaContextQuery(endpoint, spaFrontendPath);

    requestOptions.headers = buildSafeHeaders(requestOptions.headers, useAuth, token, spaFrontendPath);

    if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
        requestOptions.body = JSON.stringify(requestOptions.body);
    }

    if (requestOptions.body instanceof FormData) {
        delete (requestOptions.headers as ApiHeaders)['Content-Type'];
    }

    try {
        const response: Response = await fetch(resolvedEndpoint, requestOptions as RequestInit);

        // Verificar si es 401 Unauthorized en endpoints autenticados
        if (response.status === 401 && useAuth && logoutOn401) {
            void import('@/app/services/splashLogoService').then((m) => m.invalidateSplashLogoCache());
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            clearHybridSpaPath();
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
            const msgField = data?.msg;
            const msgFromObject =
                msgField && typeof msgField === 'object'
                    ? msgField.msg || msgField.detalle || msgField.message
                    : null;
            const backendMsg =
                (typeof msgField === 'string' ? msgField : msgFromObject) ||
                data?.detalle ||
                data?.message ||
                data?.error ||
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
