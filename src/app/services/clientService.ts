import { apiFetch } from './api';
import { buildImgPerfilVerUrl } from '@/app/utils/normalizeImageRenderUrl';
import type { UserId, ImageId, ApiResponse } from '../../types/common';

interface ClientData {
    nombre?: string;
    apellido?: string;
    email: string;
    password: string;
    rol: string
    telefono?: string;
    direccion?: string;
}

interface UploadImageResponse extends ApiResponse {
    imageId?: ImageId;
}

export const registerClient = async (
    clientData: ClientData & { correo?: string; fecha_nacimiento?: string }
): Promise<ApiResponse> => {

    const payload = {
        correo: clientData.email,               // backend espera 'correo'
        password: clientData.password,          // correcto
        rol: clientData.rol || "CLIENTE",       // lo usa tu BD
    };

    const data = await apiFetch('/api/registro/client', {
        method: 'POST',
        body: payload,
    });

    return data;
};

export const uploadProfileImage = async (
    formData: FormData
): Promise<UploadImageResponse> => {

    const data = await apiFetch(`/api/actualizar/imgPerfil`, {
        method: 'PUT',
        body: formData,
    });

    return data;
};

export const getAllProfileImages = async () => {
    try {
        const data = await apiFetch('/api/imgPerfil', {
            method: 'GET',
        });

        if (data && Array.isArray(data.imagenes)) {
            return data.imagenes;
        } else {
            return [];
        }
    } catch (error) {
        return [];
    }
};

export const getUserProfileImageId = async (userId: UserId): Promise<ImageId> => {
    try {
        const images = await getAllProfileImages();

        if (!Array.isArray(images)) {
            throw new Error('La respuesta no es un array de imágenes');
        }

        const userImage = images.find(img => {
            return img.usuario === userId ||
                img.usuario === userId.toString();
        });

        if (!userImage) {
            throw new Error('NO_IMAGE');
        }

        return userImage.id;
    } catch (error) {
        console.error('Error al obtener imageId del usuario:', error);
        throw error;
    }
};

export const fetchProfileImageBlob = async (): Promise<Blob> => {
    const response = await apiFetch("/api/imgPerfil/ver", {
        method: "GET",
        responseType: "raw"
    });

    if (!(response instanceof Response)) {
        throw new Error("INVALID_RESPONSE");
    }

    if (response.status === 204) throw new Error("NO_IMAGE");
    if (response.status === 404) throw new Error("NO_IMAGE");
    if (!response.ok) throw new Error("IMAGE_FETCH_ERROR");

    return await response.blob();
};

export const getProfileImageBlobUrl = async (): Promise<string | null> => {
    try {
        const blob = await fetchProfileImageBlob();
        return URL.createObjectURL(blob);
    } catch {
        return null;
    }
};

export const getProfileImageURL = async (userId: UserId): Promise<string> => {
    if (!userId) {
        return '';
    }

    try {
        const imageId = await getUserProfileImageId(userId);
        return buildImgPerfilVerUrl(imageId);
    } catch (error) {
        if (error instanceof Error && error.message === 'NO_IMAGE') {
            return '';
        }
        console.error('Error al obtener URL de imagen:', error);
        return '';
    }
};

export const updatePassword = async (userId: UserId, passwordData: { currentPassword: string; newPassword: string }): Promise<ApiResponse> => {
    const data = await apiFetch(`/api/actualizar/password/${userId}`, {
        method: 'PUT',
        body: passwordData,
    });
    return data;
};
