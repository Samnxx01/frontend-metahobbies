import { Loader2 } from 'lucide-react';
import { useTiposReglaContable } from '@/app/hooks/useTiposReglaContable';
import type { TipoReglaContableCatalogo } from '@/app/services/reglasContablesService';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reglasContablesUi } from './reglasContablesUi';

type Props = {
  value: string;
  onChange: (codigo: string, tipo?: TipoReglaContableCatalogo) => void;
  disabled?: boolean;
  label?: string;
  refreshKey?: number;
  onParametrizar?: () => void;
};

export default function TipoReglaContableSelect({
  value, onChange, disabled = false, label = 'Tipo de regla', refreshKey = 0, onParametrizar,
}: Props): React.ReactElement {
  const { tipos, loading, error } = useTiposReglaContable({ refreshKey });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          {onParametrizar ? (
            <button type="button" className={reglasContablesUi.linkAction} onClick={onParametrizar} disabled={disabled || loading}>
              Parametrizar tipos
            </button>
          ) : null}
        </div>
      </div>
      <Select
        value={value || undefined}
        onValueChange={(c) => onChange(c, tipos.find((t) => t.codigo === c))}
        disabled={disabled || loading || !tipos.length}
      >
        <SelectTrigger className={reglasContablesUi.input}>
          <SelectValue placeholder={loading ? 'Cargando...' : 'Selecciona tipo'} />
        </SelectTrigger>
        <SelectContent>
          {tipos.map((t) => (
            <SelectItem key={t.codigo} value={t.codigo}>{t.nombre} ({t.codigo})</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
