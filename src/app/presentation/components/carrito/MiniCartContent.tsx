import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { appendPublicAttributionToInternalPath, capturePublicAttributionFromSearch } from '@/app/services/publicAttributionParams';
import { hydrateGeneradorEnlaceVentasAttribution } from '@/app/services/generadorEnlaceVentasFlow';
import {
  buildCheckoutNavigationState,
  getCheckoutPaymentPath,
} from '@/app/services/checkoutNavigation';
import { formatCOP } from '@/lib/utils';
import type { CartItem } from '@/types/common';
import type { CartProductGroup } from '@/app/presentation/components/carrito/cartColorQtyCache';
import MiniCartQuantityRow from '@/app/presentation/components/carrito/MiniCartQuantityRow';
import type { MiniCartConfig } from '@/app/config/miniCartConfig';

type Props = {
  groups: CartProductGroup[];
  cartTotal: number;
  config: MiniCartConfig;
  dense?: boolean;
  onRemoveGroup: (lines: CartItem[]) => void;
  onQuantityChange: (line: CartItem, color: CartItem['color'], qty: number) => void;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
};

export default function MiniCartContent({
  groups,
  cartTotal,
  config,
  dense = false,
  onRemoveGroup,
  onQuantityChange,
  onImageError,
}: Props): React.ReactElement {
  const navigate = useNavigate();
  const visibleGroups = groups.slice(0, config.maxVisibleProducts);
  const hiddenCount = Math.max(0, groups.length - visibleGroups.length);

  return (
    <div className={`flex flex-col ${dense ? 'gap-3' : 'gap-4'}`}>
      <div className={`space-y-3 overflow-y-auto ${dense ? 'max-h-[min(70vh,520px)] pr-1' : ''}`}>
        {visibleGroups.map((group) => {
          const groupTotal = group.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
          return (
            <div
              key={group.productId}
              className="flex gap-3 border-b border-border/30 pb-3 last:border-b-0 last:pb-0"
            >
              <img
                src={group.image}
                alt={group.name}
                className={`${dense ? 'h-14 w-14' : 'h-12 w-12'} shrink-0 rounded-md object-cover`}
                onError={onImageError}
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold leading-tight">{group.name}</p>
                  <p className="shrink-0 text-sm font-semibold">{formatCOP(groupTotal)}</p>
                </div>
                <div className="space-y-1.5">
                  {group.lines.map((line) => (
                    <MiniCartQuantityRow
                      key={line.backendItemId || `${line.id}-${line.color?.pantone || 'default'}`}
                      color={line.color}
                      quantity={line.quantity}
                      max={line.stock ?? null}
                      onChange={(qty) => onQuantityChange(line, line.color, qty)}
                    />
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                onClick={() => onRemoveGroup(group.lines)}
                aria-label={`Eliminar ${group.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          + {hiddenCount} producto{hiddenCount === 1 ? '' : 's'} más en el carrito
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t pt-3">
        <p className="text-base font-semibold">Total:</p>
        <p className="text-lg font-bold text-primary">{formatCOP(cartTotal)}</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => navigate(appendPublicAttributionToInternalPath('/carrito'))}
        >
          Ver Carrito
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => {
            void (async () => {
              capturePublicAttributionFromSearch(window.location.search);
              await hydrateGeneradorEnlaceVentasAttribution(window.location.search);
              navigate(getCheckoutPaymentPath(), { state: buildCheckoutNavigationState() });
            })();
          }}
        >
          Finalizar Compra
        </Button>
      </div>
    </div>
  );
}
