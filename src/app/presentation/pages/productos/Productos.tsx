import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../../providers/CartProvider';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import ProductCard from '../../components/common/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { Product as ComponentProduct } from '../../../../types/components';
import type { Product as CommonProduct } from '../../../../types/common';
import productosService, {
  type BackendCategoria,
  getCategoriaId,
  resolverCategoriaDesdeQuery,
} from '../../../services/productosService';

interface SortOption {
  value: string;
  label: string;
}

const sortOptions: SortOption[] = [
  { value: 'default', label: 'Relevancia' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'name-asc', label: 'A-Z (Nombre)' },
  { value: 'name-desc', label: 'Z-A (Nombre)' },
];

function ProductCardSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="w-full h-[320px] rounded-lg bg-muted" />
      <div className="w-3/4 h-4 mx-auto rounded bg-muted" />
      <div className="w-1/2 h-4 mx-auto rounded bg-muted" />
    </div>
  );
}

export default function Productos(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  const [categorias, setCategorias] = useState<BackendCategoria[]>([]);
  const [productos, setProductos] = useState<ComponentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('default');
  const [page, setPage] = useState<number>(1);

  const productsPerPage = 12;
  const categoriaQuery = searchParams.get('categoria');

  const categoriaActivaId = useMemo(
    () => resolverCategoriaDesdeQuery(categoriaQuery, categorias),
    [categoriaQuery, categorias]
  );

  const categoriaActiva = useMemo(
    () => categorias.find((c) => getCategoriaId(c) === categoriaActivaId),
    [categorias, categoriaActivaId]
  );

  useEffect(() => {
    productosService
      .listarCategorias()
      .then((data) => setCategorias(data.filter((c) => c.estado !== false)))
      .catch(() => toast.error('No se pudieron cargar las categorías'));
  }, []);

  const cargarProductos = useCallback(async (categoriaId?: string) => {
    setLoading(true);
    try {
      const data = await productosService.listarParaCatalogo(categoriaId);
      setProductos(data);
    } catch {
      toast.error('Error cargando productos');
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos(categoriaActivaId);
    setPage(1);
  }, [categoriaActivaId, cargarProductos]);

  const filteredAndSortedProducts = useMemo(() => {
    const list = [...productos];
    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }
    return list;
  }, [productos, sortBy]);

  const currentProducts = useMemo(() => {
    const startIndex = (page - 1) * productsPerPage;
    return filteredAndSortedProducts.slice(startIndex, startIndex + productsPerPage);
  }, [page, filteredAndSortedProducts]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / productsPerPage));

  const handleCategoryChange = (categoriaId: string | null): void => {
    if (!categoriaId) {
      setSearchParams({});
    } else {
      setSearchParams({ categoria: categoriaId });
    }
    setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (value: string): void => {
    setSortBy(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number): void => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      toast.error(message);
    }
  };

  const tituloCategoria = categoriaActiva?.nombre
    ? String(categoriaActiva.nombre).toLowerCase()
    : null;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2 text-foreground">
        Nuestros Productos
      </h1>
      {tituloCategoria && (
        <p className="text-muted-foreground mb-6 capitalize">
          Categoría: {tituloCategoria}
        </p>
      )}
      {!tituloCategoria && <div className="mb-6" />}

      <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex gap-2 flex-wrap max-w-full">
          <Badge
            onClick={() => handleCategoryChange(null)}
            variant={!categoriaActivaId ? 'default' : 'outline'}
            className={`cursor-pointer px-4 py-1.5 text-sm font-medium transition-colors ${
              !categoriaActivaId
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-input hover:bg-muted/50 text-foreground'
            }`}
          >
            Todos
          </Badge>
          {categorias.map((cat, index) => {
            const id = getCategoriaId(cat, index);
            const selected = categoriaActivaId === id;
            return (
              <Badge
                key={id}
                onClick={() => handleCategoryChange(id)}
                variant={selected ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                  selected
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border-input hover:bg-muted/50 text-foreground'
                }`}
              >
                {String(cat.nombre || '').toLowerCase()}
              </Badge>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <Label htmlFor="sort-select" className="text-foreground">Ordenar por:</Label>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger id="sort-select" className="w-[180px] h-9 bg-background border-input">
              <SelectValue placeholder="Relevancia" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : currentProducts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No hay productos en esta categoría.</p>
          <Button variant="outline" className="mt-4" onClick={() => handleCategoryChange(null)}>
            Ver todos los productos
          </Button>
          <Button variant="link" className="mt-2 block mx-auto" onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {currentProducts.map((product, idx) => (
            <ProductCard
              key={`${String(product.id)}-${idx}`}
              product={product}
              onAddToCart={() => handleAddToCart(product)}
            />
          ))}
        </div>
      )}

      {!loading && filteredAndSortedProducts.length > productsPerPage && (
        <div className="flex justify-center items-center gap-2 mt-10">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

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
