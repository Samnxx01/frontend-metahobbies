import type { CartItem, ProductColor } from '@/types/common';
import CartQuantityInput from '@/app/presentation/components/carrito/CartQuantityInput';
import { resolveCartItemColores } from '@/app/presentation/components/carrito/CartItemColores';
import { resolveLegacyColorQtyMap } from '@/app/presentation/components/carrito/cartColorQtyCache';

export type CartVariantLine = {
  color: ProductColor;
  quantity: number;
  lineKey: string;
};

function isPlaceholderColor(color: ProductColor | undefined): boolean {
  if (!color) return true;
  return color.pantone === '_default' && color.name === '—';
}

export function resolveCartVariantLines(item: CartItem): CartVariantLine[] {
  const legacyMap = resolveLegacyColorQtyMap(item);
  if (legacyMap) {
    const colores = resolveCartItemColores(item);
    return colores.map((color) => ({
      color,
      quantity: Number(legacyMap[color.pantone] || 0),
      lineKey: `${item.backendItemId || item.id}-${color.pantone}`,
    }));
  }

  const colores = resolveCartItemColores(item);
  const color = colores[0] || item.color;
  if (!color || isPlaceholderColor(color)) {
    return [{
      color: { pantone: '_default', name: '—', hex: '#ccc' },
      quantity: item.quantity,
      lineKey: item.backendItemId || String(item.id),
    }];
  }

  return [{
    color,
    quantity: item.quantity,
    lineKey: item.backendItemId || `${item.id}-${color.pantone}`,
  }];
}

type Props = {
  item: CartItem;
  compact?: boolean;
  max?: number | null;
  onQuantityChange: (color: ProductColor, newQuantity: number) => void;
};

export default function CartItemVariantQuantities({
  item,
  compact = false,
  max = null,
  onQuantityChange,
}: Props): React.ReactElement {
  const lines = resolveCartVariantLines(item).filter(
    (line) => line.quantity > 0 || !resolveLegacyColorQtyMap(item),
  );
  const multi = lines.length > 1;

  return (
    <div className={`space-y-2 ${multi ? 'mt-1' : ''}`.trim()}>
      {lines.map((line) => {
        const showColor = !isPlaceholderColor(line.color);
        const rowBordered = multi || (compact && showColor);

        return (
          <div
            key={line.lineKey}
            className={
              rowBordered
                ? 'flex items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1.5'
                : showColor
                  ? 'flex items-center justify-between gap-2'
                  : ''
            }
          >
            {showColor ? (
              <span
                className={`inline-flex items-center gap-1.5 shrink-0 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}
              >
                <span
                  className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} rounded-full border border-border shrink-0`}
                  style={{ backgroundColor: line.color.hex || undefined }}
                  title={line.color.name}
                />
                {line.color.name}
              </span>
            ) : null}
            <CartQuantityInput
              value={line.quantity}
              min={0}
              max={max}
              size="sm"
              className="rounded-md"
              onChange={(newQuantity) => onQuantityChange(line.color, newQuantity)}
            />
          </div>
        );
      })}
    </div>
  );
}
