import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { catalogoAjusteUi } from './inventarioAjusteCatalogStyles';
import { MODO_REGISTRO_MANUAL } from './inventarioAjusteCatalogConstants';

export type CodigoPresetOption = {
  codigo: string;
  nombre: string;
};

type InventarioCodigoPresetFieldProps = {
  value: string;
  onChange: (codigo: string) => void;
  presets: CodigoPresetOption[];
  disabled?: boolean;
  label?: string;
  manualPlaceholder?: string;
  onPresetPick?: (preset: CodigoPresetOption) => void;
};

export default function InventarioCodigoPresetField({
  value,
  onChange,
  presets,
  disabled = false,
  label = 'Código',
  manualPlaceholder = 'CODIGO_PERSONALIZADO',
  onPresetPick,
}: InventarioCodigoPresetFieldProps): React.ReactElement {
  const [modoManual, setModoManual] = useState(() => {
    if (!value) return false;
    return !presets.some((p) => p.codigo === value);
  });

  const selectValue = modoManual ? MODO_REGISTRO_MANUAL : (value || undefined);

  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      {!modoManual ? (
        <Select
          value={selectValue}
          onValueChange={(next) => {
            if (next === MODO_REGISTRO_MANUAL) {
              setModoManual(true);
              onChange('');
              return;
            }
            const preset = presets.find((p) => p.codigo === next);
            if (preset) {
              onChange(preset.codigo);
              onPresetPick?.(preset);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className={catalogoAjusteUi.input}>
            <SelectValue placeholder="Selecciona código" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.codigo} value={preset.codigo}>
                {preset.codigo} — {preset.nombre}
              </SelectItem>
            ))}
            <SelectItem value={MODO_REGISTRO_MANUAL}>Registrar manualmente…</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-2">
          <Input
            className={catalogoAjusteUi.input}
            value={value}
            onChange={(event) => onChange(event.target.value.toUpperCase().replace(/\s+/g, '_'))}
            placeholder={manualPlaceholder}
            disabled={disabled}
          />
          <button
            type="button"
            className={catalogoAjusteUi.linkAction}
            onClick={() => {
              setModoManual(false);
              onChange('');
            }}
            disabled={disabled}
          >
            Volver a códigos predefinidos
          </button>
        </div>
      )}
    </div>
  );
}
