import axios, { type AxiosResponse, type Method } from 'axios';
import { getGovernedLogoutPath } from '@/app/services/governedNavigation';
import { reportarPeticionLentaFrontend } from '@/app/observability/newRelicBrowser';

/** Umbral para reportar a New Relic una petición lenta (evento PeticionLentaFrontend). */
const UMBRAL_PETICION_LENTA_MS = 60_000;

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

    // Token de referido (checkout membresía): conservar aunque useAuth sea false.
    const referidosHeader = String(headers?.referidos || '').trim();
    if (referidosHeader) {
        safeHeaders.referidos = referidosHeader;
        if (!safeHeaders.Authorization) {
            safeHeaders.Authorization = `Bearer ${referidosHeader}`;
        }
    }

    if (spaFrontendPath) {
        safeHeaders['x-mabs-frontend-path'] = spaFrontendPath;
    } else {
        delete safeHeaders['x-mabs-frontend-path'];
    }

    return safeHeaders;
};

// En producción (build) VITE_API_URL apunta a Render.
// En dev, el proxy de Vite redirige /api → localhost:8080, así que API_ORIGIN debe ser vacío.
const API_ORIGIN = import.meta.env.PROD
    ? (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '')
    : '';

const buildAbsoluteUrl = (endpoint: string): string => {
    if (API_ORIGIN && endpoint.startsWith('/api')) {
        return `${API_ORIGIN}${endpoint}`;
    }
    return endpoint;
};

/**
 * Instancia central de axios: apiFetch y las peticiones que no pasan por apiFetch
 * (Wompi, TRM, descargas blob, headers especiales) importan esta misma instancia.
 * No agregar aquí interceptores que inyecten credenciales: también la usan APIs externas.
 */
export const axiosClient = axios.create();

const toResponseHeaders = (headers: AxiosResponse['headers']): Headers => {
    const result = new Headers();
    Object.entries(headers || {}).forEach(([key, value]) => {
        if (typeof value === 'string') result.set(key, value);
    });
    return result;
};

/** Statuses donde Response no admite body (evita TypeError al construirlo). */
const NULL_BODY_STATUSES = [101, 204, 205, 304];

export const apiFetch = async (
    endpoint: string,
    options: ApiOptions = {}
): Promise<any | Response | null> => {
    const token: string | null = localStorage.getItem('token');
    const useAuth: boolean = options.useAuth ?? true;
    const logoutOn401: boolean = options.logoutOn401 ?? Boolean(token);
    const requestOptions: ApiOptions = { ...options };
    const spaFrontendPath = resolveSpaContext(endpoint);

    requestOptions.headers = buildSafeHeaders(requestOptions.headers, useAuth, token, spaFrontendPath);

    if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
        requestOptions.body = JSON.stringify(requestOptions.body);
    }

    if (requestOptions.body instanceof FormData) {
        delete (requestOptions.headers as ApiHeaders)['Content-Type'];
    }

    const inicioMs = performance.now();
    let statusRespuesta: number | 'SIN_RESPUESTA' = 'SIN_RESPUESTA';

    try {
        const axiosResponse: AxiosResponse = await axiosClient.request({
            url: buildAbsoluteUrl(endpoint),
            method: (requestOptions.method ?? 'GET') as Method,
            headers: requestOptions.headers,
            data: requestOptions.body,
            signal: requestOptions.signal ?? undefined,
            responseType: requestOptions.responseType === 'raw' ? 'blob' : 'text',
            // apiFetch decide parseo y errores según status/content-type: sin transform ni throw de axios.
            transformResponse: (data) => data,
            validateStatus: () => true,
        });

        const status = axiosResponse.status;
        const responseOk = status >= 200 && status < 300;
        statusRespuesta = status;

        // Verificar si es 401 Unauthorized en endpoints autenticados
        if (status === 401 && useAuth && logoutOn401) {
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
            if (!responseOk) {
                throw new Error(axiosResponse.statusText || 'Error de red en respuesta raw');
            }
            // Compatibilidad: los consumidores de 'raw' esperan un Response (.ok, .blob(), .text(), .json()).
            return new Response(NULL_BODY_STATUSES.includes(status) ? null : axiosResponse.data, {
                status,
                statusText: axiosResponse.statusText,
                headers: toResponseHeaders(axiosResponse.headers),
            });
        }

        const contentTypeHeader = axiosResponse.headers?.['content-type'];
        const contentType: string | null = typeof contentTypeHeader === 'string' ? contentTypeHeader : null;
        if (!contentType || !contentType.includes('application/json')) {
            if (!responseOk) {
                throw new Error(axiosResponse.statusText || 'Error de red');
            }
            return null;
        }

        const rawBody: unknown = axiosResponse.data;
        const data: any = typeof rawBody === 'string'
            ? (rawBody ? JSON.parse(rawBody) : null)
            : rawBody;

        if (!responseOk) {
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
            const err = new Error(`[${status}] ${backendMsg}`) as Error & {
                tipoError?: string;
                detalle?: string;
            };
            if (data?.tipoError) err.tipoError = String(data.tipoError);
            if (data?.detalle) err.detalle = String(data.detalle);
            throw err;
        }

        return data;
    } catch (error: any) {
        console.error(`Error en peticion a ${endpoint}:`, error.message);
        throw error;
    } finally {
        const duracionMs = Math.round(performance.now() - inicioMs);
        if (duracionMs >= UMBRAL_PETICION_LENTA_MS) {
            reportarPeticionLentaFrontend({
                endpoint: String(resolvedEndpoint).split('?')[0],
                metodo: String(requestOptions.method || 'GET').toUpperCase(),
                status: statusRespuesta,
                duracionMs,
                paginaSpa: typeof window !== 'undefined' ? String(window.location?.pathname || '') : '',
            });
        }
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
