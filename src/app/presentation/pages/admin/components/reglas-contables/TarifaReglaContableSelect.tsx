import { Loader2 } from 'lucide-react';
import { useTarifasReglaContable } from '@/app/hooks/useTarifasReglaContable';
import type { TarifaReglaContable } from '@/app/services/reglasContablesService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reglasContablesUi } from './reglasContablesUi';

type Props = {
  value: string;
  tarifaValor: string;
  onChange: (codigo: string, tarifa: TarifaReglaContable | undefined, valorManual: string) => void;
  tipoReglaCodigo?: string;
  disabled?: boolean;
  refreshKey?: number;
  onParametrizar?: () => void;
};

export default function TarifaReglaContableSelect({
  value,
  tarifaValor,
  onChange,
  tipoReglaCodigo,
  disabled = false,
  refreshKey = 0,
  onParametrizar,
}: Props): React.ReactElement {
  const { tarifas, loading, error } = useTarifasReglaContable({ tipoReglaCodigo, refreshKey });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Tarifa (%)</Label>
        <div className="flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          {onParametrizar ? (
            <button type="button" className={reglasContablesUi.linkAction} onClick={onParametrizar} disabled={disabled || loading}>
              Parametrizar tarifas
            </button>
          ) : null}
        </div>
      </div>
      <Select
        value={value || undefined}
        onValueChange={(codigo) => {
          const t = tarifas.find((x) => x.codigo === codigo);
          onChange(codigo, t, t ? String(t.valor) : tarifaValor);
        }}
        disabled={disabled || loading}
      >
        <SelectTrigger className={reglasContablesUi.input}>
          <SelectValue placeholder={loading ? 'Cargando...' : 'Selecciona tarifa'} />
        </SelectTrigger>
        <SelectContent>
          {tarifas.map((t) => (
            <SelectItem key={t.codigo} value={t.codigo}>
              {t.nombre} ({Number(t.valor).toFixed(2)}%)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={0}
        max={100}
        step="0.01"
        className={reglasContablesUi.input}
        value={tarifaValor}
        onChange={(e) => onChange(value, tarifas.find((x) => x.codigo === value), e.target.value)}
        placeholder="Valor % manual o ajuste"
        disabled={disabled}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
