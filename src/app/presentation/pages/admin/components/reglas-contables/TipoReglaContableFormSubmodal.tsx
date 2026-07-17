import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, {
  type CatalogoCodigo,
  type TipoReglaContableCatalogo,
} from '@/app/services/reglasContablesService';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reglasContablesUi } from './reglasContablesUi';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: TipoReglaContableCatalogo | null;
  onGuardada?: () => void;
};

type Draft = { codigo: string; nombre: string; descripcion: string; codigoDian: string; estado: boolean };

const inicial: Draft = { codigo: '', nombre: '', descripcion: '', codigoDian: '', estado: true };

const SIN_DIAN = '__SIN_DIAN__';

const errMsg = (e: unknown, f: string) => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function TipoReglaContableFormSubmodal({
  open, onOpenChange, saving = false, registro = null, onGuardada,
}: Props): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<Draft>(inicial);
  const [codigosDian, setCodigosDian] = useState<CatalogoCodigo[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      registro
        ? {
            codigo: registro.codigo,
            nombre: registro.nombre,
            descripcion: registro.descripcion ?? '',
            codigoDian: registro.codigoDian ?? '',
            estado: registro.estado !== false,
          }
        : inicial
    );
  }, [open, registro]);

  useEffect(() => {
    if (!open) return;
    reglasContablesService.listarCatalogoCodigos('DIAN_TRIBUTOS')
      .then((data) => setCodigosDian(data))
      .catch(() => setCodigosDian([]));
  }, [open]);

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
        codigoDian: draft.codigoDian,
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
          <div className="space-y-2">
            <Label>Código</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.codigo}
              onChange={(e) => setDraft((p) => ({ ...p, codigo: e.target.value }))}
              placeholder="Ej: IVA"
              disabled={esEdicion || submitting || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input className={reglasContablesUi.input} value={draft.nombre} onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input className={reglasContablesUi.input} value={draft.descripcion} onChange={(e) => setDraft((p) => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Código DIAN (catálogo)</Label>
            <Select
              value={draft.codigoDian || SIN_DIAN}
              onValueChange={(v) => setDraft((p) => ({ ...p, codigoDian: v === SIN_DIAN ? '' : v }))}
            >
              <SelectTrigger className={reglasContablesUi.input}>
                <SelectValue placeholder="Selecciona un código del catálogo DIAN" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_DIAN}>— Sin efecto DIAN —</SelectItem>
                {codigosDian.map((item) => (
                  <SelectItem key={item.codigo} value={item.codigo}>
                    {item.codigo} — {item.nombre}
                    {item.metadata?.chargeIndicator === false ? ' (retención)' : ''}
                  </SelectItem>
                ))}
                {draft.codigoDian && !codigosDian.some((c) => c.codigo === draft.codigoDian) && (
                  <SelectItem value={draft.codigoDian}>{draft.codigoDian} — (no está en el catálogo)</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Relaciona el tipo con el tributo del catálogo DIAN (Anexo 20). Se guarda en tiporeglacontablecatalogos.
            </p>
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
