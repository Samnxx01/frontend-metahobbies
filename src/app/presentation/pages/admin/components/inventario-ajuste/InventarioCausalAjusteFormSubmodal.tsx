import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toastAjusteError, toastAjusteExito } from './inventarioAjusteAlerts';
import inventarioService, { type InventarioCausalAjuste, type InventarioTipoMovimiento } from '@/app/services/inventarioService';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { catalogoAjusteUi } from './inventarioAjusteCatalogStyles';

type InventarioCausalAjusteFormSubmodalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: InventarioCausalAjuste | null;
  onGuardada?: () => void;
};

type DraftCausal = {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoMovimientoId: string;
  estado: boolean;
};

const draftInicial: DraftCausal = {
  codigo: '',
  nombre: '',
  descripcion: '',
  tipoMovimientoId: '',
  estado: true,
};

const resolverTipoMovimientoId = (causal: InventarioCausalAjuste): string => {
  if (causal.tipoMovimientoReferenciaId) return causal.tipoMovimientoReferenciaId;
  if (causal.tipoMovimiento) return String(causal.tipoMovimiento.iud || causal.tipoMovimiento._id || '');
  const relacion = causal.tipoMovimientoId;
  if (typeof relacion === 'string') return relacion;
  return String(relacion?.iud || relacion?._id || '');
};

const draftDesdeRegistro = (registro: InventarioCausalAjuste): DraftCausal => ({
  codigo: registro.codigo,
  nombre: registro.nombre,
  descripcion: registro.descripcion ?? '',
  tipoMovimientoId: resolverTipoMovimientoId(registro),
  estado: registro.estado !== false,
});

export default function InventarioCausalAjusteFormSubmodal({
  open,
  onOpenChange,
  saving = false,
  registro = null,
  onGuardada,
}: InventarioCausalAjusteFormSubmodalProps): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<DraftCausal>(draftInicial);
  const [submitting, setSubmitting] = useState(false);
  const [tiposMovimiento, setTiposMovimiento] = useState<InventarioTipoMovimiento[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(registro ? draftDesdeRegistro(registro) : draftInicial);
    void inventarioService.listarTiposMovimientoAdmin()
      .then((tipos) => setTiposMovimiento(tipos.filter((tipo) => tipo.estado !== false)))
      .catch((error) => toastAjusteError(error, 'No se pudieron cargar los tipos de movimiento.'));
  }, [open, registro]);

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim() || !draft.tipoMovimientoId) {
      toastAjusteError(null, 'Código, nombre y tipo de movimiento son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      if (esEdicion && registro) {
        const { msg } = await inventarioService.actualizarCausalAjuste(registro.codigo, {
          nombre: draft.nombre.trim(),
          descripcion: draft.descripcion.trim(),
          tipoMovimientoId: draft.tipoMovimientoId,
          estado: draft.estado,
        });
        toastAjusteExito(msg || `Causal "${registro.codigo}" actualizada.`);
      } else {
        const { msg } = await inventarioService.crearCausalAjuste({
          codigo: draft.codigo.trim(),
          nombre: draft.nombre.trim(),
          descripcion: draft.descripcion.trim(),
          tipoMovimientoId: draft.tipoMovimientoId,
          estado: draft.estado,
        });
        toastAjusteExito(msg || `Causal "${draft.codigo}" registrada correctamente.`);
      }
      setDraft(draftInicial);
      onGuardada?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error guardando causal:', error);
      toastAjusteError(
        error,
        esEdicion ? 'No se pudo actualizar la causal.' : 'No se pudo registrar la causal.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next) setDraft(draftInicial);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${catalogoAjusteUi.dialogContentSm} w-[calc(100vw-1rem)] max-h-[92dvh] overflow-y-auto bg-card p-4 text-card-foreground sm:w-[calc(100%-2rem)] sm:p-6`}>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar causal de ajuste' : 'Registrar causal de ajuste'}</DialogTitle>
          <DialogDescription className={catalogoAjusteUi.description}>
            {esEdicion
              ? 'El código no se modifica. Puedes cambiar nombre, descripción y estado.'
              : 'Registra una causal dinámica y relaciónala con un tipo de movimiento activo.'}
          </DialogDescription>
        </DialogHeader>

        <div className={`${catalogoAjusteUi.section} p-3 sm:p-4`}>
          <div className="space-y-2">
            <Label htmlFor="causal-ajuste-codigo">Código *</Label>
            <Input
              id="causal-ajuste-codigo"
              className={catalogoAjusteUi.input}
              value={draft.codigo}
              onChange={(event) => setDraft((prev) => ({
                ...prev,
                codigo: event.target.value.toUpperCase().replace(/\s+/g, '_'),
              }))}
              placeholder="Ej. AJUSTE_CALIDAD"
              disabled={submitting || saving || esEdicion}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              className={catalogoAjusteUi.input}
              value={draft.nombre}
              onChange={(event) => setDraft((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="Merma por vencimiento"
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              className={catalogoAjusteUi.input}
              value={draft.descripcion}
              onChange={(event) => setDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de movimiento relacionado *</Label>
            <Select
              value={draft.tipoMovimientoId}
              onValueChange={(tipoMovimientoId) => setDraft((prev) => ({ ...prev, tipoMovimientoId }))}
              disabled={submitting || saving}
            >
              <SelectTrigger className={catalogoAjusteUi.input}>
                <SelectValue placeholder="Selecciona un tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                {tiposMovimiento.map((tipo) => {
                  const id = String(tipo.iud || tipo._id || '');
                  return id ? (
                    <SelectItem key={id} value={id}>
                      {tipo.codigo} · {tipo.nombre} ({tipo.naturaleza})
                    </SelectItem>
                  ) : null;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="causal-ajuste-activa"
              checked={draft.estado}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, estado: checked === true }))}
              disabled={submitting || saving}
            />
            <Label htmlFor="causal-ajuste-activa" className="cursor-pointer font-normal">
              Activa en catálogo
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            className={`w-full sm:w-auto ${catalogoAjusteUi.btnPrimary}`}
            onClick={() => void guardar()}
            disabled={saving || submitting}
          >
            {esEdicion ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {esEdicion ? 'Guardar cambios' : 'Guardar causal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
