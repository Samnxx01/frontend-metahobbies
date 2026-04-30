import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CronosSyncJerarquiaScheduleSectionProps {
  cronExpresionSubidaJerarquia: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function CronosSyncJerarquiaScheduleSection({
  cronExpresionSubidaJerarquia,
  disabled,
  onChange,
}: CronosSyncJerarquiaScheduleSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Programación cron (hijo → padre)</CardTitle>
        <CardDescription>
          Independiente del cron de padre→hijos. Ejemplo: <code className="rounded bg-muted px-1 py-0.5 text-xs">0 4 * * *</code> cada día a las 04:00.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="cron-asc-expresion">Expresión cron</Label>
        <Input
          id="cron-asc-expresion"
          className="font-mono text-sm"
          autoComplete="off"
          spellCheck={false}
          value={cronExpresionSubidaJerarquia}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </CardContent>
    </Card>
  );
}
