import type { CartItem, ProductColor } from '@/types/common';
import CartQuantityInput from '@/app/presentation/components/carrito/CartQuantityInput';
import { resolveCartItemColores } from '@/app/presentation/components/carrito/CartItemColores';
import { resolveLegacyColorQtyMap } from '@/app/presentation/components/carrito/cartColorQtyCache';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';

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
  /** Tonos disponibles del producto (catálogo); si hay más de uno se puede elegir otro para agregarlo como línea nueva. */
  availableColors?: ProductColor[];
  /** Se dispara al elegir un tono distinto al actual desde el selector. */
  onAddColor?: (color: ProductColor) => void;
};

export default function CartItemVariantQuantities({
  item,
  compact = false,
  max = null,
  onQuantityChange,
  availableColors = [],
  onAddColor,
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
            {showColor ? (() => {
              const otrosColores = availableColors.filter(
                (c) => c.pantone.toUpperCase() !== line.color.pantone.toUpperCase(),
              );
              const swatchClass = `inline-flex items-center gap-1.5 shrink-0 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`;
              const dot = (
                <span
                  className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} rounded-full border border-border shrink-0`}
                  style={{ backgroundColor: line.color.hex || undefined }}
                  title={line.color.name}
                />
              );

              if (!onAddColor || otrosColores.length === 0) {
                return (
                  <span className={swatchClass}>
                    {dot}
                    {line.color.name}
                  </span>
                );
              }

              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={`${swatchClass} rounded-md hover:bg-muted/60 px-1 -mx-1`}>
                      {dot}
                      {line.color.name}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-2">
                    <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">Agregar otro color</p>
                    <div className="space-y-0.5">
                      {otrosColores.map((color) => (
                        <button
                          key={color.pantone}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => onAddColor(color)}
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-border shrink-0"
                            style={{ backgroundColor: color.hex || undefined }}
                          />
                          {color.name}
                          {lines.some((l) => l.color.pantone.toUpperCase() === color.pantone.toUpperCase()) && (
                            <Check className="ml-auto h-3.5 w-3.5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })() : null}
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
