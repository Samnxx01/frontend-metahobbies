import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../../providers/CartProvider';

// Componentes de la estructura (asumimos que serán o ya fueron migrados)
import HeroBanner from '../../components/hero/HeroBanner';
import CategoryCard from '../../components/common/CategoryCard';
import ProductCard from '../../components/common/ProductCard';
import AffiliateBanner from '../../components/affiliate/AffiliateBanner';
import AboutUs from '../../components/about/AboutUs';

// Shadcn UI components
import { Button } from '@/components/ui/button';

// Lucide Icons
import { ArrowLeft, ArrowRight } from 'lucide-react';

const categories = [
    { id: 1, name: 'Maquillaje', image: '/assets/images/products/product1.png' },
    { id: 2, name: 'Labiales', image: '/assets/images/products/product2.png' },
    { id: 3, name: 'Brochas', image: '/assets/images/products/product3.png' },
    { id: 4, name: 'Base & Corrector', image: '/assets/images/products/product4.png' },
    { id: 5, name: 'Cuidado Facial', image: '/assets/images/products/product5.png' },
];

const flashDeals = [
    { id: 1, name: 'Paleta de Sombras Pro', description: 'Paleta de 12 tonos profesionales con acabado mate y brillo', price: 29.99, originalPrice: 39.99, discount: 25, image: '/assets/images/products/product1.png', category: 'MAQUILLAJE', color: '#E6A4B4' },
    { id: 2, name: 'Labial Hidratante', description: 'Labial de larga duración con vitamina E', price: 14.99, originalPrice: 19.99, discount: 15, image: '/assets/images/products/product2.png', category: 'LABIALES', color: '#C43670' },
    { id: 3, name: 'Base de Maquillaje HD', description: 'Base líquida de cobertura completa', price: 34.99, originalPrice: 44.99, discount: 22, image: '/assets/images/products/product3.png', category: 'BASE', color: '#F5D7DB' },
    { id: 4, name: 'Set de Brochas Premium', description: 'Set de 8 brochas sintéticas de lujo', price: 49.99, originalPrice: 79.99, discount: 38, image: '/assets/images/products/product4.png', category: 'ACCESORIOS', color: '#fd304bff' }
];

export default function Home() {
    const [flashDealIndex, setFlashDealIndex] = useState(0);
    const productsPerView = 4; // Determinado por el layout de 4 columnas en md

    const maxIndex = Math.ceil(flashDeals.length / productsPerView) - 1;

    const nextFlashDeals = () => {
        setFlashDealIndex(prev => prev >= maxIndex ? 0 : prev + 1);
    };

    const prevFlashDeals = () => {
        setFlashDealIndex(prev => prev <= 0 ? maxIndex : prev - 1);
    };

    const visibleFlashDeals = flashDeals.slice(
        flashDealIndex * productsPerView,
        (flashDealIndex + 1) * productsPerView
    );

    const { addToCart } = useCart();

    const handleAddToCart = (product) => {
        // En un componente de marketing como este, agregamos el primer color/variante por defecto.
        const defaultProduct = {
            ...product,
            color: product.color || null,
            image: product.image
        };
        addToCart(defaultProduct, 1);
        toast.success(`${product.name} agregado al carrito`, { autoClose: 1500 });
    };

    return (
        <>
            <HeroBanner />

            <div className="container max-w-7xl mx-auto py-16 px-4"> {/* Reemplaza Container maxWidth="xl" */}

                {/* --- SECCIÓN: PRODUCTOS DESTACADOS / FLASH DEALS --- */}
                <div className="mb-16"> {/* Reemplaza Box sx={{ mb: 8 }} */}

                    {/* Header y Navegación */}
                    <div className="flex justify-between items-center mb-6">
                        <h2
                            className="
                                text-3xl md:text-4xl 
                                font-extrabold 
                                text-foreground
                            "
                        >
                            Productos Destacados
                        </h2>

                        {/* Controles de Carrusel - Reemplaza Box e IconButton */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={prevFlashDeals}
                                className="border-border hover:bg-muted/50 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={nextFlashDeals}
                                className="border-border hover:bg-muted/50 transition-colors"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Lista de Productos (Carrusel simulado) */}
                    <div
                        className="
                            grid 
                            grid-cols-2 
                            md:grid-cols-4 
                            gap-6
                        "
                    >
                        {visibleFlashDeals.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={() => handleAddToCart(product)}
                            />
                        ))}
                    </div>
                </div>

                {/* --- SECCIÓN: CATEGORÍAS / SOLUCIONES --- */}
                <div className="mb-16"> {/* Reemplaza Box sx={{ mb: 8 }} */}
                    <div className="flex justify-between items-center mb-6">
                        <h2
                            className="
                                text-3xl md:text-4xl 
                                font-extrabold 
                                text-foreground
                            "
                        >
                            Soluciones a tus necesidades
                        </h2>
                    </div>

                    {/* Fila 1 de Categorías (3 Columnas en desktop) */}
                    <div
                        className="
                            grid 
                            grid-cols-1 
                            sm:grid-cols-2 
                            md:grid-cols-3 
                            gap-6
                        "
                    >
                        <CategoryCard category={categories[0]} />
                        <CategoryCard category={categories[1]} />
                        <CategoryCard category={categories[2]} />
                    </div>

                    {/* Fila 2 de Categorías (2 Columnas en desktop) */}
                    <div
                        className="
                            grid 
                            grid-cols-1 
                            sm:grid-cols-2 
                            gap-6 
                            mt-6
                        "
                    >
                        <CategoryCard category={categories[3]} />
                        <CategoryCard category={categories[4]} />
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN: SOBRE NOSOTROS (AboutUs) --- */}
            {/* Este componente ya fue migrado en el primer paso */}
            <AboutUs />

            {/* --- SECCIÓN: BANNER DE AFILIADOS (AffiliateBanner) --- */}
            {/* Este componente será migrado pronto */}
            <AffiliateBanner />
        </>
    );
}