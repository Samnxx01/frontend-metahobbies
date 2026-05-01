import React from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import type { InventarioConfig, MetodoValuacion } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type InventarioConfiguracionTabProps = {
  config: InventarioConfig | null;
  periodo: string;
  saving: boolean;
  setPeriodo: React.Dispatch<React.SetStateAction<string>>;
  actualizarMetodo: (metodoValuacion: MetodoValuacion) => Promise<void>;
  cerrarPeriodo: () => Promise<void>;
};

export default function InventarioConfiguracionTab({
  config,
  periodo,
  saving,
  setPeriodo,
  actualizarMetodo,
  cerrarPeriodo,
}: InventarioConfiguracionTabProps): React.ReactElement {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Configuracion contable</CardTitle>
          <CardDescription>Metodo de valuacion y periodos cerrados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Metodo de valuacion</Label>
              <Select value={config?.metodoValuacion || 'PROMEDIO'} onValueChange={(value) => void actualizarMetodo(value as MetodoValuacion)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMEDIO">Promedio ponderado</SelectItem>
                  <SelectItem value="FIFO">PEPS / FIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Periodo a cerrar</Label>
              <Input value={periodo} onChange={(event) => setPeriodo(event.target.value)} placeholder="2026-04" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void cerrarPeriodo()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                Cerrar periodo
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Periodos cerrados</p>
            <div className="flex flex-wrap gap-2">
              {(config?.periodosCerrados || []).length > 0 ? (
                config?.periodosCerrados.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)
              ) : (
                <p className="text-sm text-muted-foreground">No hay periodos cerrados.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

