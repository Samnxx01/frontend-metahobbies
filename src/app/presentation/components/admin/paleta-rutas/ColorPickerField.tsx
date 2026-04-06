import React, { useId } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (color: string) => void;
  descripcion?: string;
}

/**
 * Campo reutilizable para seleccionar un color.
 * Muestra un input type="color" sincronizado con un input type="text" para el hex.
 */
export default function ColorPickerField({ label, value, onChange, descripcion }: Props) {
  const id = useId();

  const handleText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Solo actualizar cuando tiene formato hex válido o mientras escribe
    onChange(val);
  };

  const handlePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-text`} className="text-xs font-medium text-foreground">
        {label}
      </label>

      <div className="flex items-center gap-2">
        {/* Cuadro de color nativo */}
        <div className="relative flex-shrink-0">
          <input
            id={`${id}-picker`}
            type="color"
            value={isValidHex ? value : '#ffffff'}
            onChange={handlePicker}
            className="w-9 h-9 rounded-md border border-border cursor-pointer p-0.5 bg-transparent"
            title={label}
          />
        </div>

        {/* Input texto con el hex */}
        <input
          id={`${id}-text`}
          type="text"
          value={value}
          onChange={handleText}
          maxLength={7}
          placeholder="#000000"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono
                     shadow-sm transition-colors placeholder:text-muted-foreground
                     focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
                     disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {descripcion && (
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      )}
    </div>
  );
}
