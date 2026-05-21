import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toastAjusteError, toastAjusteExito } from './inventarioAjusteAlerts';
import inventarioService, { type InventarioCausalAjuste } from '@/app/services/inventarioService';
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
import InventarioCodigoPresetField from './InventarioCodigoPresetField';
import { CODIGOS_CAUSAL_AJUSTE_PRESET } from './inventarioAjusteCatalogConstants';
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
  estado: boolean;
};

const draftInicial: DraftCausal = {
  codigo: '',
  nombre: '',
  descripcion: '',
  estado: true,
};

const draftDesdeRegistro = (registro: InventarioCausalAjuste): DraftCausal => ({
  codigo: registro.codigo,
  nombre: registro.nombre,
  descripcion: registro.descripcion ?? '',
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

  useEffect(() => {
    if (!open) return;
    setDraft(registro ? draftDesdeRegistro(registro) : draftInicial);
  }, [open, registro]);

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toastAjusteError(null, 'Código y nombre son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      if (esEdicion && registro) {
        const { msg } = await inventarioService.actualizarCausalAjuste(registro.codigo, {
          nombre: draft.nombre.trim(),
          descripcion: draft.descripcion.trim(),
          estado: draft.estado,
        });
        toastAjusteExito(msg || `Causal "${registro.codigo}" actualizada.`);
      } else {
        const { msg } = await inventarioService.crearCausalAjuste({
          codigo: draft.codigo.trim(),
          nombre: draft.nombre.trim(),
          descripcion: draft.descripcion.trim(),
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
      <DialogContent className={catalogoAjusteUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar causal de ajuste' : 'Registrar causal de ajuste'}</DialogTitle>
          <DialogDescription className={catalogoAjusteUi.description}>
            {esEdicion
              ? 'El código no se modifica. Puedes cambiar nombre, descripción y estado.'
              : 'Selecciona una causal predefinida o regístrala manualmente.'}
          </DialogDescription>
        </DialogHeader>

        <div className={catalogoAjusteUi.section}>
          <InventarioCodigoPresetField
            value={draft.codigo}
            onChange={(codigo) => setDraft((prev) => ({ ...prev, codigo }))}
            presets={CODIGOS_CAUSAL_AJUSTE_PRESET}
            disabled={submitting || saving || esEdicion}
            onPresetPick={(preset) => setDraft((prev) => ({
              ...prev,
              codigo: preset.codigo,
              nombre: preset.nombre,
            }))}
          />
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            className={catalogoAjusteUi.btnPrimary}
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
