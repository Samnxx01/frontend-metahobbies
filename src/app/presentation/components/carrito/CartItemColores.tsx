import type { CartItem, ProductColor } from '@/types/common';

export function resolveCartItemColores(item: Pick<CartItem, 'color' | 'colors'>): ProductColor[] {
  if (Array.isArray(item.colors) && item.colors.length > 0) return item.colors;
  if (item.color) return [item.color];
  return [];
}

type Props = {
  item: Pick<CartItem, 'color' | 'colors'>;
  className?: string;
  compact?: boolean;
};

export default function CartItemColores({ item, className = '', compact = false }: Props): React.ReactElement | null {
  const colores = resolveCartItemColores(item);
  if (!colores.length) return null;

  const label = colores.length === 1 ? 'Tono' : 'Tonos';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <span className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>{label}:</span>
      {colores.map((color) => (
        <span
          key={color.pantone}
          className={`inline-flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}
        >
          <span
            className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} rounded-full border border-border shrink-0`}
            style={{ backgroundColor: color.hex || color.pantone }}
            title={color.name}
          />
          {color.name}
        </span>
      ))}
    </div>
  );
}
