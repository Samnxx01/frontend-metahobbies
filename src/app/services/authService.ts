import { conectarSocket } from '../socket';
import { apiFetch } from './api';
import type { User, ApiResponse } from '../../types/common';

interface LoginData {
    correo: string;
    password: string;
}

interface LoginResponse extends ApiResponse {
    msg: string;
    usuario: User;
    token: string;
    requiereActualizacion?: boolean;
}

export const login = async (loginData: LoginData): Promise<LoginResponse> => {
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

interface RegisterClienteData {
    [key: string]: any;
}

interface RegisterClienteResponse {
    [key: string]: any;
}

export const registerCliente = async (registerData: RegisterClienteData): Promise<RegisterClienteResponse> => {
    return apiFetch('/api/registro/cliente', {
        method: 'POST',
        body: registerData
    });
};

interface RecoveryPasswordData {
    correo: string;
}

interface RecoveryPasswordResponse extends ApiResponse {
    msg: string;
}

export const requestPasswordRecovery = async (data: RecoveryPasswordData): Promise<RecoveryPasswordResponse> => {
    return apiFetch('/api/recuperacion/seguridad/password/todos', {
        method: 'POST',
        body: data
    });
};

interface ResetPasswordData {
    correo: string;
    password: string;
}

interface ResetPasswordResponse extends ApiResponse {
    msg: string;
}

export const resetPassword = async (correo: string, password: string, token: string): Promise<ResetPasswordResponse> => {
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
    };
    
    return apiFetch('/api/recuperacion/seguridad/cambio/password/todos', {
        method: 'POST',
        body: {
            correo,
            password
        },
        headers
    });
};