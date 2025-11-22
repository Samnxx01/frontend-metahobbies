import { apiFetch } from './api'; // <-- Importamos nuestro nuevo helper

export const listUsers = async () => {
    // Ya no necesitamos headers, token, ni manejo de error. ¡Todo está en apiFetch!
    return apiFetch('https://server-mabs-xo9s.onrender.com/api/registro/listarRegistro', {
        method: 'GET',
    });
};

export const registerAdmin = async (adminData) => {
    return apiFetch('https://server-mabs-xo9s.onrender.com/api/admin/registro', {
        method: 'POST',
        body: adminData // 'apiFetch' se encarga de hacer el JSON.stringify
    });
};

export const updateUser = async (userId, userData) => {
    return apiFetch(`https://server-mabs-xo9s.onrender.com/api/seguridad/pruebas/actualizar/registro/${userId}`, {
        method: 'PUT',
        body: userData
    });
};

export const deactivateUser = async (userId) => {
    return apiFetch(`https://server-mabs-xo9s.onrender.com/api/usuarios/inactivousuario/${userId}`, {
        method: 'DELETE',
    });
};