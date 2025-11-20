export const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'metasplot': token,
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
        delete options.headers['Content-Type'];
    }

    try {
        const response = await fetch(endpoint, options);
        if (options.responseType === 'raw') {
            if (!response.ok) {
                throw new Error(response.statusText || 'Error de red en respuesta raw');
            }
            return response;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {

            if (!response.ok) {
                throw new Error(response.statusText || 'Error de red');
            }
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.msg || data.message || 'Error desconocido de la API');
        }

        return data;

    } catch (error) {
        console.error(`Error en fetch a ${endpoint}:`, error.message);
        throw error;
    }
};