import type { ReactElement } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { ProductColor } from '@/types/common';
import { Button } from '@/components/ui/button';

type Props = {
  color?: ProductColor;
  quantity: number;
  max?: number | null;
  onChange: (quantity: number) => void;
};

export default function MiniCartQuantityRow({
  color,
  quantity,
  max = null,
  onChange,
}: Props): ReactElement {
  const canDecrease = quantity > 0;
  const canIncrease = max == null || quantity < max;

  return (
    <div className="flex items-center justify-between gap-2 w-full min-w-0">
      {color?.name ? (
        <span className="inline-flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: color.hex || undefined }}
            title={color.name}
          />
          <span className="truncate">{color.name}</span>
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Cantidad</span>
      )}
      <div className="inline-flex items-center gap-0.5 shrink-0 rounded-md border border-input bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-none"
          disabled={!canDecrease}
          onClick={() => onChange(Math.max(0, quantity - 1))}
          aria-label="Disminuir cantidad"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="min-w-[1.75rem] px-1 text-center text-sm font-semibold tabular-nums">
          {quantity}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-none"
          disabled={!canIncrease}
          onClick={() => onChange(max != null ? Math.min(max, quantity + 1) : quantity + 1)}
          aria-label="Aumentar cantidad"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
