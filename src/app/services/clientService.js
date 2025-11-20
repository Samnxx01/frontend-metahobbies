import { apiFetch } from './api';

export const registerClient = async (clientData) => {
    const data = await apiFetch('/api/registro/client', {
        method: 'POST',
        body: clientData,
    });
    return data;
};

export const uploadProfileImage = async (userId, formData) => {
    const data = await apiFetch(`/api/imgPerfil/${userId}`, {
        method: 'POST',
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

export const getUserProfileImageId = async (userId) => {
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

export const fetchProfileImageBlob = async (imageId) => {
    try {
        if (!imageId) {
            throw new Error('ImageId no proporcionado');
        }
        const response = await apiFetch(`/api/imgPerfil/ver/${imageId}`, {
            method: 'GET',
            responseType: 'raw'
        });
        if (response instanceof Response) {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('NO_IMAGE');
                }

                let errorText = response.statusText;
                try {
                    const errorBody = await response.json();
                    if (errorBody && errorBody.msg) {
                        errorText = errorBody.msg;
                    }
                } catch (e) {
                    // No se pudo parsear el JSON del error
                }
                throw new Error(errorText || `Error ${response.status}`);
            }

            const blob = await response.blob();

            if (blob.size === 0) {
                throw new Error('NO_IMAGE');
            }
            return blob;
        } else {
            return response;
        }

    } catch (error) {
        console.error('Error en fetchProfileImageBlob:', error);
        throw error;
    }
};

export const getProfileImageBlobUrl = async (userId) => {
    if (!userId) {
        return null;
    }

    try {
        const imageId = await getUserProfileImageId(userId);
        const imageBlob = await fetchProfileImageBlob(imageId);

        if (!(imageBlob instanceof Blob)) {
            throw new Error('Blob inválido');
        }
        const blobUrl = URL.createObjectURL(imageBlob);
        return blobUrl;
    } catch (error) {
        if (error.message === 'NO_IMAGE') {
            return null;
        }
        console.error('Error al crear Blob URL:', error);
        return null;
    }
};

export const getProfileImageDirectUrl = async (userId) => {
    if (!userId) {
        return null;
    }

    try {
        const imageId = await getUserProfileImageId(userId);
        return `/api/imgPerfil/ver/${imageId}`;
    } catch (error) {
        if (error.message === 'NO_IMAGE') {
            return null;
        }
        console.error('Error al obtener URL directa:', error);
        return null;
    }
};

export const getProfileImageURL = async (userId) => {
    if (!userId) {
        return '';
    }

    try {
        const imageId = await getUserProfileImageId(userId);
        return `/api/imgPerfil/ver/${imageId}`;
    } catch (error) {
        if (error.message === 'NO_IMAGE') {
            return '';
        }
        console.error('Error al obtener URL de imagen:', error);
        return '';
    }
};

export const updatePassword = async (userId, passwordData) => {
    const data = await apiFetch(`/api/actualizar/password/${userId}`, {
        method: 'PUT',
        body: passwordData,
    });
    return data;
};