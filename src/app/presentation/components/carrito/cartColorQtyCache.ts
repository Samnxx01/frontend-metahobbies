import type { CartItem, ProductColor } from '@/types/common';
import { resolveCartItemColores } from '@/app/presentation/components/carrito/CartItemColores';

const QTY_KEY = 'cart_color_qty';

type ColorQtyMap = Record<string, number>;

function readAll(): Record<string, ColorQtyMap> {
  try {
    const raw = localStorage.getItem(QTY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ColorQtyMap>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ColorQtyMap>): void {
  try {
    localStorage.setItem(QTY_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function pruneColorQtyCache(activeProductoIds: string[]): void {
  const map = readAll();
  const pruned: Record<string, ColorQtyMap> = {};
  for (const id of activeProductoIds) {
    if (map[id]) pruned[id] = map[id];
  }
  writeAll(pruned);
}

export function saveColorQty(productoId: string, pantone: string, quantity: number): void {
  const map = readAll();
  const entry = { ...(map[productoId] ?? {}) };
  if (quantity <= 0) delete entry[pantone];
  else entry[pantone] = quantity;
  if (Object.keys(entry).length === 0) delete map[productoId];
  else map[productoId] = entry;
  writeAll(map);
}

export function clearColorQty(productoId: string): void {
  const map = readAll();
  delete map[productoId];
  writeAll(map);
}

function defaultLegacyQtyMap(item: CartItem, colores: ProductColor[]): ColorQtyMap {
  const map: ColorQtyMap = {};
  colores.forEach((color, index) => {
    map[color.pantone] = index === 0 ? item.quantity : 0;
  });
  return map;
}

export function resolveLegacyColorQtyMap(item: CartItem): ColorQtyMap | null {
  const colores = resolveCartItemColores(item);
  if (colores.length <= 1) return null;

  const stored = readAll()[String(item.id)];
  if (stored) {
    const total = colores.reduce((acc, color) => acc + Number(stored[color.pantone] || 0), 0);
    if (total === item.quantity) return stored;
  }
  return defaultLegacyQtyMap(item, colores);
}

export function isLegacyMultiColorLine(item: CartItem): boolean {
  return resolveLegacyColorQtyMap(item) != null;
}

export type CartProductGroup = {
  productId: string;
  name: string;
  image: string;
  stock?: number | null;
  lines: CartItem[];
};

export function groupCartItemsByProduct(items: CartItem[]): CartProductGroup[] {
  const groups: CartProductGroup[] = [];
  for (const item of items) {
    const productId = String(item.id);
    let group = groups.find((g) => g.productId === productId);
    if (!group) {
      group = {
        productId,
        name: item.name,
        image: item.image,
        stock: item.stock,
        lines: [],
      };
      groups.push(group);
    }
    group.lines.push(item);
  }
  return groups;
}
