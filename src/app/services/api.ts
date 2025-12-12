export type ResponseType = 'raw' | string;
export type ApiHeaders = Record<string, string>;

export type ApiOptions = Omit<RequestInit, 'body' | 'headers'> & {
    body?: unknown;
    headers?: ApiHeaders;
    responseType?: ResponseType;
};

export const apiFetch = async (
    endpoint: string,
    options: ApiOptions
): Promise<any | Response | null> => {
    const token: string | null = localStorage.getItem('token');

    const defaultHeaders: ApiHeaders = {
        'Content-Type': 'application/json',
        'metasploit': token as string,
        ...options.headers,
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    options.headers = {
        ...defaultHeaders,
        ...options.headers,
    };

    if (options.body && !(options.body instanceof FormData)) {
        options.body = JSON.stringify(options.body);
    }

    if (options.body instanceof FormData) {
        delete (options.headers as ApiHeaders)['Content-Type'];
    }

    try {
        const response: Response = await fetch(endpoint, options as RequestInit);
        
        // Verificar si es 401 Unauthorized
        if (response.status === 401) {
            // Token no válido - cerrar sesión
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            // Redirigir a login
            window.location.href = '/login';
            throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }
        
        if (options.responseType === 'raw') {
            if (!response.ok) {
                throw new Error(response.statusText || 'Error de red en respuesta raw');
            }
            return response;
        }

        const contentType: string | null = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {

            if (!response.ok) {
                throw new Error(response.statusText || 'Error de red');
            }
            return null;
        }

        const data: any = await response.json();

        if (!response.ok) {
            throw new Error(data.msg || data.message || 'Error desconocido de la API');
        }

        return data;

    } catch (error: any) {
        console.error(`Error en fetch a ${endpoint}:`, error.message);
        throw error;
    }
};