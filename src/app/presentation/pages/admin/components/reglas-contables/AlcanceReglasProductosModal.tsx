import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'react-toastify';

import inventarioService from '@/app/services/inventarioService';
import reglasContablesService, { type AmbitoReglaContable } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { reglasContablesUi } from './reglasContablesUi';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (ambitos: string[]) => void;
};

const mensajeError = (error: unknown): string =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo guardar el alcance.';

export default function AlcanceReglasProductosModal({
  open,
  onOpenChange,
  onSaved,
}: Props): React.ReactElement {
  const [catalogo, setCatalogo] = useState<AmbitoReglaContable[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [config, ambitos] = await Promise.all([
        inventarioService.obtenerConfig(),
        reglasContablesService.listarAmbitosActivos(),
      ]);
      setCatalogo(ambitos);
      setSeleccionados(config?.productos?.ambitosReglaContable ?? []);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void cargar();
  }, [cargar, open]);

  const guardar = async (): Promise<void> => {
    try {
      setSaving(true);
      await inventarioService.actualizarConfigProductos({ ambitosReglaContable: seleccionados });
      toast.success(seleccionados.length
        ? 'Alcance de reglas de productos actualizado.'
        : 'Alcance dinámico habilitado: se mostrarán todas las reglas activas.');
      onSaved(seleccionados);
      onOpenChange(false);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={reglasContablesUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>Alcance de reglas para productos</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            Selecciona los ámbitos cuyas reglas se pueden asignar en el formulario de productos.
            Sin selección se mostrarán todas las reglas activas.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando ámbitos...
          </div>
        ) : (
          <div className="grid max-h-72 gap-3 overflow-auto py-1">
            {catalogo.map((ambito) => {
              const codigo = String(ambito.codigo || '').trim().toUpperCase();
              return (
                <label key={codigo} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    checked={seleccionados.includes(codigo)}
                    disabled={saving}
                    onCheckedChange={(checked) => setSeleccionados((prev) => checked === true
                      ? [...new Set([...prev, codigo])]
                      : prev.filter((item) => item !== codigo))}
                  />
                  <span><span className="font-medium">{ambito.nombre}</span> <span className="text-muted-foreground">({codigo})</span></span>
                </label>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="button" className={reglasContablesUi.btnPrimary} onClick={() => void guardar()} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar alcance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
