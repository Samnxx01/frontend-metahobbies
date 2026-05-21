import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InventarioCodigoPresetField from '../inventario-ajuste/InventarioCodigoPresetField';
import { PRESETS_AMBITO_REGLA } from './ambitoReglaContableConstants';
import { reglasContablesUi } from './reglasContablesUi';

type AmbitoReglaContableFormSubmodalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: AmbitoReglaContable | null;
  onGuardada?: () => void;
};

type DraftAmbito = {
  codigo: string;
  nombre: string;
  descripcion: string;
  orden: string;
  estado: boolean;
};

const draftInicial: DraftAmbito = {
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: '0',
  estado: true,
};

const draftDesdeRegistro = (registro: AmbitoReglaContable): DraftAmbito => ({
  codigo: registro.codigo,
  nombre: registro.nombre,
  descripcion: registro.descripcion ?? '',
  orden: String(registro.orden ?? 0),
  estado: registro.estado !== false,
});

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;

export default function AmbitoReglaContableFormSubmodal({
  open,
  onOpenChange,
  saving = false,
  registro = null,
  onGuardada,
}: AmbitoReglaContableFormSubmodalProps): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<DraftAmbito>(draftInicial);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(registro ? draftDesdeRegistro(registro) : draftInicial);
  }, [open, registro]);

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        orden: Number(draft.orden) || 0,
        estado: draft.estado,
      };
      if (esEdicion && registro) {
        const { msg } = await reglasContablesService.actualizarAmbito(registro.codigo, payload);
        toast.success(msg || `Ámbito "${registro.codigo}" actualizado.`);
      } else {
        const { msg } = await reglasContablesService.crearAmbito({
          codigo: draft.codigo.trim(),
          ...payload,
        });
        toast.success(msg || `Ámbito "${draft.codigo}" registrado.`);
      }
      setDraft(draftInicial);
      onGuardada?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        errorMessage(error, esEdicion ? 'No se pudo actualizar el ámbito.' : 'No se pudo registrar el ámbito.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDraft(draftInicial);
        onOpenChange(next);
      }}
    >
      <DialogContent className={reglasContablesUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar tipo de ámbito' : 'Nuevo tipo de ámbito'}</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            Los ámbitos clasifican si una regla aplica en compra, venta o en ambos flujos.
          </DialogDescription>
        </DialogHeader>

        <div className={reglasContablesUi.section}>
          {!esEdicion ? (
            <InventarioCodigoPresetField
              value={draft.codigo}
              onChange={(codigo) => setDraft((prev) => ({ ...prev, codigo }))}
              presets={PRESETS_AMBITO_REGLA}
              disabled={submitting || saving}
              label="Código del ámbito"
              onPresetPick={(preset) =>
                setDraft((prev) => ({ ...prev, codigo: preset.codigo, nombre: preset.nombre }))
              }
            />
          ) : (
            <div className="space-y-2">
              <Label>Código</Label>
              <Input className={reglasContablesUi.input} value={draft.codigo} disabled />
            </div>
          )}
          <div className="space-y-2">
            <Label>Nombre visible</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.nombre}
              onChange={(e) => setDraft((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Exportación"
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.descripcion}
              onChange={(e) => setDraft((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Orden</Label>
            <Input
              type="number"
              min={0}
              className={reglasContablesUi.input}
              value={draft.orden}
              onChange={(e) => setDraft((prev) => ({ ...prev, orden: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ambito-regla-activo"
              checked={draft.estado}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, estado: checked === true }))}
              disabled={submitting || saving}
            />
            <Label htmlFor="ambito-regla-activo" className="cursor-pointer font-normal">
              Activo en catálogo
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            className={reglasContablesUi.btnPrimary}
            onClick={() => void guardar()}
            disabled={saving || submitting}
          >
            {esEdicion ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {esEdicion ? 'Guardar cambios' : 'Guardar ámbito'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
