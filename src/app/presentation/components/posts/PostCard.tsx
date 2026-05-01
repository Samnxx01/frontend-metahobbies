import { useState } from 'react';
import { GalleryPost, FileType } from '@/types/posts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostCardProps {
    post: GalleryPost;
}

/**
 * Componente de tarjeta de post estilo redes sociales
 */
export default function PostCard({ post }: PostCardProps) {
    const [likes, setLikes] = useState(Math.floor(Math.random() * 100) + 10);
    const [liked, setLiked] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const handleLike = () => {
        if (liked) {
            setLikes(likes - 1);
        } else {
            setLikes(likes + 1);
        }
        setLiked(!liked);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return 'Hace unos minutos';
        } else if (diffInHours < 24) {
            return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
        } else if (diffInHours < 48) {
            return 'Hace 1 día';
        } else {
            return date.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
        }
    };

    const imageFiles = post.files.filter(f => f.type === FileType.IMAGE);
    const videoFiles = post.files.filter(f => f.type === FileType.VIDEO);

    return (
        <Card className="shadow-md hover:shadow-lg transition-shadow">
            {/* Header del post */}
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            {post.userId.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-semibold text-foreground">Usuario {post.userId}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(post.createdAt)}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3 pb-3">
                {/* Título y descripción */}
                <div>
                    <h3 className="font-bold text-lg text-foreground mb-1">
                        {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {post.description}
                    </p>
                </div>

                {/* Galería de imágenes */}
                {imageFiles.length > 0 && (
                    <div className="relative">
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                            <img
                                src={imageFiles[currentImageIndex].url}
                                alt={`${post.title} - imagen ${currentImageIndex + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Indicadores de múltiples imágenes */}
                        {imageFiles.length > 1 && (
                            <>
                                <div className="flex justify-center gap-1 mt-2">
                                    {imageFiles.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentImageIndex(index)}
                                            className={`h-2 rounded-full transition-all ${
                                                index === currentImageIndex
                                                    ? 'w-6 bg-primary'
                                                    : 'w-2 bg-muted-foreground/30'
                                            }`}
                                            aria-label={`Ver imagen ${index + 1}`}
                                        />
                                    ))}
                                </div>
                                <div className="absolute top-2 right-2 bg-foreground/70 text-background text-xs px-2 py-1 rounded">
                                    {currentImageIndex + 1} / {imageFiles.length}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Videos */}
                {videoFiles.length > 0 && (
                    <div className="space-y-2">
                        {videoFiles.map((video, index) => (
                            <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-black">
                                <video
                                    src={video.url}
                                    controls
                                    className="w-full h-full"
                                    preload="metadata"
                                >
                                    Tu navegador no soporta video HTML5.
                                </video>
                            </div>
                        ))}
                    </div>
                )}

                {/* Acciones del post */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLike}
                            className={`gap-2 ${liked ? 'text-primary' : ''}`}
                        >
                            <Heart
                                className={`h-5 w-5 ${liked ? 'fill-current' : ''}`}
                            />
                            <span className="text-sm font-medium">{likes}</span>
                        </Button>

                        <Button variant="ghost" size="sm" className="gap-2">
                            <MessageCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">
                                {Math.floor(Math.random() * 20)}
                            </span>
                        </Button>
                    </div>

                    <Button variant="ghost" size="sm">
                        <Share2 className="h-5 w-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
