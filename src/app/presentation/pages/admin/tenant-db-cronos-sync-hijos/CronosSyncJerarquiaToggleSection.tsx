import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface CronosSyncJerarquiaToggleSectionProps {
  habilitadoSubidaJerarquia: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}

export function CronosSyncJerarquiaToggleSection({
  habilitadoSubidaJerarquia,
  disabled,
  onChange,
}: CronosSyncJerarquiaToggleSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Interruptor cron hijo → padre</CardTitle>
        <CardDescription>
          Activa la réplica programada hacia la BD <span className="font-mono">backupReplicaDbName</span> de cada hijo (cluster del padre). La BD operativa del padre no se toca.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="cron-asc-habilitado" className="text-sm font-medium">
            Job subida jerarquía habilitado
          </Label>
          <p className="text-xs text-muted-foreground">
            Desactivado: no se ejecutan corridas automáticas hacia el padre (el endpoint manual sigue disponible).
          </p>
        </div>
        <Switch
          id="cron-asc-habilitado"
          checked={habilitadoSubidaJerarquia}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      </CardContent>
    </Card>
  );
}
