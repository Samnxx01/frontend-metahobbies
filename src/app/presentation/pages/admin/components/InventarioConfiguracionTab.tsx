import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type InventarioComprasConfig, type InventarioConfig, type MetodoValuacion } from '@/app/services/inventarioService';
import { useMetodosValuacionOpciones } from '../inventario/useMetodosValuacionOpciones';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type InventarioConfiguracionTabProps = {
  config: InventarioConfig | null;
  periodo: string;
  saving: boolean;
  setPeriodo: React.Dispatch<React.SetStateAction<string>>;
  actualizarMetodo: (metodoValuacion: MetodoValuacion) => Promise<void>;
  actualizarConfigCompras?: (compras: InventarioComprasConfig) => Promise<void>;
  cerrarPeriodo: () => Promise<void>;
};

export default function InventarioConfiguracionTab({
  config,
  periodo,
  saving,
  setPeriodo,
  actualizarMetodo,
  actualizarConfigCompras,
  cerrarPeriodo,
}: InventarioConfiguracionTabProps): React.ReactElement {
  const {
    opciones: metodosValuacionOpciones,
    metodoActivo: metodoValuacionActivo,
    loading: cargandoMetodosValuacion,
    error: errorMetodosValuacion,
  } = useMetodosValuacionOpciones(config?.metodoValuacion);
  const metodoValuacionSeleccionado = config?.metodoValuacion ?? metodoValuacionActivo;
  const [recepcionAutomatica, setRecepcionAutomatica] = useState(false);

  useEffect(() => {
    setRecepcionAutomatica(config?.compras?.recepcionAutomatica === true);
  }, [config?.compras?.recepcionAutomatica]);

  const guardarConfigCompras = async (compras: InventarioComprasConfig): Promise<void> => {
    const previous = recepcionAutomatica;
    setRecepcionAutomatica(compras.recepcionAutomatica);
    try {
      if (actualizarConfigCompras) {
        await actualizarConfigCompras(compras);
      } else {
        await inventarioService.actualizarConfigCompras(compras);
      }
      toast.success('Configuracion de compras actualizada.');
    } catch (error) {
      setRecepcionAutomatica(previous);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la configuracion de compras.');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Configuracion de compras</CardTitle>
          <CardDescription>Modo de recepcion al guardar ordenes de compra.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label>Recepcion automatica al guardar OC</Label>
              <p className="text-sm text-muted-foreground">
                {recepcionAutomatica
                  ? 'Guardar orden crea la OC, genera el comprobante y registra la entrada completa.'
                  : 'Guardar orden deja la OC abierta; la entrada se registra despues desde Comprobante entrada.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Manual</span>
              <Switch
                checked={recepcionAutomatica}
                disabled={saving}
                onCheckedChange={(checked) => void guardarConfigCompras({ recepcionAutomatica: checked })}
                aria-label="Configurar recepcion automatica de compras"
              />
              <span className="text-xs font-medium text-foreground">Automatico</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Configuracion contable</CardTitle>
          <CardDescription>Metodo de valuacion y periodos cerrados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Metodo de valuacion</Label>
              <Select
                value={metodoValuacionSeleccionado}
                disabled={saving || cargandoMetodosValuacion}
                onValueChange={(value) => void actualizarMetodo(value as MetodoValuacion)}
              >
                <SelectTrigger><SelectValue placeholder={cargandoMetodosValuacion ? 'Cargando...' : undefined} /></SelectTrigger>
                <SelectContent>
                  {metodosValuacionOpciones.map((opcion) => (
                    <SelectItem key={opcion.codigo} value={opcion.codigo}>
                      {opcion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorMetodosValuacion ? (
                <p className="text-xs text-destructive">{errorMetodosValuacion}</p>
              ) : null}
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
