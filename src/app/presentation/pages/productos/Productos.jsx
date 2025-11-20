import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useCart } from '../../../providers/CartProvider'; // Ruta ajustada

// Shadcn UI components
import { Badge } from '@/components/ui/badge'; // Reemplaza Chip
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Reemplaza Select de MUI
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// Componente de la Card de Producto (asumimos que ya está migrado)
import ProductCard from '../../components/common/ProductCard';

// Lucide icons
import { ChevronLeft, ChevronRight } from 'lucide-react';

const allProducts = [
    // ... (Mantén tu lista completa de 24 productos aquí, omitida por brevedad en el código)
    { id: 1, name: 'Paleta de Sombras Pro', description: 'Paleta de 12 tonos profesionales con acabado mate y brillo', price: 29.99, image: '/assets/images/products/product1.png', category: 'maquillaje' },
    { id: 2, name: 'Labial Hidratante', description: 'Labial de larga duración con vitamina E', price: 14.99, image: '/assets/images/products/product2.png', category: 'maquillaje' },
    { id: 3, name: 'Shampoo Reparador', description: 'Shampoo con queratina para cabello dañado', price: 18.99, image: '/assets/images/products/product3.png', category: 'cabello' },
    { id: 4, name: 'Acondicionador Intensivo', description: 'Acondicionador de hidratación profunda', price: 16.99, image: '/assets/images/products/product4.png', category: 'cabello' },
    { id: 5, name: 'Esmalte Secado Rápido', description: 'Esmalte con tecnología de secado ultrarrápido', price: 8.99, image: '/assets/images/products/product5.png', category: 'uñas' },
    { id: 6, name: 'Kit Manicure Completo', description: 'Kit con 15 tonos de esmaltes y accesorios', price: 39.99, image: '/assets/images/products/product1.png', category: 'uñas' },
    { id: 7, name: 'Crema Facial Hidratante', description: 'Crema con ácido hialurónico y vitamina C', price: 32.99, image: '/assets/images/products/product2.png', category: 'cuidado-facial' },
    { id: 8, name: 'Serum Anti-Edad', description: 'Serum con retinol y péptidos', price: 49.99, image: '/assets/images/products/product4.png', category: 'cuidado-facial' },
    ...Array.from({ length: 16 }, (_, i) => ({
        id: i + 9,
        name: `Producto ${i + 9}`,
        description: `Descripción del producto ${i + 9}`,
        price: Math.floor(Math.random() * 50) + 10,
        image: '/assets/images/products/product5.png',
        category: ['maquillaje', 'cabello', 'uñas', 'cuidado-facial'][Math.floor(Math.random() * 4)],
    })),
];

// Opciones de ordenamiento
const sortOptions = [
    { value: 'default', label: 'Relevancia' },
    { value: 'price-asc', label: 'Menor precio' },
    { value: 'price-desc', label: 'Mayor precio' },
    { value: 'name-asc', label: 'A-Z (Nombre)' },
    { value: 'name-desc', label: 'Z-A (Nombre)' },
];


export default function Productos() {
    const { addToCart } = useCart();
    const categories = ['Todos', 'Maquillaje', 'Cabello', 'Uñas', 'Cuidado Facial'];
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [sortBy, setSortBy] = useState('default');
    const [page, setPage] = useState(1);
    const productsPerPage = 12;

    const filteredAndSortedProducts = useMemo(() => {
        let filtered = [...allProducts];

        if (selectedCategory !== 'Todos') {
            filtered = filtered.filter(product =>
                product.category.toLowerCase() === selectedCategory.toLowerCase().replace(/\s+/g, '-')
            );
        }

        switch (sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            default:
                break;
        }
        return filtered;
    }, [selectedCategory, sortBy]);

    const currentProducts = useMemo(() => {
        const startIndex = (page - 1) * productsPerPage;
        return filteredAndSortedProducts.slice(startIndex, startIndex + productsPerPage);
    }, [page, filteredAndSortedProducts]);

    const totalPages = Math.ceil(filteredAndSortedProducts.length / productsPerPage);

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setPage(1);
    };

    const handleSortChange = (value) => { // Recibe el valor directamente del Select de Shadcn
        setSortBy(value);
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddToCart = (product) => {
        // Asume variante por defecto si es necesario, como hicimos en Home.jsx
        addToCart(product, 1);
        toast.success(`${product.name} agregado al carrito`, { autoClose: 1500 });
    };

    return (
        <div className="container max-w-7xl mx-auto py-8 px-4"> {/* Reemplaza Container maxWidth="xl" */}
            <h1 className="text-3xl font-bold mb-6"> {/* Reemplaza Typography variant="h3" */}
                Nuestros Productos
            </h1>

            {/* --- Filtros y Ordenamiento --- */}
            <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">

                {/* Filtro de Categorías - Reemplaza Box y Chip */}
                <div className="flex gap-2 flex-wrap max-w-full">
                    {categories.map((category) => (
                        <Badge
                            key={category}
                            onClick={() => handleCategoryChange(category)}
                            variant={category === selectedCategory ? 'default' : 'outline'}
                            className={`cursor-pointer px-4 py-1.5 text-sm font-medium transition-colors ${category === selectedCategory
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'border-input hover:bg-muted/50 text-foreground'
                                }`}
                        >
                            {category}
                        </Badge>
                    ))}
                </div>

                {/* Ordenamiento - Reemplaza FormControl y Select de MUI */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <Label htmlFor="sort-select">Ordenar por:</Label>
                    <Select
                        value={sortBy}
                        onValueChange={handleSortChange}
                    >
                        <SelectTrigger id="sort-select" className="w-[180px] h-9">
                            <SelectValue placeholder="Relevancia" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* --- Lista de Productos --- */}
            <div
                className="
                    grid 
                    grid-cols-2 
                    md:grid-cols-3 
                    lg:grid-cols-4 
                    gap-6
                "
            >
                {currentProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={() => handleAddToCart(product)}
                    />
                ))}
            </div>

            {/* --- Paginación --- */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10"> {/* Reemplaza Stack */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Renderiza los números de página como botones */}
                    {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        const isActive = pageNumber === page;

                        return (
                            <Button
                                key={pageNumber}
                                variant={isActive ? 'default' : 'outline'}
                                onClick={() => handlePageChange(pageNumber)}
                                className={`w-10 h-10 ${isActive ? 'font-bold' : ''}`}
                            >
                                {pageNumber}
                            </Button>
                        );
                    })}

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}