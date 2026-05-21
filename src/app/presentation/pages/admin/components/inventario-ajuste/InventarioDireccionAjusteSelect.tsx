import type { TipoAjuste } from '@/app/services/inventarioService';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { catalogoAjusteUi } from './inventarioAjusteCatalogStyles';
import { DIRECCIONES_AJUSTE } from './inventarioAjusteCatalogConstants';

type InventarioDireccionAjusteSelectProps = {
  value: TipoAjuste;
  onChange: (value: TipoAjuste) => void;
  disabled?: boolean;
  label?: string;
};

export default function InventarioDireccionAjusteSelect({
  value,
  onChange,
  disabled = false,
  label = 'Dirección',
}: InventarioDireccionAjusteSelectProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as TipoAjuste)} disabled={disabled}>
        <SelectTrigger className={catalogoAjusteUi.input}>
          <SelectValue placeholder="Selecciona dirección" />
        </SelectTrigger>
        <SelectContent>
          {DIRECCIONES_AJUSTE.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
