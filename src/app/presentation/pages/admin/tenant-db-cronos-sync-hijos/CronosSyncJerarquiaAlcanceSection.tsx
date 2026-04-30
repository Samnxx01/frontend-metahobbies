import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface CronosSyncJerarquiaAlcanceSectionProps {
  soloColeccionesSyncGuardadas: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}

export function CronosSyncJerarquiaAlcanceSection({
  soloColeccionesSyncGuardadas,
  disabled,
  onChange,
}: CronosSyncJerarquiaAlcanceSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alcance de colecciones</CardTitle>
        <CardDescription>
          Define qué colecciones de cada servidor hija se envían al padre en cada corrida programada.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="cron-asc-solo-sync" className="text-sm font-medium">
            Solo colecciones con sync guardado en la hija
          </Label>
          <p className="text-xs text-muted-foreground">
            Activado (recomendado): usa únicamente los nombres listados en <span className="font-mono">coleccionesSync</span> de esa conexión hija. Desactivado: replica todas las colecciones físicas presentes en la BD hija (salvo system).
          </p>
        </div>
        <Switch
          id="cron-asc-solo-sync"
          checked={soloColeccionesSyncGuardadas}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      </CardContent>
    </Card>
  );
}
