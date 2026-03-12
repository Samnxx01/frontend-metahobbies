import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { Product, CartItem, ProductId, CartSummary } from '../../types/common';
import carritoService, {
  type BackendCart,
  type BackendCartItem,
  type DescuentoCodigo,
  type CartAlerta,
} from '../services/carritoService';

// ── Helpers de persistencia de imágenes ────────────────────────────────────
// El backend no almacena la URL de imagen en el carrito.
// Se guarda un mapa { productoId → imageUrl } en localStorage
// para poder mostrar imágenes después de recargar.

const IMAGES_KEY = 'cart_images';

function saveImageCache(productoId: string, imageUrl: string): void {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[productoId] = imageUrl;
    localStorage.setItem(IMAGES_KEY, JSON.stringify(map));
  } catch { /* ignorar errores de localStorage */ }
}

function getImageCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ── Mapeo backend → frontend ───────────────────────────────────────────────

function mapBackendItem(item: BackendCartItem): CartItem {
  const images = getImageCache();
  return {
    id: item.productoId,
    name: item.nombre,
    description: '',
    price: item.precioUnitario,
    image: images[item.productoId] ?? '',
    category: '',
    stock: item.stockDisponible,
    available: item.stockSuficiente,
    createdAt: '',
    updatedAt: '',
    quantity: item.cantidad,
    addedAt: new Date().toISOString(),
    backendItemId: item._id,
  };
}

function mapBackendCart(cart: BackendCart): CartItem[] {
  return cart.items.map(mapBackendItem);
}

// ── Tipos del contexto ─────────────────────────────────────────────────────

interface CartContextType {
  // Items y resumen
  cartItems: CartItem[];
  cartSummary: CartSummary;
  // Estado del backend
  backendCartId: string | null;
  descuentoAplicado: (DescuentoCodigo & { codigo: string }) | null;
  totalDescuentoCodigo: number;
  totalBackend: number;
  alertas: CartAlerta[];
  loading: boolean;
  // Operaciones
  addToCart: (product: Product, quantity: number) => Promise<void>;
  removeFromCart: (productId: ProductId, colorPantone?: string) => Promise<void>;
  updateQuantity: (productId: ProductId, colorPantone: string | undefined, newQuantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  aplicarDescuento: (codigo: string) => Promise<void>;
  removerDescuento: () => Promise<void>;
  sincronizar: () => Promise<void>;
  // Utilidades
  getItemCount: (productId: ProductId, colorPantone?: string) => number;
  isInCart: (productId: ProductId, colorPantone?: string) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}

// ── Provider ───────────────────────────────────────────────────────────────

interface CartProviderProps { children: ReactNode }

export default function CartProvider({ children }: CartProviderProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [backendCartId, setBackendCartId] = useState<string | null>(null);
  const [descuentoAplicado, setDescuentoAplicado] = useState<(DescuentoCodigo & { codigo: string }) | null>(null);
  const [totalDescuentoCodigo, setTotalDescuentoCodigo] = useState(0);
  const [totalBackend, setTotalBackend] = useState(0);
  const [alertas, setAlertas] = useState<CartAlerta[]>([]);
  const [loading, setLoading] = useState(false);

  // Aplica el estado del backend al estado local
  const applyBackendCart = useCallback((cart: BackendCart) => {
    setBackendCartId(cart._id);
    setCartItems(mapBackendCart(cart));
    setTotalDescuentoCodigo(cart.totalDescuentoCodigo ?? 0);
    setTotalBackend(cart.total ?? 0);
    setDescuentoAplicado(
      cart.codigoDescuentoAplicado && cart.descuentoCodigo
        ? { ...cart.descuentoCodigo, codigo: cart.codigoDescuentoAplicado }
        : null,
    );
  }, []);

  // Carga el carrito del backend al montar (solo si hay token)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    carritoService.obtenerOCrear()
      .then(applyBackendCart)
      .catch(() => { /* sin conexión: continuar en modo local */ })
      .finally(() => setLoading(false));
  }, [applyBackendCart]);

  // ── Operaciones de ítems ─────────────────────────────────────────────────

  const addToCart = useCallback(async (product: Product, quantity: number): Promise<void> => {
    // 1. Guardar imagen en caché local (el backend no la almacena)
    if (product.image) saveImageCache(String(product.id), product.image);

    // 2. Actualización optimista en local
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id && i.color?.pantone === product.color?.pantone);
      if (existing) {
        return prev.map(i =>
          i.id === product.id && i.color?.pantone === product.color?.pantone
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { ...product, quantity, addedAt: new Date().toISOString() }];
    });

    // 3. Sync con backend si hay carrito activo
    if (!backendCartId) return;
    try {
      const updated = await carritoService.agregarItem(backendCartId, String(product.id), quantity);
      applyBackendCart(updated);
    } catch (err: any) {
      // Revertir optimismo ante error de stock
      setCartItems(prev => {
        const existing = prev.find(i => i.id === product.id);
        if (!existing) return prev;
        const reverted = existing.quantity - quantity;
        if (reverted <= 0) return prev.filter(i => i.id !== product.id);
        return prev.map(i => i.id === product.id ? { ...i, quantity: reverted } : i);
      });
      throw err;
    }
  }, [backendCartId, applyBackendCart]);

  const removeFromCart = useCallback(async (productId: ProductId, colorPantone?: string): Promise<void> => {
    const item = cartItems.find(i => i.id === productId && i.color?.pantone === colorPantone);

    // Actualización optimista
    setCartItems(prev => prev.filter(i => !(i.id === productId && i.color?.pantone === colorPantone)));

    if (!backendCartId || !item?.backendItemId) return;
    try {
      const updated = await carritoService.eliminarItem(backendCartId, item.backendItemId);
      applyBackendCart(updated);
    } catch {
      // Revertir si falla
      if (item) setCartItems(prev => [...prev, item]);
    }
  }, [backendCartId, cartItems, applyBackendCart]);

  const updateQuantity = useCallback(async (
    productId: ProductId,
    colorPantone: string | undefined,
    newQuantity: number,
  ): Promise<void> => {
    if (newQuantity <= 0) {
      await removeFromCart(productId, colorPantone);
      return;
    }

    const item = cartItems.find(i => i.id === productId && i.color?.pantone === colorPantone);
    const prevQuantity = item?.quantity ?? newQuantity;

    // Actualización optimista
    setCartItems(prev =>
      prev.map(i =>
        i.id === productId && i.color?.pantone === colorPantone
          ? { ...i, quantity: newQuantity }
          : i,
      ),
    );

    if (!backendCartId || !item?.backendItemId) return;
    try {
      const updated = await carritoService.actualizarCantidad(backendCartId, item.backendItemId, newQuantity);
      applyBackendCart(updated);
    } catch {
      // Revertir
      setCartItems(prev =>
        prev.map(i =>
          i.id === productId && i.color?.pantone === colorPantone
            ? { ...i, quantity: prevQuantity }
            : i,
        ),
      );
    }
  }, [backendCartId, cartItems, removeFromCart, applyBackendCart]);

  const clearCart = useCallback(async (): Promise<void> => {
    setCartItems([]);
    setDescuentoAplicado(null);
    setTotalDescuentoCodigo(0);
    if (!backendCartId) return;
    try {
      const updated = await carritoService.vaciar(backendCartId);
      applyBackendCart(updated);
    } catch { /* ignorar — local ya está limpio */ }
  }, [backendCartId, applyBackendCart]);

  // ── Descuentos ───────────────────────────────────────────────────────────

  const aplicarDescuento = useCallback(async (codigo: string): Promise<void> => {
    if (!backendCartId) throw new Error('No hay carrito activo');
    const updated = await carritoService.aplicarDescuento(backendCartId, codigo);
    applyBackendCart(updated);
  }, [backendCartId, applyBackendCart]);

  const removerDescuento = useCallback(async (): Promise<void> => {
    if (!backendCartId) return;
    const updated = await carritoService.removerDescuento(backendCartId);
    applyBackendCart(updated);
  }, [backendCartId, applyBackendCart]);

  // ── Sincronización ───────────────────────────────────────────────────────

  const sincronizar = useCallback(async (): Promise<void> => {
    if (!backendCartId) return;
    const { carrito, alertas: nuevasAlertas } = await carritoService.sincronizar(backendCartId);
    applyBackendCart(carrito);
    setAlertas(nuevasAlertas);
  }, [backendCartId, applyBackendCart]);

  // ── Resumen local ────────────────────────────────────────────────────────

  const cartSummary = useMemo((): CartSummary => {
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const tax = subtotal * 0.19;
    const shipping = subtotal > 100000 ? 0 : 15000;
    const total = subtotal + tax + shipping;
    return { totalItems, subtotal, tax, shipping, total };
  }, [cartItems]);

  // ── Utilidades ───────────────────────────────────────────────────────────

  const getItemCount = useCallback((productId: ProductId, colorPantone?: string): number => {
    const item = cartItems.find(i => i.id === productId && i.color?.pantone === colorPantone);
    return item ? item.quantity : 0;
  }, [cartItems]);

  const isInCart = useCallback((productId: ProductId, colorPantone?: string): boolean => {
    return cartItems.some(i => i.id === productId && i.color?.pantone === colorPantone);
  }, [cartItems]);

  // ── Valor del contexto ───────────────────────────────────────────────────

  const value: CartContextType = {
    cartItems,
    cartSummary,
    backendCartId,
    descuentoAplicado,
    totalDescuentoCodigo,
    totalBackend,
    alertas,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    aplicarDescuento,
    removerDescuento,
    sincronizar,
    getItemCount,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
