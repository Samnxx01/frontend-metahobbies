import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useReglasContables } from '@/app/hooks/useReglasContables';
import type { AplicaEnRegla, ReglaContable, TipoReglaContable } from '@/app/services/reglasContablesService';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { labelTipoRegla } from './reglasContablesConstants';
import { reglasContablesUi } from './reglasContablesUi';

export type ReglaContableSelectProps = {
  /** Código de la regla seleccionada (`ReglaContable.codigo`). */
  value: string;
  onChange: (codigo: string, regla?: ReglaContable) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  refreshKey?: number;
  /** Filtra el listado del endpoint por tipo (IVA, MARGEN_UTILIDAD, etc.). */
  tipo?: TipoReglaContable | TipoReglaContable[];
  /** Filtra por compra, venta o ambos (incluye reglas con `AMBOS`). */
  aplicaEn?: AplicaEnRegla;
  className?: string;
};

const etiquetaOpcion = (regla: ReglaContable): string => {
  const tarifa = Number(regla.tarifa || 0);
  const extra =
    tarifa > 0 ? `${tarifa}%` : Number(regla.montoFijo || 0) > 0 ? `$${regla.montoFijo}` : '';
  const tipo = labelTipoRegla(regla.tipo);
  return extra ? `${regla.nombre} · ${tipo} · ${extra}` : `${regla.nombre} · ${tipo}`;
};

/**
 * Select que integra únicamente `GET /api/inventario/config/reglas-contables`
 * (reglas activas del tenant). Sin CRUD; solo lectura del catálogo.
 */
export default function ReglaContableSelect({
  value,
  onChange,
  disabled = false,
  label = 'Regla contable',
  placeholder = 'Selecciona una regla',
  refreshKey = 0,
  tipo,
  aplicaEn,
  className,
}: ReglaContableSelectProps): React.ReactElement {
  const { reglas, loading, error } = useReglasContables({
    activas: true,
    tipo,
    aplicaEn,
    refreshKey,
  });

  const reglaSeleccionada = useMemo(
    () => reglas.find((r) => r.codigo === value),
    [reglas, value]
  );

  const sinOpciones = !loading && reglas.length === 0;

  return (
    <div className={className ?? 'space-y-2'}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-foreground">{label}</Label>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : null}
      </div>
      <Select
        value={value || undefined}
        onValueChange={(codigo) => {
          const regla = reglas.find((r) => r.codigo === codigo);
          onChange(codigo, regla);
        }}
        disabled={disabled || loading || sinOpciones}
      >
        <SelectTrigger className={reglasContablesUi.input}>
          <SelectValue
            placeholder={
              loading
                ? 'Cargando reglas...'
                : sinOpciones
                  ? 'Sin reglas activas parametrizadas'
                  : placeholder
            }
          />
        </SelectTrigger>
        <SelectContent>
          {reglas.map((regla) => (
            <SelectItem key={regla.codigo} value={regla.codigo}>
              {etiquetaOpcion(regla)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {reglaSeleccionada?.descripcion ? (
        <p className="text-xs text-muted-foreground">{reglaSeleccionada.descripcion}</p>
      ) : null}
    </div>
  );
}
