import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toastAjusteError, toastAjusteExito } from './inventarioAjusteAlerts';
import inventarioService, { type InventarioTipoAjuste, type TipoAjuste } from '@/app/services/inventarioService';
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
import InventarioDireccionAjusteSelect from './InventarioDireccionAjusteSelect';
import { CODIGOS_TIPO_AJUSTE_PRESET } from './inventarioAjusteCatalogConstants';
import { catalogoAjusteUi } from './inventarioAjusteCatalogStyles';

type InventarioTipoAjusteFormSubmodalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: InventarioTipoAjuste | null;
  onGuardado?: () => void;
};

type DraftTipo = {
  codigo: string;
  nombre: string;
  direccion: TipoAjuste;
  descripcion: string;
  estado: boolean;
};

const draftInicial: DraftTipo = {
  codigo: '',
  nombre: '',
  direccion: 'POSITIVO',
  descripcion: '',
  estado: true,
};

const draftDesdeRegistro = (registro: InventarioTipoAjuste): DraftTipo => ({
  codigo: registro.codigo,
  nombre: registro.nombre,
  direccion: registro.direccion,
  descripcion: registro.descripcion ?? '',
  estado: registro.estado !== false,
});

export default function InventarioTipoAjusteFormSubmodal({
  open,
  onOpenChange,
  saving = false,
  registro = null,
  onGuardado,
}: InventarioTipoAjusteFormSubmodalProps): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<DraftTipo>(draftInicial);
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
        const { msg } = await inventarioService.actualizarTipoAjuste(registro.codigo, {
          nombre: draft.nombre.trim(),
          direccion: draft.direccion,
          descripcion: draft.descripcion.trim(),
          estado: draft.estado,
        });
        toastAjusteExito(msg || `Tipo de ajuste "${registro.codigo}" actualizado.`);
      } else {
        const { msg } = await inventarioService.crearTipoAjuste({
          codigo: draft.codigo.trim(),
          nombre: draft.nombre.trim(),
          direccion: draft.direccion,
          descripcion: draft.descripcion.trim(),
          estado: draft.estado,
        });
        toastAjusteExito(msg || `Tipo de ajuste "${draft.codigo}" registrado correctamente.`);
      }
      setDraft(draftInicial);
      onGuardado?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error guardando tipo de ajuste:', error);
      toastAjusteError(
        error,
        esEdicion ? 'No se pudo actualizar el tipo de ajuste.' : 'No se pudo registrar el tipo de ajuste.'
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
          <DialogTitle>{esEdicion ? 'Editar tipo de ajuste' : 'Registrar tipo de ajuste'}</DialogTitle>
          <DialogDescription className={catalogoAjusteUi.description}>
            {esEdicion
              ? 'El código no se modifica. Puedes cambiar nombre, dirección, descripción y estado.'
              : 'Elige un código predefinido o regístralo manualmente. La dirección es fija en catálogo (entrada/salida).'}
          </DialogDescription>
        </DialogHeader>

        <div className={catalogoAjusteUi.section}>
          <InventarioCodigoPresetField
            value={draft.codigo}
            onChange={(codigo) => setDraft((prev) => ({ ...prev, codigo }))}
            presets={CODIGOS_TIPO_AJUSTE_PRESET}
            disabled={submitting || saving || esEdicion}
            onPresetPick={(preset) => setDraft((prev) => ({
              ...prev,
              codigo: preset.codigo,
              nombre: preset.nombre,
              direccion: preset.direccion,
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
          <InventarioDireccionAjusteSelect
            value={draft.direccion}
            onChange={(direccion) => setDraft((prev) => ({ ...prev, direccion }))}
            disabled={submitting || saving}
          />
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
              id="tipo-ajuste-activo"
              checked={draft.estado}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, estado: checked === true }))}
              disabled={submitting || saving}
            />
            <Label htmlFor="tipo-ajuste-activo" className="cursor-pointer font-normal">
              Activo en catálogo
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
            {esEdicion ? 'Guardar cambios' : 'Guardar tipo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
