import { Loader2 } from 'lucide-react';
import { useAmbitosReglaContable } from '@/app/hooks/useAmbitosReglaContable';
import type { AmbitoReglaContable } from '@/app/services/reglasContablesService';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reglasContablesUi } from './reglasContablesUi';

export type AmbitoReglaContableSelectProps = {
  value: string;
  onChange: (codigo: string, ambito?: AmbitoReglaContable) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  refreshKey?: number;
  onParametrizar?: () => void;
  className?: string;
};

/**
 * Select de ámbitos activos (`GET .../reglas-contables/ambitos`).
 */
export default function AmbitoReglaContableSelect({
  value,
  onChange,
  disabled = false,
  label = 'Ámbito',
  placeholder = 'Selecciona ámbito',
  refreshKey = 0,
  onParametrizar,
  className,
}: AmbitoReglaContableSelectProps): React.ReactElement {
  const { ambitos, loading, error } = useAmbitosReglaContable({ refreshKey });

  const sinOpciones = !loading && ambitos.length === 0;

  return (
    <div className={className ?? 'space-y-2'}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-foreground">{label}</Label>
        <div className="flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : null}
          {onParametrizar ? (
            <button
              type="button"
              className={reglasContablesUi.linkAction}
              onClick={onParametrizar}
              disabled={disabled || loading}
            >
              Parametrizar ámbitos
            </button>
          ) : null}
        </div>
      </div>
      <Select
        value={value || undefined}
        onValueChange={(codigo) => {
          const ambito = ambitos.find((a) => a.codigo === codigo);
          onChange(codigo, ambito);
        }}
        disabled={disabled || loading || sinOpciones}
      >
        <SelectTrigger className={reglasContablesUi.input}>
          <SelectValue
            placeholder={
              loading ? 'Cargando ámbitos...' : sinOpciones ? 'Sin ámbitos activos' : placeholder
            }
          />
        </SelectTrigger>
        <SelectContent>
          {ambitos.map((ambito) => (
            <SelectItem key={ambito.codigo} value={ambito.codigo}>
              {ambito.nombre} ({ambito.codigo})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
