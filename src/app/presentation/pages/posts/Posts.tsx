import { useState, useEffect } from 'react';
import { GalleryPost } from '@/types/posts';
import { postsService } from '@/app/services/postsService';
import PostCard from '@/app/presentation/components/posts/PostCard';
import { Loader2 } from 'lucide-react';

/**
 * Página principal de Posts
 * Muestra una galería de posts estilo redes sociales
 */
export default function Posts() {
    const [posts, setPosts] = useState<GalleryPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await postsService.getPosts();
            setPosts(data);
        } catch (error) {
            console.error('Error al cargar posts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Cargando posts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="container mx-auto px-4 max-w-2xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Galería de Posts
                    </h1>
                    <p className="text-muted-foreground">
                        Descubre nuestras últimas novedades y promociones
                    </p>
                </div>

                {/* Posts Feed */}
                <div className="space-y-6">
                    {posts.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No hay posts disponibles</p>
                        </div>
                    ) : (
                        posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
