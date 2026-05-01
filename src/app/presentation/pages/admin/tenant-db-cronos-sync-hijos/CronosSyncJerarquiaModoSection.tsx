import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
export interface CronosSyncJerarquiaModoSectionProps {
  modoSubidaJerarquia: 'full' | 'incremental';
  disabled: boolean;
  onChange: (modo: 'full' | 'incremental') => void;
}

export function CronosSyncJerarquiaModoSection({
  modoSubidaJerarquia,
  disabled,
  onChange,
}: CronosSyncJerarquiaModoSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Modo de copia hacia el padre</CardTitle>
        <CardDescription>
          Igual que en sync manual entre servidores: incremental suele ser mejor para corridas frecuentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {(['incremental', 'full'] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m)}
            className={`flex flex-1 min-w-[140px] flex-col items-start gap-1 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50
              ${modoSubidaJerarquia === m ? 'border-primary bg-primary/10 font-medium' : 'border-border bg-background hover:border-primary/40'}`}
          >
            <span className="flex items-center gap-2">
              {m === 'incremental' ? 'Incremental' : 'Full'}
              {modoSubidaJerarquia === m && <Badge variant="secondary" className="text-[10px]">activo</Badge>}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {m === 'incremental'
                ? 'Actualiza si el hijo tiene updatedAt más reciente o falta el doc en el padre.'
                : 'Reemplaza por _id con upsert (más pesado).'}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
