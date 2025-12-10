import { GalleryPost, FileType } from '@/types/posts';

/**
 * Servicio de posts con datos hardcodeados
 */
class PostsService {
    /**
     * Obtiene el listado de posts hardcodeados
     */
    async getPosts(): Promise<GalleryPost[]> {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));

        return [
            {
                id: '1',
                userId: '101',
                groupId: '1',
                title: 'Nuevo producto de maquillaje 💄',
                description: 'Conoce nuestra nueva línea de labiales de larga duración. Disponibles en 12 colores vibrantes que duran todo el día. ¡No te lo pierdas!',
                files: [
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80'
                    },
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80'
                    }
                ],
                createdAt: new Date('2024-12-08T10:30:00').toISOString()
            },
            {
                id: '2',
                userId: '102',
                groupId: '1',
                title: 'Tutorial de maquillaje natural 🌿',
                description: 'Aprende a crear un look natural perfecto para el día a día. En este video te mostramos paso a paso cómo lograr un acabado fresco y luminoso.',
                files: [
                    {
                        type: FileType.VIDEO,
                        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                    }
                ],
                createdAt: new Date('2024-12-07T15:45:00').toISOString()
            },
            {
                id: '3',
                userId: '103',
                groupId: '2',
                title: 'Colección de verano ☀️',
                description: 'Presentamos nuestra esperada colección de verano. Tonos frescos, texturas ligeras y acabados naturales para lucir radiante en la temporada más cálida del año.',
                files: [
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80'
                    },
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=800&q=80'
                    },
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80'
                    }
                ],
                createdAt: new Date('2024-12-06T09:15:00').toISOString()
            },
            {
                id: '4',
                userId: '104',
                groupId: '1',
                title: 'Tips para el cuidado de la piel 💆‍♀️',
                description: 'Descubre los secretos para mantener tu piel saludable y radiante. Rutina de cuidado facial paso a paso con nuestros productos estrella.',
                files: [
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80'
                    }
                ],
                createdAt: new Date('2024-12-05T14:20:00').toISOString()
            },
            {
                id: '5',
                userId: '105',
                groupId: '2',
                title: 'Ofertas exclusivas 🎁',
                description: '¡No te pierdas nuestras ofertas especiales! Hasta 40% de descuento en productos seleccionados. Válido solo por tiempo limitado.',
                files: [
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80'
                    },
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1596704017254-9b121068ec31?w=800&q=80'
                    }
                ],
                createdAt: new Date('2024-12-04T11:00:00').toISOString()
            },
            {
                id: '6',
                userId: '106',
                groupId: '1',
                title: 'Maquillaje para eventos especiales ✨',
                description: 'Transforma tu look para esa ocasión especial. Te mostramos las últimas tendencias en maquillaje de noche con técnicas profesionales.',
                files: [
                    {
                        type: FileType.VIDEO,
                        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
                    },
                    {
                        type: FileType.IMAGE,
                        url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80'
                    }
                ],
                createdAt: new Date('2024-12-03T16:30:00').toISOString()
            }
        ];
    }

    /**
     * Obtiene un post por su ID
     */
    async getPostById(id: string): Promise<GalleryPost | null> {
        const posts = await this.getPosts();
        return posts.find(post => post.id === id) || null;
    }
}

export const postsService = new PostsService();
