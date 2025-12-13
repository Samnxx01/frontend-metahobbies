import { apiFetch } from './api';
import type { UserId, ApiResponse } from '../../types/common';

export const listUsers = async () => {
    return apiFetch('/api/registro/listarRegistro', {
        method: 'GET',
    });
};

export interface AdminData {
    [key: string]: unknown;
    rol?: string;
}

export interface UpdateUserData {
    [key: string]: unknown;
}

export const registerAdmin = async (adminData: AdminData): Promise<ApiResponse> => {
    // Determinar el endpoint según el rol
    const endpoint = adminData.rol === 'ADMIN' 
        ? '/api/admin/registro' 
        : '/api/registro/client';
    
    return apiFetch(endpoint, {
        method: 'POST',
        body: adminData 
    });
};

export const updateUser = async (userId: UserId, userData: UpdateUserData): Promise<ApiResponse> => {
    return apiFetch(`/api/seguridad/pruebas/actualizar/registro/${userId}`, {
        method: 'PUT',
        body: userData
    });
};

export const deactivateUser = async (userId: UserId): Promise<ApiResponse> => {
    return apiFetch(`/api/usuarios/inactivousuario/${userId}`, {
        method: 'DELETE',
    });
};