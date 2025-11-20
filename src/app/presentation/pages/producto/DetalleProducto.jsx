import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import ProductCard from '../../components/common/ProductCard'; // Asumimos que ProductCard será migrado

// Importar Lucide icons
import { ShoppingCart, Heart, Plus, Minus, Check, Star } from 'lucide-react';
import { useCart } from '../../../providers/CartProvider'; // Ruta ajustada

const product = {
    id: 1,
    name: 'Base Fluida Hidratante',
    brand: 'Mabs by Gabs',
    price: 39.99,
    rating: 4.5,
    reviews: 128,
    description: 'Una base de maquillaje ligera y de larga duración que proporciona una cobertura media y un acabado natural y radiante. Formulada con ácido hialurónico para mantener la piel hidratada durante todo el día.',
    features: [
        'Acabado natural y radiante',
        'Larga duración (12 horas)',
        'Fórmula hidratante con ácido hialurónico',
        'No comedogénico y apto para piel sensible',
        'Vegano y libre de crueldad animal'
    ],
    images: [
        '/assets/images/products/product3.png',
        '/assets/images/products/product1.png',
        '/assets/images/products/product2.png',
        '/assets/images/products/product5.png',
    ],
    colors: [
        { name: 'Natural Beige', pantone: '#E6A4B4', code: '#D1A78B' },
        { name: 'Ivory', pantone: '#F5D7DB', code: '#F3D4C4' },
        { name: 'Golden Sand', pantone: '#FFD180', code: '#E0B99A' },
        { name: 'Deep Mocha', pantone: '#A1887F', code: '#A17A64' },
    ],
};

const relatedProducts = [
    { id: 2, name: 'Labial Hidratante', price: 14.99, image: '/assets/images/products/product2.png', color: '#C43670' },
    { id: 4, name: 'Set de Brochas Premium', price: 49.99, image: '/assets/images/products/product4.png' },
    { id: 1, name: 'Paleta de Sombras Pro', price: 29.99, image: '/assets/images/products/product1.png', color: '#E6A4B4' },
    // Agregamos un cuarto para completar la grilla md:repeat(4, 1fr)
    { id: 5, name: 'Corrector Full Cover', price: 18.00, image: '/assets/images/products/product5.png', color: '#D1A78B' },
];

// Componente simple para simular el Rating de MUI
const StarRating = ({ rating, reviews }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);

    return (
        <div className="flex items-center space-x-2">
            <div className="flex">
                {[...Array(fullStars)].map((_, i) => (
                    <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                {hasHalfStar && (
                    <Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400/50" />
                )}
                {[...Array(emptyStars)].map((_, i) => (
                    <Star key={`empty-${i}`} className="w-4 h-4 fill-gray-300 text-gray-300" />
                ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
                {rating.toFixed(1)} ({reviews} reseñas)
            </p>
        </div>
    );
};


export default function DetalleProducto() {

    const { addToCart } = useCart();
    const [selectedImage, setSelectedImage] = useState(product.images[0]);
    const [selectedColor, setSelectedColor] = useState(product.colors[0]);
    const [quantity, setQuantity] = useState(1);
    const [isAdded, setIsAdded] = useState(false);

    const handleAddToCart = () => {
        const productToAdd = {
            ...product,
            color: selectedColor,
            image: selectedImage,
        };
        addToCart(productToAdd, quantity);
        setIsAdded(true);

        setTimeout(() => {
            setIsAdded(false);
        }, 2000);
    };

    return (
        // Reemplaza Box y Container
        <div className="py-8 md:py-16 bg-background">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* --- SECCIÓN PRINCIPAL: PRODUCTO --- */}
                <div
                    className="
                        grid grid-cols-1 md:grid-cols-2 
                        gap-8 md:gap-12 
                        bg-card shadow-xl rounded-xl 
                        p-4 sm:p-6 md:p-8
                    "
                >

                    {/* Columna Izquierda: Imágenes */}
                    <div>
                        {/* Imagen Principal */}
                        <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden mb-4 bg-muted/50">
                            <img
                                src={selectedImage}
                                alt={product.name}
                                className="w-full h-full object-contain transition-transform duration-400 ease-in-out hover:scale-[1.05]"
                                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/500x500/f3f4f6/a3a3a3?text=IMG"; }}
                            />
                        </div>

                        {/* Miniaturas - Reemplaza Grid container spacing={1} */}
                        <div className="grid grid-cols-4 gap-2">
                            {product.images.map((img, index) => (
                                <div key={index} className="col-span-1">
                                    <img
                                        src={img}
                                        alt={`Thumbnail ${index + 1}`}
                                        onClick={() => setSelectedImage(img)}
                                        className={`
                                            w-full h-16 md:h-24 object-cover rounded-lg cursor-pointer transition-all duration-200 
                                            border-2 
                                            ${selectedImage === img ? 'border-primary shadow-md' : 'border-border/50 hover:border-border'}
                                        `}
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/90x90/f3f4f6/a3a3a3?text=T"; }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>


                    {/* Columna Derecha: Detalles y Compras */}
                    <div className="space-y-6">

                        {/* Marca/Chip */}
                        <Badge className="text-xs uppercase bg-secondary text-secondary-foreground">
                            {product.brand}
                        </Badge>

                        {/* Título */}
                        <h1 className="text-4xl font-extrabold leading-tight">
                            {product.name}
                        </h1>

                        {/* Rating */}
                        <StarRating rating={product.rating} reviews={product.reviews} />

                        {/* Precio */}
                        <p className="text-3xl font-bold text-primary">
                            ${product.price.toFixed(2)}
                        </p>

                        <Separator /> {/* Reemplaza Divider */}

                        {/* Selección de Tono */}
                        <div>
                            <p className="text-lg font-semibold mb-2">
                                Tono: <span className="font-normal text-muted-foreground">{selectedColor.name}</span>
                            </p>
                            <div className="flex gap-3"> {/* Reemplaza Box sx={{ display: 'flex', gap: 1 }} */}
                                {product.colors.map((color) => (
                                    <div
                                        key={color.pantone}
                                        onClick={() => setSelectedColor(color)}
                                        className={`
                                            w-8 h-8 rounded-full cursor-pointer border-2 transition-all duration-200
                                            flex items-center justify-center 
                                            ${selectedColor.pantone === color.pantone ? 'ring-2 ring-offset-2 ring-primary border-primary' : 'border-border'}
                                        `}
                                        style={{ backgroundColor: color.code }}
                                    >
                                        {selectedColor.pantone === color.pantone && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                                    </div>
                                ))}
                            </div>
                        </div>


                        {/* Descripción y Features */}
                        <p className="text-base text-muted-foreground">
                            {product.description}
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80"> {/* Reemplaza Box component="ul" */}
                            {product.features.map((feature, i) => (
                                <li key={i}>{feature}</li>
                            ))}
                        </ul>

                        <Separator /> {/* Reemplaza Divider */}

                        {/* Controles de Compra */}
                        <div className="flex items-center gap-4 pt-2">

                            {/* Control de Cantidad */}
                            <div className="flex items-center border border-input rounded-lg overflow-hidden">
                                <Button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                >
                                    <Minus className="w-4 h-4" />
                                </Button>
                                <div className="px-4 font-semibold text-lg min-w-[50px] text-center">{quantity}</div>
                                <Button
                                    onClick={() => setQuantity(q => q + 1)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Botón Principal (Agregar) */}
                            <Button
                                onClick={handleAddToCart}
                                size="lg"
                                className={`flex-1 py-2 text-base font-semibold transition-all duration-300 ${isAdded
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-primary hover:bg-primary/90'
                                    }`}
                                disabled={isAdded}
                            >
                                {isAdded ? <Check className="w-5 h-5 mr-2" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
                                {isAdded ? '¡Agregado!' : 'Agregar al Carrito'}
                            </Button>

                            {/* Botón de Deseos */}
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-lg hover:border-primary hover:text-primary transition-colors"
                            >
                                <Heart className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- SECCIÓN: PRODUCTOS RELACIONADOS --- */}
                <div className="mt-16 md:mt-24"> {/* Reemplaza Box sx={{ mt: { xs: 6, md: 12 } }} */}
                    <h2 className="text-3xl font-bold mb-6">También te podría gustar</h2>

                    {/* Tarjetas de Producto - Reemplaza Box con display:grid */}
                    <div
                        className="
                            grid 
                            grid-cols-2 
                            md:grid-cols-3 
                            lg:grid-cols-4 
                            gap-6
                        "
                    >
                        {relatedProducts.map((p) => (
                            // Asumimos que ProductCard será migrado para usar Tailwind
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}