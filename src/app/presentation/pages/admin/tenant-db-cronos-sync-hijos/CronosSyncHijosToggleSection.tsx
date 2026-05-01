import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface CronosSyncHijosToggleSectionProps {
  habilitado: boolean;
  disabled: boolean;
  onHabilitadoChange: (value: boolean) => void;
}

export function CronosSyncHijosToggleSection({
  habilitado,
  disabled,
  onHabilitadoChange,
}: CronosSyncHijosToggleSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Interruptor principal (padre → hijos)</CardTitle>
        <CardDescription>
          Activa o desactiva el uso de esta configuración cuando exista un job programado que baje datos del servidor padre hacia las BDs hijas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="cron-sync-habilitado" className="text-sm font-medium">
            Job sync hijos habilitado
          </Label>
          <p className="text-xs text-muted-foreground">
            Desactivado: no se aplicará la corrida automática (aunque exista cron en código o variables de entorno).
          </p>
        </div>
        <Switch
          id="cron-sync-habilitado"
          checked={habilitado}
          disabled={disabled}
          onCheckedChange={onHabilitadoChange}
        />
      </CardContent>
    </Card>
  );
}
