import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CronosSyncHijosScheduleSectionProps {
  cronExpresion: string;
  disabled: boolean;
  onCronExpresionChange: (value: string) => void;
}

export function CronosSyncHijosScheduleSection({
  cronExpresion,
  disabled,
  onCronExpresionChange,
}: CronosSyncHijosScheduleSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Programación cron (padre → hijos)</CardTitle>
        <CardDescription>
          Expresión compatible con node-cron. Ejemplo: <code className="rounded bg-muted px-1 py-0.5 text-xs">0 3 * * *</code> cada día a las 03:00 (servidor).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="cron-sync-expresion">Expresión cron</Label>
        <Input
          id="cron-sync-expresion"
          className="font-mono text-sm"
          autoComplete="off"
          spellCheck={false}
          value={cronExpresion}
          disabled={disabled}
          onChange={(e) => onCronExpresionChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          El servidor valida la expresión al guardar. Zona horaria según configuración del proceso Node.
        </p>
      </CardContent>
    </Card>
  );
}
