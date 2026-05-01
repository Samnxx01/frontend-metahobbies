import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductCardProps } from '@/types/components';

export default function ProductCard({ product, onAddToCart }: ProductCardProps): React.ReactElement {
    // Eliminamos useTheme, isHovered, isSwatchHovered, y el manejo manual de onMouseEnter/onMouseLeave 
    // en el componente principal, usando clases CSS de Tailwind group/group-hover.

    // Mantenemos el estado de hover para el swatch si es necesario, pero simplificamos la lógica visual.
    const [isSwatchHovered, setIsSwatchHovered] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleProductClick = (): void => {
        navigate(`/producto/${product.id}`);
    };

    const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        if (typeof onAddToCart === 'function') {
            onAddToCart(product);
        }
    };

    const handleQuickView = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();
        console.log('Quick view:', product.id);
        navigate(`/producto/${product.id}`);
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.src = "https://placehold.co/400x320/f3f4f6/a3a3a3?text=IMG";
    };

    return (
        // Reemplaza Card de MUI. Usamos 'group' para habilitar efectos de hover en cascada.
        <Card
            onMouseEnter={() => setIsSwatchHovered(true)} // Mantenemos este para el swatch tipográfico
            onMouseLeave={() => setIsSwatchHovered(false)}
            onClick={handleProductClick}
            className="
                relative cursor-pointer 
                w-full h-[480px] 
                flex flex-col 
                overflow-visible 
                border-none shadow-none 
                bg-card p-0 group
            "
        >

            {/* --- SECCIÓN IMAGEN --- */}
            <div
                className="
                    relative 
                    overflow-hidden 
                    h-[80%] w-full 
                    flex items-center justify-center 
                    bg-muted/30
                "
            >
                {/* Contenedor de la imagen */}
                <img
                    src={product.image}
                    alt={product.name}
                    className="
                        w-auto h-auto 
                        max-w-[80%] 
                        max-h-[80%] 
                        object-contain 
                        transition-transform duration-500 ease-in-out 
                        group-hover:scale-[1.05] 
                        block
                    "
                    onError={handleImageError}
                />

                {/* Chip de Descuento */}
                {product.discount && (
                    <Badge
                        className="
                            absolute 
                            top-3 left-3 
                            z-20 
                            font-semibold 
                            text-xs 
                            bg-secondary/60 text-secondary-foreground 
                            hover:bg-secondary/80
                        "
                        variant="outline"
                    >
                        {`${product.discount}% off`}
                    </Badge>
                )}

                {/* Swatch de Color (derecha) */}
                {product.color && (
                    <div
                        onMouseEnter={() => setIsSwatchHovered(true)}
                        onMouseLeave={() => setIsSwatchHovered(false)}
                        className="absolute top-3 right-3 z-30 flex items-center"
                    >
                        {/* Tooltip de Color (Fade y alpha) */}
                        <span
                            className={`
                                text-xs font-semibold 
                                bg-foreground/80 text-background 
                                px-2 py-1 rounded-md mr-2 
                                transition-opacity duration-300 whitespace-nowrap
                                ${isSwatchHovered ? 'opacity-100' : 'opacity-0'}
                            `}
                        >
                            {product.color}
                        </span>

                        {/* Círculo de Color */}
                        <div
                            className="w-6 h-6 rounded-full border border-border shadow-md cursor-pointer"
                            style={{ backgroundColor: product.color }}
                        />
                    </div>
                )}

                {/* Hover Actions (Botones que aparecen al hacer hover en la tarjeta) */}
                <div
                    className="
                        absolute 
                        bottom-3 left-3 right-3 
                        flex gap-2 
                        transition-all duration-300 
                        opacity-0 group-hover:opacity-100
                        translate-y-4 group-hover:translate-y-0
                    "
                >
                    <Button
                        onClick={handleAddToCart}
                        className="
                            flex-1 
                            text-xs h-8 
                            font-semibold
                        "
                    >
                        Agregar al Carrito
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleQuickView}
                        className="
                            flex-1 
                            text-xs h-8 
                            font-semibold 
                            border-border bg-card text-foreground hover:bg-muted/50
                        "
                    >
                        Ver Detalles
                    </Button>
                </div>
            </div>


            {/* --- SECCIÓN CONTENIDO (Precio y Nombre) --- */}
            <CardContent
                className="
                    h-[20%] 
                    flex flex-col 
                    justify-center items-center 
                    text-center 
                    p-4 pt-6 
                    bg-card
                "
            >
                {/* Categoría */}
                <p
                    className="
                        text-xs font-normal 
                        text-muted-foreground uppercase 
                        tracking-wider mb-0.5
                    "
                >
                    {product.category || 'MAQUILLAJE'}
                </p>

                {/* Nombre */}
                <h3
                    title={product.name}
                    className="
                        text-base font-semibold 
                        text-foreground 
                        mb-1 
                        line-clamp-1
                    "
                >
                    {product.name}
                </h3>

                {/* Precio */}
                <p className="text-base font-bold text-foreground">
                    ${product.price}
                </p>

                {/* Precio Original (Si existe) */}
                {product.originalPrice && (
                    <p className="text-sm text-muted-foreground line-through mt-0.5">
                        ${product.originalPrice}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
