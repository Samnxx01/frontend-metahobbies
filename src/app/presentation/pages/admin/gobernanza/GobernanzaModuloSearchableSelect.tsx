import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type GobernanzaSearchableSelectOption = {
  value: string;
  label: React.ReactNode;
  /** Texto plano para filtrar (nombre, path, id…). */
  searchText?: string;
};

export type GobernanzaModuloSearchableSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: GobernanzaSearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  triggerClassName?: string;
};

export function GobernanzaModuloSearchableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Selecciona una opción',
  searchPlaceholder = 'Buscar…',
  disabled = false,
  emptyMessage = 'Sin coincidencias',
  triggerClassName,
}: GobernanzaModuloSearchableSelectProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((opt) => {
      const haystack = String(opt.searchText || opt.value || '').toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('h-10 w-full min-w-0 justify-between overflow-hidden font-normal', triggerClassName)}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-8"
              autoFocus
            />
          </div>
        </div>
        <ul className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyMessage}</li>
          ) : (
            filtered.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent',
                      active && 'bg-accent',
                    )}
                    onClick={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'opacity-100' : 'opacity-0')} />
                    <span className="min-w-0 flex-1">{opt.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
