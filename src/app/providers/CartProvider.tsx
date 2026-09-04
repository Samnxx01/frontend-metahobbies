import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { Product, CartItem, ProductId, CartSummary, ProductColor } from '../../types/common';
import {
  clearColorQty,
  isLegacyMultiColorLine,
  pruneColorQtyCache,
  resolveLegacyColorQtyMap,
  saveColorQty,
} from '@/app/presentation/components/carrito/cartColorQtyCache';
import { resolveCartItemColores } from '@/app/presentation/components/carrito/CartItemColores';
import carritoService, {
  type BackendCart,
  type BackendCartItem,
  type BackendCartTaxDetail,
  type DescuentoCodigo,
  type CartAlerta,
  getCarritoPublicId,
} from '../services/carritoService';
import { limpiarSesionCarritoObsoleto } from '@/app/utils/checkoutSessionCache';
import productosService from '../services/productosService';
import {
  mapColoresPermitidos,
  MENSAJE_PRODUCTO_REQUIERE_COLOR,
  resolverColorUnicoParaCarrito,
} from '@/app/utils/productColorUtils';

// ── Helpers de persistencia de imágenes ────────────────────────────────────
// El backend no almacena la URL de imagen en el carrito.
// Se guarda un mapa { productoId → imageUrl } en localStorage
// para poder mostrar imágenes después de recargar.

const IMAGES_KEY = 'cart_images';
const COLORS_KEY = 'cart_colors';

function saveImageCache(productoId: string, imageUrl: string): void {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[productoId] = imageUrl;
    localStorage.setItem(IMAGES_KEY, JSON.stringify(map));
  } catch { /* ignorar errores de localStorage */ }
}

function saveProductColorsCache(productoId: string, colores: ProductColor[]): void {
  try {
    if (!colores.length) return;
    const map = getColorCache();
    map[productoId] = colores;
    localStorage.setItem(COLORS_KEY, JSON.stringify(map));
  } catch { /* ignorar errores de localStorage */ }
}

function getImageCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function getColorCache(): Record<string, ProductColor[]> {
  try {
    const raw = localStorage.getItem(COLORS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ProductColor | ProductColor[]>;
    const map: Record<string, ProductColor[]> = {};
    for (const [productoId, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) map[productoId] = value.filter(Boolean);
      else if (value && typeof value === 'object') map[productoId] = [value];
    }
    return map;
  } catch { return {}; }
}

function pruneColorCache(activeProductoIds: string[]): void {
  try {
    const map = getColorCache();
    const pruned: Record<string, ProductColor[]> = {};
    for (const id of activeProductoIds) {
      if (map[id]?.length) pruned[id] = map[id];
    }
    localStorage.setItem(COLORS_KEY, JSON.stringify(pruned));
  } catch { /* ignorar errores de localStorage */ }
}

function findCartItem(
  items: CartItem[],
  productId: ProductId,
  colorPantone?: string,
  backendItemId?: string,
): CartItem | undefined {
  if (backendItemId) {
    return items.find((item) => item.backendItemId === backendItemId);
  }
  return items.find(
    (item) => item.id === productId && item.color?.pantone === colorPantone,
  );
}

// ── Mapeo backend → frontend ───────────────────────────────────────────────

function colorFromBackendItem(item: BackendCartItem): ProductColor | undefined {
  const pantone = String(item.colorPantone || '').trim();
  if (!pantone) return undefined;
  return {
    pantone,
    name: String(item.colorNombre || pantone).trim(),
    hex: String(item.colorHex || pantone).trim(),
  };
}

function mapBackendItem(item: BackendCartItem): CartItem {
  const images = getImageCache();
  const cacheColors = getColorCache();
  const colorBackend = colorFromBackendItem(item);
  const cacheForProduct = cacheColors[item.productoId] ?? [];
  const coloresItem = colorBackend ? [colorBackend] : cacheForProduct;
  const colorItem = colorBackend ?? (cacheForProduct.length === 1 ? cacheForProduct[0] : undefined);
  return {
    id: item.productoId,
    name: item.nombre,
    description: '',
    price: item.precioUnitario,
    originalPrice: item.descuentoItem?.tipo !== 'NINGUNO' ? item.precioUnitario : undefined,
    discountType: item.descuentoItem?.tipo || 'NINGUNO',
    discountValue: Number(item.descuentoItem?.valor || 0),
    grossSubtotal: Number(item.subtotalBruto || 0),
    netSubtotal: Number(item.subtotalNeto || 0),
    baseImponible: Number(item.baseImponible ?? item.subtotalNeto ?? 0),
    totalImpuestos: Number(item.totalImpuestos || 0),
    totalConImpuestos: Number(item.totalConImpuestos ?? item.subtotalNeto ?? 0),
    detalleImpuestos: item.detalleImpuestos ?? [],
    image: images[item.productoId] ?? '',
    category: '',
    color: colorItem,
    colors: coloresItem.length ? coloresItem : undefined,
    stock: item.stockDisponible,
    available: item.stockSuficiente,
    purchaseLimit: item.cantidadMaxima ?? null,
    createdAt: '',
    updatedAt: '',
    quantity: item.cantidad,
    addedAt: new Date().toISOString(),
    backendItemId: item._id || item.iud,
  };
}

function mapBackendCart(cart: BackendCart): CartItem[] {
  const items = cart.items.map(mapBackendItem);
  const productoIds = items.map((item) => String(item.id));
  pruneColorCache(productoIds);
  pruneColorQtyCache(productoIds);
  return items;
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
  totalImpuestos: number;
  detalleImpuestos: BackendCartTaxDetail[];
  totalBackend: number;
  alertas: CartAlerta[];
  loading: boolean;
  // Operaciones
  addToCart: (product: Product, quantity: number) => Promise<void>;
  removeFromCart: (productId: ProductId, colorPantone?: string, backendItemId?: string) => Promise<void>;
  updateQuantity: (
    productId: ProductId,
    colorPantone: string | undefined,
    newQuantity: number,
    backendItemId?: string,
  ) => Promise<void>;
  updateVariantQuantity: (item: CartItem, color: ProductColor, newQuantity: number) => Promise<void>;
  /** Agrega al carrito el mismo producto en OTRO tono (nueva línea; el backend suma cantidad si el tono ya existe). */
  addColorVariant: (item: CartItem, color: ProductColor, quantity?: number) => Promise<void>;
  /** Tonos disponibles cacheados para el producto (ver saveProductColorsCache en addToCart). */
  getAvailableColors: (productId: ProductId) => ProductColor[];
  clearCart: () => Promise<void>;
  aplicarDescuento: (codigo: string) => Promise<void>;
  removerDescuento: () => Promise<void>;
  sincronizar: () => Promise<void>;
  ensureBackendCart: () => Promise<string | null>;
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
  const [totalImpuestos, setTotalImpuestos] = useState(0);
  const [detalleImpuestos, setDetalleImpuestos] = useState<BackendCartTaxDetail[]>([]);
  const [totalBackend, setTotalBackend] = useState(0);
  const [alertas, setAlertas] = useState<CartAlerta[]>([]);
  const [loading, setLoading] = useState(false);

  // Aplica el estado del backend al estado local
  const applyBackendCart = useCallback((cart: BackendCart) => {
    const cartId = getCarritoPublicId(cart);
    // Solo enlazar operaciones de ítems a carritos ACTIVO persistidos (sin id = carrito eliminado).
    setBackendCartId(cart.estado === 'ACTIVO' && cartId ? cartId : null);
    setCartItems(mapBackendCart(cart));
    setTotalDescuentoCodigo(cart.totalDescuentoCodigo ?? 0);
    setTotalImpuestos(cart.totalImpuestos ?? 0);
    setDetalleImpuestos(cart.detalleImpuestos ?? []);
    setTotalBackend(cart.total ?? 0);
    setDescuentoAplicado(
      cart.codigoDescuentoAplicado && cart.descuentoCodigo
        ? { ...cart.descuentoCodigo, codigo: cart.codigoDescuentoAplicado }
        : null,
    );
  }, []);

  // Carga el carrito del backend al montar para usuario autenticado o invitado.
  useEffect(() => {
    setLoading(true);
    carritoService.obtenerOCrear()
      .then(applyBackendCart)
      .catch(() => { /* sin conexión: continuar en modo local */ })
      .finally(() => setLoading(false));
  }, [applyBackendCart]);

  // ── Operaciones de ítems ─────────────────────────────────────────────────

  const addToCart = useCallback(async (product: Product, quantity: number): Promise<void> => {
    const productoId = String(product.id);
    // El backend no almacena imagen/color: persistimos en caché local por producto.
    if (product.image) saveImageCache(productoId, product.image);

    let colorToSend = product.color;
    if (!colorToSend) {
      const data = await productosService.obtenerProductoPublico(productoId);
      const relacion = data.productoVentaRelacion;
      const coloresCatalogo = mapColoresPermitidos(
        relacion?.coloresPermitidos || [],
        relacion?.cantidadColoresRender,
      );
      if (coloresCatalogo.length) saveProductColorsCache(productoId, coloresCatalogo);
      colorToSend = resolverColorUnicoParaCarrito(coloresCatalogo) ?? undefined;
      if (!colorToSend && coloresCatalogo.length > 1) {
        throw new Error(MENSAJE_PRODUCTO_REQUIERE_COLOR);
      }
    } else {
      saveProductColorsCache(productoId, [colorToSend]);
    }

    const updated = await carritoService.agregarItem(
      backendCartId || '',
      String(product.id),
      quantity,
      colorToSend ? { color: colorToSend } : undefined,
    );
    applyBackendCart(updated);
  }, [applyBackendCart, backendCartId]);

  const removeFromCart = useCallback(async (
    productId: ProductId,
    colorPantone?: string,
    backendItemId?: string,
  ): Promise<void> => {
    if (!backendCartId) throw new Error('No hay carrito activo');
    const item = findCartItem(cartItems, productId, colorPantone, backendItemId);
    if (!item?.backendItemId) {
      throw new Error('No se encontró el ítem en el carrito. Recarga la página e intenta de nuevo.');
    }
    const updated = await carritoService.eliminarItem(backendCartId, item.backendItemId);
    applyBackendCart(updated);
  }, [backendCartId, cartItems, applyBackendCart]);

  const addColorVariant = useCallback(async (
    item: CartItem,
    color: ProductColor,
    quantity = 1,
  ): Promise<void> => {
    // El backend (agregarItem) ya distingue por productoId+colorPantone: si el
    // tono ya está en el carrito suma cantidad, si es otro tono crea una línea nueva.
    const updated = await carritoService.agregarItem(
      backendCartId || '',
      String(item.id),
      quantity,
      { color },
    );
    applyBackendCart(updated);
  }, [backendCartId, applyBackendCart]);

  const getAvailableColors = useCallback((productId: ProductId): ProductColor[] => {
    return getColorCache()[String(productId)] || [];
  }, []);

  const splitLegacyMultiColorItem = useCallback(async (
    item: CartItem,
    qtyMap: Record<string, number>,
  ): Promise<void> => {
    if (!backendCartId || !item.backendItemId) return;
    const colores = resolveCartItemColores(item);
    if (item.backendItemId) {
      await carritoService.eliminarItem(backendCartId, item.backendItemId);
    }
    for (const color of colores) {
      const qty = Number(qtyMap[color.pantone] || 0);
      if (qty > 0) {
        await carritoService.agregarItem(backendCartId, String(item.id), qty, { color });
      }
    }
    clearColorQty(String(item.id));
    const cart = await carritoService.obtenerOCrear();
    applyBackendCart(cart);
  }, [backendCartId, applyBackendCart]);

  const updateQuantity = useCallback(async (
    productId: ProductId,
    colorPantone: string | undefined,
    newQuantity: number,
    backendItemId?: string,
  ): Promise<void> => {
    if (newQuantity <= 0) {
      await removeFromCart(productId, colorPantone, backendItemId);
      return;
    }

    const item = findCartItem(cartItems, productId, colorPantone, backendItemId);
    if (!backendCartId || !item?.backendItemId) return;
    const updated = await carritoService.actualizarCantidad(backendCartId, item.backendItemId, newQuantity);
    applyBackendCart(updated);
  }, [backendCartId, cartItems, removeFromCart, applyBackendCart]);

  const updateVariantQuantity = useCallback(async (
    item: CartItem,
    color: ProductColor,
    newQuantity: number,
  ): Promise<void> => {
    if (!backendCartId) return;

    if (isLegacyMultiColorLine(item)) {
      const baseMap = resolveLegacyColorQtyMap(item) ?? {};
      const qtyMap = { ...baseMap, [color.pantone]: Math.max(0, newQuantity) };
      const total = Object.values(qtyMap).reduce((acc, n) => acc + Number(n || 0), 0);
      if (total <= 0) {
        await removeFromCart(item.id, undefined, item.backendItemId);
        clearColorQty(String(item.id));
        return;
      }
      saveColorQty(String(item.id), color.pantone, Math.max(0, newQuantity));
      await splitLegacyMultiColorItem(item, qtyMap);
      return;
    }

    const pantone = color.pantone;
    const line = cartItems.find(
      (row) => String(row.id) === String(item.id)
        && row.backendItemId === item.backendItemId
        && row.color?.pantone === pantone,
    ) ?? findCartItem(cartItems, item.id, pantone, item.backendItemId);

    if (newQuantity <= 0) {
      if (line) await removeFromCart(item.id, pantone, line.backendItemId);
      return;
    }

    if (line?.backendItemId) {
      const updated = await carritoService.actualizarCantidad(backendCartId, line.backendItemId, newQuantity);
      applyBackendCart(updated);
      return;
    }

    await carritoService.agregarItem(backendCartId, String(item.id), newQuantity, { color });
    const cart = await carritoService.obtenerOCrear();
    applyBackendCart(cart);
  }, [
    backendCartId,
    cartItems,
    removeFromCart,
    applyBackendCart,
    splitLegacyMultiColorItem,
  ]);

  const clearCart = useCallback(async (): Promise<void> => {
    if (!backendCartId) {
      setCartItems([]);
      localStorage.removeItem(COLORS_KEY);
      return;
    }
    try {
      const cart = await carritoService.obtenerPorIdSeguro(backendCartId);
      if (!cart) {
        limpiarSesionCarritoObsoleto();
        const updated = await carritoService.obtenerOCrear();
        applyBackendCart(updated);
        setCartItems([]);
        localStorage.removeItem(COLORS_KEY);
        return;
      }
      const estado = String(cart.estado || '').toUpperCase();
      if (estado !== 'ACTIVO') {
        const updated = await carritoService.obtenerOCrear();
        applyBackendCart(updated);
        setCartItems([]);
        localStorage.removeItem(COLORS_KEY);
        return;
      }
      const updated = await carritoService.vaciar(backendCartId);
      applyBackendCart(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || '');
      if (/\[404\]/i.test(msg) && /carrito no encontrado/i.test(msg)) {
        limpiarSesionCarritoObsoleto();
      }
      const updated = await carritoService.obtenerOCrear().catch(() => null);
      if (updated) applyBackendCart(updated);
      setCartItems([]);
      localStorage.removeItem(COLORS_KEY);
    }
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

  const ensureBackendCart = useCallback(async (): Promise<string | null> => {
    if (backendCartId) {
      try {
        const synced = await carritoService.sincronizar(backendCartId);
        applyBackendCart(synced.carrito);
        setAlertas(synced.alertas);
        return backendCartId;
      } catch {
        /* Re-resolver por sesión si el id en contexto quedó obsoleto */
      }
    }

    const cart = await carritoService.obtenerOCrear();
    const carritoId = getCarritoPublicId(cart);
    if (!carritoId) {
      applyBackendCart(cart);
      return null;
    }

    const synced = await carritoService.sincronizar(carritoId);
    applyBackendCart(synced.carrito);
    setAlertas(synced.alertas);
    return carritoId;
  }, [applyBackendCart, backendCartId]);

  // ── Resumen local ────────────────────────────────────────────────────────

  const cartSummary = useMemo((): CartSummary => {
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const tax = totalImpuestos;
    const shipping = subtotal > 100000 ? 0 : 15000;
    const total = totalBackend > 0 ? totalBackend : subtotal + tax + shipping;
    return { totalItems, subtotal, tax, shipping, total };
  }, [cartItems, totalBackend, totalImpuestos]);

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
    totalImpuestos,
    detalleImpuestos,
    totalBackend,
    alertas,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateVariantQuantity,
    addColorVariant,
    getAvailableColors,
    clearCart,
    aplicarDescuento,
    removerDescuento,
    sincronizar,
    ensureBackendCart,
    getItemCount,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
