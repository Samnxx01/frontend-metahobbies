import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CartQuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number | null;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export default function CartQuantityInput({
  value,
  onChange,
  min = 1,
  max = null,
  size = 'md',
  disabled = false,
  className,
}: CartQuantityInputProps): React.ReactElement {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const normalize = (raw: string): number => {
    const parsed = Number.parseInt(String(raw).trim(), 10);
    let next = Number.isFinite(parsed) ? parsed : min;
    next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return next;
  };

  const commitDraft = (): void => {
    const next = normalize(draft);
    onChange(next);
    setDraft(String(next));
  };

  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max == null || value < max);

  const buttonSize = size === 'sm' ? 'h-6 w-6' : 'h-10 w-10';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const inputSize = size === 'sm' ? 'h-6 w-10 text-xs' : 'h-10 w-14 text-lg';

  return (
    <div className={cn('flex items-center border border-input rounded-lg overflow-hidden w-fit', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonSize, 'rounded-none')}
        disabled={!canDecrease}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className={iconSize} />
      </Button>

      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max ?? undefined}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        className={cn(
          inputSize,
          'border-0 rounded-none px-1 text-center font-semibold focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
        aria-label="Cantidad"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonSize, 'rounded-none')}
        disabled={!canIncrease}
        onClick={() => onChange(max != null ? Math.min(max, value + 1) : value + 1)}
      >
        <Plus className={iconSize} />
      </Button>
    </div>
  );
}
