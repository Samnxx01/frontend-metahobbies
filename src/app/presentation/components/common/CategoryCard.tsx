import React from 'react';
import { useNavigate } from 'react-router-dom';

// Shadcn UI components
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Lucide icons
import { ArrowRight } from 'lucide-react';

import type { CategoryCardProps } from '@/types/components';

export default function CategoryCard({ category }: CategoryCardProps): React.ReactElement {
    const navigate = useNavigate();

    // Replicamos la navegación con la query string
    const handleCategoryClick = (): void => {
        navigate(`/productos?categoria=${category.name}`); // Usamos el nombre para la categoría
    };

    // Función para manejar el clic en el botón de flecha (previene el bubbling)
    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        handleCategoryClick();
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.src = "https://placehold.co/300x300/f3f4f6/a3a3a3?text=IMG";
    };

    return (
        // Reemplaza Card de MUI y sus estilos sx, incluyendo el styled(IconButton)
        <Card
            onClick={handleCategoryClick}
            className="
                relative cursor-pointer 
                h-[300px] w-full 
                flex flex-col 
                overflow-hidden 
                border-none shadow-none 
                items-center justify-center 
                bg-muted/50 
                transition-all duration-300 ease-in-out 
                hover:translate-y-[-2px] hover:shadow-xl
                group
            "
        >

            {/* Contenedor de la Imagen y el Gradiente */}
            <div
                className="
                    relative 
                    h-full w-full 
                    flex items-center justify-center
                    p-6
                "
            >
                {/* CardMedia componente="img" */}
                <img
                    src={category.image}
                    alt={category.name}
                    className="
                        w-full h-full 
                        max-w-[80%] max-h-[80%] 
                        object-contain object-center 
                        transition-transform duration-500 ease-out 
                        group-hover:scale-[1.05] 
                        block
                    "
                    onError={handleImageError}
                />

                {/* Gradiente Oscuro en la parte inferior */}
                <div
                    className="
                        absolute 
                        inset-0 
                        bg-gradient-to-t from-black/40 to-transparent/50 
                        flex flex-col justify-end 
                        p-4
                    "
                >
                    {/* Contenido del Footer (Nombre y Botón) */}
                    <div className="flex justify-between items-center w-full">

                        {/* Nombre de la Categoría */}
                        <h3
                            className="
                                text-base 
                                text-white 
                                font-semibold 
                                drop-shadow-md
                            "
                        >
                            {category.name}
                        </h3>

                        {/* Botón de Flecha (Reemplaza StyledIconButton) */}
                        <Button
                            onClick={handleButtonClick}
                            variant="default" // Usamos default para el fondo primario de Tailwind
                            size="icon"
                            className="
                                h-7 w-7 p-0 rounded-full 
                                bg-white text-foreground 
                                border border-input 
                                transition-all duration-300 
                                hover:scale-[1.1] hover:bg-gray-100 hover:text-primary
                            "
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}