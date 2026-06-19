import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import CartQuantityInput from '@/app/presentation/components/carrito/CartQuantityInput';
import productosService, {
  getProductoDescripcionCompleta,
  mapProducto,
  type BackendProducto,
} from '@/app/services/productosService';
import { ShoppingCart, Heart, Check, ArrowLeft } from 'lucide-react';
import { useCart } from '../../../providers/CartProvider';
import type { Product as CommonProduct } from '../../../../types/common';
import { formatCOP } from '@/lib/utils';

const PLACEHOLDER = 'https://placehold.co/500x500/f3f4f6/a3a3a3?text=IMG';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const backendId = (row: { _id?: string; iud?: string; id?: string } | null | undefined): string =>
  String(row?.iud || row?._id || row?.id || '');

const mediaSrc = (url: string): string => {
  const value = String(url || '').trim();
  if (!value || value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (!value.startsWith('/api') || !API_BASE_URL.startsWith('http')) return value;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${value}`;
};

const categoriaLabel = (producto?: BackendProducto | null): string => {
  const categoria = producto?.productoVentaRelacion?.categoria ?? producto?.categoria;
  if (typeof categoria === 'object' && categoria !== null) return String(categoria.nombre || '');
  if (typeof categoria === 'string') return categoria;
  return producto?.productoVentaRelacion?.tipo || producto?.tipo || 'PRODUCTO';
};

const imagenesProducto = (producto: BackendProducto): string[] => {
  const relacion = producto.productoVentaRelacion;
  const mediaImagenes = relacion?.media?.filter((item) => item.tipo === 'image').map((item) => item.url) || [];
  const imagenesRelacion = Array.isArray(relacion?.imagenes) ? relacion.imagenes : [];
  const imagenesBase = Array.isArray(producto.imagenes) ? producto.imagenes : [];
  return Array.from(new Set([...mediaImagenes, ...imagenesRelacion, ...imagenesBase]
    .filter(Boolean)
    .map(mediaSrc)));
};

export default function DetalleProducto(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [producto, setProducto] = useState<BackendProducto | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>(PLACEHOLDER);
  const [selectedColor, setSelectedColor] = useState<{ nombre: string; valor: string } | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productosService.obtenerProductoPublico(id)
      .then((data) => {
        setProducto(data);
        const imagenes = imagenesProducto(data);
        setSelectedImage(imagenes[0] || PLACEHOLDER);
        const colores = data.productoVentaRelacion?.coloresPermitidos || [];
        setSelectedColor(colores[0] ? {
          nombre: String(colores[0].nombre || 'Color 1'),
          valor: String(colores[0].valor || '#000000'),
        } : null);
      })
      .catch(() => {
        toast.error('No se pudo cargar el producto.');
        navigate('/productos', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const productoCard = useMemo(() => (producto ? mapProducto(producto) : null), [producto]);
  const descripcionCompleta = useMemo(
    () => (producto ? getProductoDescripcionCompleta(producto) : ''),
    [producto],
  );
  const imagenes = useMemo(() => (producto ? imagenesProducto(producto) : []), [producto]);
  const colores = useMemo(() => (
    producto?.productoVentaRelacion?.coloresPermitidos || []
  ).map((color, index) => ({
    nombre: String(color.nombre || `Color ${index + 1}`),
    valor: String(color.valor || '#000000'),
  })), [producto]);

  const handleAddToCart = async (): Promise<void> => {
    if (!productoCard) return;
    const productToAdd: CommonProduct = {
      id: productoCard.id,
      name: productoCard.name,
      description: productoCard.description || '',
      price: productoCard.price,
      image: selectedImage,
      category: productoCard.category || '',
      stock: 100,
      available: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: selectedColor ? {
        name: selectedColor.nombre,
        pantone: selectedColor.valor,
        hex: selectedColor.valor,
      } : undefined,
    };
    setIsAdding(true);
    try {
      await addToCart(productToAdd, quantity);
      setIsAdded(true);
      toast.success(`${productoCard.name} agregado al carrito`, { autoClose: 1500 });
      setTimeout(() => setIsAdded(false), 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo agregar el producto al carrito.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    target.src = PLACEHOLDER;
  };

  if (loading) {
    return <div className="container max-w-7xl mx-auto px-4 py-12">Cargando producto...</div>;
  }

  if (!producto || !productoCard) {
    return <div className="container max-w-7xl mx-auto px-4 py-12">Producto no encontrado.</div>;
  }

  return (
    <div className="py-8 md:py-16 bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 bg-card shadow-xl rounded-xl p-4 sm:p-6 md:p-8 border border-border">
          <div>
            <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden mb-4 bg-muted/50">
              <img
                src={selectedImage}
                alt={productoCard.name}
                className="w-full h-full object-contain transition-transform duration-300 ease-in-out hover:scale-[1.03]"
                onError={handleImageError}
              />
            </div>

            {imagenes.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {imagenes.slice(0, 8).map((img, index) => (
                  <img
                    key={`${img}-${index}`}
                    src={img}
                    alt={`${productoCard.name} ${index + 1}`}
                    onClick={() => setSelectedImage(img)}
                    className={`w-full h-16 md:h-24 object-cover rounded-lg cursor-pointer border-2 transition-all ${
                      selectedImage === img ? 'border-primary shadow-md' : 'border-border/50 hover:border-border'
                    }`}
                    onError={handleImageError}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Badge className="text-xs uppercase bg-secondary text-secondary-foreground">
              {categoriaLabel(producto)}
            </Badge>

            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-foreground">
              {productoCard.name}
            </h1>

            <p className="text-3xl font-bold text-primary">
              {formatCOP(productoCard.price)}
            </p>

            <Separator />

            {colores.length > 0 && (
              <div>
                <p className="text-lg font-semibold mb-2 text-foreground">
                  Color: <span className="font-normal text-muted-foreground">{selectedColor?.nombre}</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  {colores.map((color) => (
                    <button
                      key={`${color.nombre}-${color.valor}`}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-9 h-9 rounded-full cursor-pointer border-2 transition-all flex items-center justify-center ${
                        selectedColor?.valor === color.valor ? 'ring-2 ring-offset-2 ring-primary border-primary' : 'border-border'
                      }`}
                      style={{ backgroundColor: color.valor }}
                      title={color.nombre}
                    >
                      {selectedColor?.valor === color.valor && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {descripcionCompleta ? (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">Descripcion</h2>
                <p className="text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                  {descripcionCompleta}
                </p>
              </div>
            ) : (
              <p className="text-base text-muted-foreground italic">
                Sin descripcion disponible.
              </p>
            )}

            <Separator />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <CartQuantityInput
                value={quantity}
                onChange={setQuantity}
                min={1}
              />

              <Button
                onClick={() => { void handleAddToCart(); }}
                size="lg"
                className={`flex-1 py-2 text-base font-semibold transition-all duration-300 ${
                  isAdded ? 'bg-green-600 hover:bg-green-700 text-white' : ''
                }`}
                disabled={isAdded || isAdding}
              >
                {isAdded ? <Check className="w-5 h-5 mr-2" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
                {isAdding ? 'Agregando...' : isAdded ? 'Agregado' : 'Agregar al Carrito'}
              </Button>

              <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg hover:border-button hover:text-button-foreground transition-colors">
                <Heart className="w-5 h-5" />
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
