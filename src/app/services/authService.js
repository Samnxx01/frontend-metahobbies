import { conectarSocket } from '../../socket/conectarSocket';
import { apiFetch } from './api';

export const login = async (loginData) => {
    const resp = await apiFetch('/api/login/cliente', {
        method: 'POST',
        body: loginData
    });

    // ⬇️ Si el backend devolvió token, lo guardas
    if (resp.token) {
        localStorage.setItem("token", resp.token);

        // ⬇️ SE CONECTA EL SOCKET AUTOMÁTICAMENTE
        conectarSocket();
    }

    return resp;
};

export const registerCliente = async (registerData) => {
    return apiFetch('/api/registro/cliente', {
        method: 'POST',
        body: registerData
    });
};