import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import reglasContablesService, { type TarifaReglaContable } from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAmbitosReglaContable } from '@/app/hooks/useAmbitosReglaContable';
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
  ambitoCodigo: string;
  estado: boolean;
};

const inicial: Draft = {
  codigo: '', nombre: '', descripcion: '', valor: '0', ambitoCodigo: '', estado: true,
};

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function TarifaReglaContableFormSubmodal({
  open, onOpenChange, saving = false, registro = null, onGuardada, tiposRefreshKey = 0,
}: Props): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<Draft>(inicial);
  const [submitting, setSubmitting] = useState(false);
  const { ambitos } = useAmbitosReglaContable({ refreshKey: tiposRefreshKey });

  useEffect(() => {
    if (!open) return;
    setDraft(
      registro
        ? {
            codigo: registro.codigo,
            nombre: registro.nombre,
            descripcion: registro.descripcion ?? '',
            valor: String(registro.valor ?? 0),
            ambitoCodigo: registro.ambitoCodigo ?? '',
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
        ambitoCodigo: draft.ambitoCodigo.trim(),
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
            Porcentajes predefinidos (IVA 19%, margen 30%, etc.) asociables a un ámbito del catálogo.
          </DialogDescription>
        </DialogHeader>
        <div className={reglasContablesUi.section}>
          <div className="space-y-2">
            <Label>Código</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.codigo}
              onChange={(e) => setDraft((p) => ({ ...p, codigo: e.target.value }))}
              placeholder="Ej: IVA_19"
              disabled={esEdicion || submitting || saving}
            />
          </div>
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
              <Label>Ámbito (catálogo)</Label>
              <Select value={draft.ambitoCodigo || '__NINGUNO__'} onValueChange={(v) => setDraft((p) => ({ ...p, ambitoCodigo: v === '__NINGUNO__' ? '' : v }))}>
                <SelectTrigger className={reglasContablesUi.input}><SelectValue placeholder="Cualquier ámbito" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NINGUNO__">Cualquier ámbito</SelectItem>
                  {ambitos.map((a) => (
                    <SelectItem key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre}</SelectItem>
                  ))}
                  {draft.ambitoCodigo && !ambitos.some((a) => a.codigo === draft.ambitoCodigo) && (
                    <SelectItem value={draft.ambitoCodigo}>{draft.ambitoCodigo} — (no está en el catálogo)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Relación dinámica con el catálogo de ámbitos (ambitoreglacontables).
          </p>
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
