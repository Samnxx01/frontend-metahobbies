import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasVentasService, {
  type ComportamientoTipoReglaVenta,
  type TipoReglaVentaCatalogo,
  etiquetaComportamientoTipoReglaVenta,
} from '@/app/services/reglasVentasService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: TipoReglaVentaCatalogo | null;
  onGuardada?: () => void;
};

type Draft = {
  codigo: string;
  nombre: string;
  descripcion: string;
  comportamiento: ComportamientoTipoReglaVenta;
  orden: string;
  estado: boolean;
};

const inicial: Draft = {
  codigo: '',
  nombre: '',
  descripcion: '',
  comportamiento: 'LIMITE_CANTIDAD',
  orden: '0',
  estado: true,
};

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function TipoReglaVentaFormSubmodal({
  open,
  onOpenChange,
  saving = false,
  registro = null,
  onGuardada,
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
            comportamiento: registro.comportamiento,
            orden: String(registro.orden ?? 0),
            estado: registro.estado !== false,
          }
        : inicial,
    );
  }, [open, registro]);

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Codigo y nombre son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      const body = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        comportamiento: draft.comportamiento,
        orden: Number(draft.orden) || 0,
        estado: draft.estado,
      };
      if (esEdicion && registro) {
        const { msg } = await reglasVentasService.actualizarTipo(registro.codigo, body);
        toast.success(msg || 'Tipo actualizado.');
      } else {
        const { msg } = await reglasVentasService.crearTipo({ codigo: draft.codigo.trim(), ...body });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar tipo de regla' : 'Nuevo tipo de regla'}</DialogTitle>
          <DialogDescription>
            Solo define el comportamiento (limite de cantidad, % o monto fijo). El numero concreto se asigna
            en cada producto al marcar la regla de venta correspondiente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!esEdicion ? (
            <div className="space-y-2">
              <Label htmlFor="trv-codigo">Codigo</Label>
              <Input
                id="trv-codigo"
                value={draft.codigo}
                onChange={(e) => setDraft((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                disabled={submitting || saving}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Codigo</Label>
              <Input value={draft.codigo} disabled />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="trv-nombre">Nombre</Label>
            <Input
              id="trv-nombre"
              value={draft.nombre}
              onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trv-descripcion">Descripcion</Label>
            <Input
              id="trv-descripcion"
              value={draft.descripcion}
              onChange={(e) => setDraft((p) => ({ ...p, descripcion: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trv-comportamiento">Comportamiento</Label>
            <select
              id="trv-comportamiento"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={draft.comportamiento}
              disabled={esEdicion}
              onChange={(e) => setDraft((p) => ({
                ...p,
                comportamiento: e.target.value as ComportamientoTipoReglaVenta,
              }))}
            >
              <option value="LIMITE_CANTIDAD">{etiquetaComportamientoTipoReglaVenta('LIMITE_CANTIDAD')}</option>
              <option value="DESCUENTO_PORCENTAJE">{etiquetaComportamientoTipoReglaVenta('DESCUENTO_PORCENTAJE')}</option>
              <option value="DESCUENTO_FIJO">{etiquetaComportamientoTipoReglaVenta('DESCUENTO_FIJO')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trv-orden">Orden</Label>
            <Input
              id="trv-orden"
              type="number"
              min={0}
              value={draft.orden}
              onChange={(e) => setDraft((p) => ({ ...p, orden: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="trv-estado"
              checked={draft.estado}
              onCheckedChange={(c) => setDraft((p) => ({ ...p, estado: c === true }))}
            />
            <Label htmlFor="trv-estado" className="font-normal cursor-pointer">Activo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={() => void guardar()} disabled={submitting || saving}>
            {esEdicion ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
