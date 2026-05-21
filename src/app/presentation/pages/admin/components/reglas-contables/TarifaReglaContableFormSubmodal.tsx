import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, { type TarifaReglaContable } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InventarioCodigoPresetField from '../inventario-ajuste/InventarioCodigoPresetField';
import { useTiposReglaContable } from '@/app/hooks/useTiposReglaContable';
import { PRESETS_TARIFA_REGLA } from './tarifaReglaContableConstants';
import { reglasContablesUi } from './reglasContablesUi';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: TarifaReglaContable | null;
  onGuardada?: () => void;
  tiposRefreshKey?: number;
};

type Draft = {
  codigo: string;
  nombre: string;
  descripcion: string;
  valor: string;
  tipoReglaCodigo: string;
  orden: string;
  estado: boolean;
};

const inicial: Draft = {
  codigo: '', nombre: '', descripcion: '', valor: '0', tipoReglaCodigo: '', orden: '0', estado: true,
};

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function TarifaReglaContableFormSubmodal({
  open, onOpenChange, saving = false, registro = null, onGuardada, tiposRefreshKey = 0,
}: Props): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<Draft>(inicial);
  const [submitting, setSubmitting] = useState(false);
  const { tipos } = useTiposReglaContable({ refreshKey: tiposRefreshKey });

  useEffect(() => {
    if (!open) return;
    setDraft(
      registro
        ? {
            codigo: registro.codigo,
            nombre: registro.nombre,
            descripcion: registro.descripcion ?? '',
            valor: String(registro.valor ?? 0),
            tipoReglaCodigo: registro.tipoReglaCodigo ?? '',
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
    const valor = Number(draft.valor);
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      toast.error('El valor debe estar entre 0 y 100.');
      return;
    }
    try {
      setSubmitting(true);
      const body = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        valor,
        tipoReglaCodigo: draft.tipoReglaCodigo.trim(),
        orden: Number(draft.orden) || 0,
        estado: draft.estado,
      };
      if (esEdicion && registro) {
        const { msg } = await reglasContablesService.actualizarTarifa(registro.codigo, body);
        toast.success(msg || 'Tarifa actualizada.');
      } else {
        const { msg } = await reglasContablesService.crearTarifa({ codigo: draft.codigo.trim(), ...body });
        toast.success(msg || 'Tarifa registrada.');
      }
      onGuardada?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo guardar la tarifa.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) setDraft(inicial); onOpenChange(n); }}>
      <DialogContent className={reglasContablesUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar tarifa' : 'Nueva tarifa'}</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            Porcentajes predefinidos (IVA 19%, margen 30%, etc.) asociables a un tipo de regla.
          </DialogDescription>
        </DialogHeader>
        <div className={reglasContablesUi.section}>
          {!esEdicion ? (
            <InventarioCodigoPresetField
              value={draft.codigo}
              onChange={(c) => setDraft((p) => ({ ...p, codigo: c }))}
              presets={PRESETS_TARIFA_REGLA}
              disabled={submitting || saving}
              label="Código"
              onPresetPick={(p) =>
                setDraft((prev) => ({
                  ...prev,
                  codigo: p.codigo,
                  nombre: p.nombre,
                  valor: String(p.valor),
                  tipoReglaCodigo: p.tipoReglaCodigo ?? '',
                }))
              }
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valor (%)</Label>
              <Input type="number" min={0} max={100} step="0.01" className={reglasContablesUi.input} value={draft.valor} onChange={(e) => setDraft((p) => ({ ...p, valor: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de regla (opcional)</Label>
              <Select value={draft.tipoReglaCodigo || '__NINGUNO__'} onValueChange={(v) => setDraft((p) => ({ ...p, tipoReglaCodigo: v === '__NINGUNO__' ? '' : v }))}>
                <SelectTrigger className={reglasContablesUi.input}><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NINGUNO__">Cualquier tipo</SelectItem>
                  {tipos.map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="tarifa-activa" checked={draft.estado} onCheckedChange={(c) => setDraft((p) => ({ ...p, estado: c === true }))} />
            <Label htmlFor="tarifa-activa" className="font-normal cursor-pointer">Activa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" className={reglasContablesUi.btnPrimary} onClick={() => void guardar()} disabled={submitting || saving}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
