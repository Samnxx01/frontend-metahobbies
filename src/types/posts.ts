/**
 * Tipos de archivo soportados en los posts
 */
export enum FileType {
    IMAGE = 'image',
    VIDEO = 'video',
    PDF = 'pdf',
    OTHER = 'other'
}

/**
 * Modelo de archivo adjunto en un post
 */
export interface FileModel {
    type: FileType;
    url: string;
}

/**
 * Modelo principal de un post de galería
 */
export interface GalleryPost {
    id: string;
    userId: string;
    groupId: string;
    title: string;
    description: string;
    files: FileModel[];
    createdAt: string; // ISO 8601 date string
}

/**
 * Convierte una cadena a FileType
 */
export const fileTypeFromString = (type: string): FileType => {
    switch (type) {
        case 'image':
            return FileType.IMAGE;
        case 'video':
            return FileType.VIDEO;
        case 'pdf':
            return FileType.PDF;
        default:
            return FileType.OTHER;
    }
};

/**
 * Convierte FileModel desde el formato del API
 */
export const fileModelFromMap = (map: any): FileModel => {
    return {
        type: fileTypeFromString(map.type as string),
        url: map.url as string,
    };
};

/**
 * Convierte GalleryPost desde el formato del API
 */
export const galleryPostFromMap = (map: any): GalleryPost => {
    return {
        id: map.id?.toString() || '',
        userId: map.user?.toString() || '',
        groupId: map.group?.toString() || '',
        title: map.title as string,
        description: map.description as string,
        files: (map.files as any[])?.map(fileModelFromMap) || [],
        createdAt: map.created_at as string,
    };
};
