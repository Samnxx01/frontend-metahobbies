import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export type GobernanzaDynamicMultiSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export type GobernanzaModuloDynamicMultiSelectProps = {
  id: string;
  label: string;
  placeholder?: string;
  options: GobernanzaDynamicMultiSelectOption[];
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  loading?: boolean;
  emptyHint?: string;
};

/** Select dinámico multi-valor (añade acciones una a una). */
export function GobernanzaModuloDynamicMultiSelect({
  id,
  label,
  placeholder = 'Selecciona…',
  options,
  selected,
  onSelectedChange,
  loading = false,
  emptyHint,
}: GobernanzaModuloDynamicMultiSelectProps): React.ReactElement {
  const disponibles = options.filter((o) => !selected.includes(o.value));
  const cargandoSinOpciones = loading && options.length === 0;
  const todasSeleccionadas = options.length > 0 && disponibles.length === 0;

  const agregar = (value: string) => {
    if (!value || selected.includes(value)) return;
    onSelectedChange([...selected, value]);
  };

  const quitar = (value: string) => {
    onSelectedChange(selected.filter((v) => v !== value));
  };

  const labelPorValor = (value: string) =>
    options.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        value=""
        onValueChange={agregar}
        disabled={cargandoSinOpciones || disponibles.length === 0}
      >
        <SelectTrigger id={id}>
          <SelectValue
            placeholder={
              cargandoSinOpciones
                ? 'Cargando opciones…'
                : todasSeleccionadas
                  ? 'Todas las acciones están seleccionadas'
                  : disponibles.length
                    ? placeholder
                    : emptyHint || 'Sin opciones disponibles'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {disponibles.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
              {o.hint ? ` · ${o.hint}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[220px] truncate">{labelPorValor(value)}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Quitar ${labelPorValor(value)}`}
                onClick={() => quitar(value)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">Ninguna acción seleccionada.</p>
      )}
    </div>
  );
}
