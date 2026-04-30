import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface CronosSyncHijosOptionsSectionProps {
  incluirColeccionesAutoSync: boolean;
  disabled: boolean;
  onIncluirAutoSyncChange: (value: boolean) => void;
}

export function CronosSyncHijosOptionsSection({
  incluirColeccionesAutoSync,
  disabled,
  onIncluirAutoSyncChange,
}: CronosSyncHijosOptionsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Opciones avanzadas</CardTitle>
        <CardDescription>
          Ajustes que aplicará el job al recorrer las configuraciones de colecciones sync guardadas por tenant.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="cron-sync-autosync" className="text-sm font-medium">
            Incluir colecciones con auto-sync (Change Stream)
          </Label>
          <p className="text-xs text-muted-foreground">
            Si está activo, el cron también ejecutará sync incremental sobre colecciones que ya replican en vivo (útil como reconciliación nocturna). Si está apagado, solo procesa colecciones en modo manual.
          </p>
        </div>
        <Switch
          id="cron-sync-autosync"
          checked={incluirColeccionesAutoSync}
          disabled={disabled}
          onCheckedChange={onIncluirAutoSyncChange}
        />
      </CardContent>
    </Card>
  );
}
