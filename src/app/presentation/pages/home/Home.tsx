import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../../providers/CartProvider';
import type { Product as ComponentProduct } from '../../../../types/components';
import type { Product as CommonProduct } from '../../../../types/common';
import productosService, {
  type BackendCategoria,
  getCategoriaId,
  getCategoriaPadreId,
  getCategoryImage,
} from '../../../services/productosService';
import { esErrorProductoRequiereColor } from '@/app/utils/productColorUtils';

import HeroBanner from '../../components/hero/HeroBanner';
import CategoryCard from '../../components/common/CategoryCard';
import ProductCard from '../../components/common/ProductCard';
import AffiliateBanner from '../../components/affiliate/AffiliateBanner';
import AboutUs from '../../components/about/AboutUs';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const FALLBACK_CATEGORIES = [
  { id: '1', name: 'Maquillaje', image: '/assets/images/products/product1.png' },
  { id: '2', name: 'Labiales', image: '/assets/images/products/product2.png' },
  { id: '3', name: 'Brochas', image: '/assets/images/products/product3.png' },
  { id: '4', name: 'Base & Corrector', image: '/assets/images/products/product4.png' },
  { id: '5', name: 'Cuidado Facial', image: '/assets/images/products/product5.png' },
];

// ── Skeleton de tarjeta ───────────────────────────────────────────────────
function ProductCardSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="w-full h-[320px] rounded-lg bg-muted" />
      <div className="w-3/4 h-4 mx-auto rounded bg-muted" />
      <div className="w-1/2 h-4 mx-auto rounded bg-muted" />
    </div>
  );
}

const PRODUCTS_PER_PAGE = 4;

export default function Home(): React.ReactElement {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [categorias, setCategorias] = useState<BackendCategoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');
  const [productos, setProductos] = useState<ComponentProduct[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [page, setPage] = useState(0);
  const categoriasPadre = categorias.filter((categoria) => !getCategoriaPadreId(categoria));

  const maxPage = Math.max(0, Math.ceil(productos.length / PRODUCTS_PER_PAGE) - 1);
  const visibleProductos = productos.slice(page * PRODUCTS_PER_PAGE, (page + 1) * PRODUCTS_PER_PAGE);

  // Carga inicial de categorías
  useEffect(() => {
    productosService.listarCategorias()
      .then(data => setCategorias(data.filter(c => c.estado !== false)))
      .catch(() => {/* falla silenciosa */});
  }, []);

  // Carga de productos por categoría
  const cargarProductos = useCallback(async (categoriaId?: string) => {
    setLoadingProductos(true);
    setPage(0);
    try {
      const data = await productosService.listarParaHome(categoriaId);
      setProductos(data);
    } catch {
      toast.error('Error cargando productos');
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const handleSelectCategoria = (id: string) => {
    setCategoriaSeleccionada(id);
    if (id === 'todas') {
      cargarProductos();
      return;
    }
    const idsRelacionados = [
      id,
      ...categorias
        .filter((categoria) => getCategoriaPadreId(categoria) === id)
        .map((categoria) => getCategoriaId(categoria)),
    ];
    setLoadingProductos(true);
    setPage(0);
    productosService.listarParaCatalogoCategorias(idsRelacionados)
      .then(setProductos)
      .catch(() => {
        toast.error('Error cargando productos');
        setProductos([]);
      })
      .finally(() => setLoadingProductos(false));
  };

  const handleAddToCart = async (product: ComponentProduct): Promise<void> => {
    const cartProduct: CommonProduct = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      image: product.image,
      category: product.category || '',
      stock: 100,
      available: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await addToCart(cartProduct, 1);
      toast.success(`${product.name} agregado al carrito`, { autoClose: 1500 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error agregando al carrito';
      if (esErrorProductoRequiereColor(message)) {
        toast.info(message, { autoClose: 3000 });
        navigate(`/producto/${product.id}`);
        return;
      }
      toast.error(message);
    }
  };

  return (
    <>
      <HeroBanner />

      <section className="py-12 md:py-24 bg-background">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── PRODUCTOS DESTACADOS ──────────────────────────────────── */}
          <div className="mb-16">

            {/* Encabezado + flechas carrusel */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
                Productos Destacados
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="icon"
                  onClick={() => setPage(p => p <= 0 ? maxPage : p - 1)}
                  disabled={productos.length <= PRODUCTS_PER_PAGE}
                  className="border-border hover:bg-muted/50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </Button>
                <Button
                  variant="outline" size="icon"
                  onClick={() => setPage(p => p >= maxPage ? 0 : p + 1)}
                  disabled={productos.length <= PRODUCTS_PER_PAGE}
                  className="border-border hover:bg-muted/50 transition-colors"
                >
                  <ArrowRight className="w-5 h-5 text-foreground" />
                </Button>
              </div>
            </div>

            {/* Tabs de categorías (cargadas desde backend) */}
            {categorias.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => handleSelectCategoria('todas')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                    ${categoriaSeleccionada === 'todas'
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-foreground border-border hover:bg-muted'}`}
                >
                  Todas
                </button>
                {categoriasPadre.map((cat, index) => {
                  const categoryId = getCategoriaId(cat, index);
                  return (
                  <button
                    key={categoryId}
                    onClick={() => handleSelectCategoria(categoryId)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize
                      ${categoriaSeleccionada === categoryId
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-foreground border-border hover:bg-muted'}`}
                  >
                    {cat.nombre.toLowerCase()}
                  </button>
                  );
                })}
              </div>
            )}

            {/* Grid de productos */}
            {loadingProductos ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg">No hay productos en esta categoría.</p>
                <Button variant="outline" className="mt-4" onClick={() => handleSelectCategoria('todas')}>
                  Ver todos los productos
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {visibleProductos.map((product, idx) => (
                  <ProductCard
                    key={`${String(product.id ?? 'p')}-${idx}`}
                    product={product}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
              </div>
            )}

            {!loadingProductos && productos.length > 0 && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => navigate(
                    categoriaSeleccionada !== 'todas'
                      ? `/productos?categoria=${encodeURIComponent(categoriaSeleccionada)}`
                      : '/productos'
                  )}
                >
                  Ver todos los productos
                </Button>
              </div>
            )}
          </div>

          {/* ── SOLUCIONES / CATEGORÍAS ───────────────────────────────── */}
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6">
              Soluciones a tus necesidades
            </h2>

            {categoriasPadre.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {categoriasPadre.slice(0, 3).map((cat, index) => {
                    const categoryId = getCategoriaId(cat, index);
                    return (
                      <CategoryCard
                        key={categoryId}
                        category={{
                          id: categoryId,
                          name: cat.nombre,
                          image: getCategoryImage(cat.nombre),
                          media: cat.media || null,
                        }}
                      />
                    );
                  })}
                </div>
                {categoriasPadre.length > 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                    {categoriasPadre.slice(3).map((cat, index) => {
                      const categoryId = getCategoriaId(cat, index + 3);
                      return (
                        <CategoryCard
                          key={categoryId}
                          category={{
                            id: categoryId,
                            name: cat.nombre,
                            image: getCategoryImage(cat.nombre),
                            media: cat.media || null,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {FALLBACK_CATEGORIES.slice(0, 3).map(category => (
                    <CategoryCard key={category.id} category={category} />
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                  {FALLBACK_CATEGORIES.slice(3, 5).map(category => (
                    <CategoryCard key={category.id} category={category} />
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </section>

      <AboutUs />
      <AffiliateBanner />
    </>
  );
}
