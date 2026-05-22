import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, { type TipoReglaContableCatalogo } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InventarioCodigoPresetField from '../inventario-ajuste/InventarioCodigoPresetField';
import { PRESETS_TIPO_REGLA } from './tipoReglaContableConstants';
import { reglasContablesUi } from './reglasContablesUi';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: TipoReglaContableCatalogo | null;
  onGuardada?: () => void;
};

type Draft = { codigo: string; nombre: string; descripcion: string; orden: string; estado: boolean };

const inicial: Draft = { codigo: '', nombre: '', descripcion: '', orden: '0', estado: true };

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function TipoReglaContableFormSubmodal({
  open, onOpenChange, saving = false, registro = null, onGuardada,
}: Props): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<Draft>(inicial);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      registro
        ? {
            codigo: registro.codigo,
            nombre: registro.nombre,
            descripcion: registro.descripcion ?? '',
            orden: String(registro.orden ?? 0),
            estado: registro.estado !== false,
          }
        : inicial
    );
  }, [open, registro]);

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      const body = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        orden: Number(draft.orden) || 0,
        estado: draft.estado,
      };
      if (esEdicion && registro) {
        const { msg } = await reglasContablesService.actualizarTipo(registro.codigo, body);
        toast.success(msg || 'Tipo actualizado.');
      } else {
        const { msg } = await reglasContablesService.crearTipo({ codigo: draft.codigo.trim(), ...body });
        toast.success(msg || 'Tipo registrado.');
      }
      onGuardada?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo guardar el tipo.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) setDraft(inicial); onOpenChange(n); }}>
      <DialogContent className={reglasContablesUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar tipo de regla' : 'Nuevo tipo de regla'}</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            Clasificación de la regla: IVA, retención, margen, etc.
          </DialogDescription>
        </DialogHeader>
        <div className={reglasContablesUi.section}>
          {!esEdicion ? (
            <InventarioCodigoPresetField
              value={draft.codigo}
              onChange={(c) => setDraft((p) => ({ ...p, codigo: c }))}
              presets={PRESETS_TIPO_REGLA}
              disabled={submitting || saving}
              label="Código"
              onPresetPick={(p) => setDraft((prev) => ({ ...prev, codigo: p.codigo, nombre: p.nombre }))}
            />
          ) : (
            <div className="space-y-2">
              <Label>Código</Label>
              <Input className={reglasContablesUi.input} value={draft.codigo} disabled />
            </div>
          )}
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input className={reglasContablesUi.input} value={draft.nombre} onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input className={reglasContablesUi.input} value={draft.descripcion} onChange={(e) => setDraft((p) => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Orden</Label>
            <Input type="number" min={0} className={reglasContablesUi.input} value={draft.orden} onChange={(e) => setDraft((p) => ({ ...p, orden: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="tipo-activo" checked={draft.estado} onCheckedChange={(c) => setDraft((p) => ({ ...p, estado: c === true }))} />
            <Label htmlFor="tipo-activo" className="font-normal cursor-pointer">Activo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" className={reglasContablesUi.btnPrimary} onClick={() => void guardar()} disabled={submitting || saving}>
            {esEdicion ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
