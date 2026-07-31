import { useEffect, useState } from 'react';
import { Landmark, Pencil, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import metodoPagoService, {
  type MedioPagoDian,
  type MetodoPagoCatalogo,
  type ModoBancosMetodoPago,
} from '@/app/services/metodoPagoService';
import reglasContablesService, { type CatalogoCodigo } from '@/app/services/reglasContablesService';
import { useBancosColombiaCatalogo } from '@/app/hooks/useBancosColombiaCatalogo';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reglasContablesUi } from '../reglas-contables/reglasContablesUi';

const nombreBancoVisible = (nombreCorto?: string | null, nombre = ''): string => {
  const valor = String(nombreCorto || nombre).trim();
  return valor
    .replace(/\s*\(en adelante.*$/i, '')
    .replace(/\s+COMPAÑ[IÍ]A\s+DE\s+FINANCIAMIENTO.*$/i, '')
    .replace(/\s*,\s*(?:pudiendo|podrá).*$/i, '')
    .trim() || valor;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: MetodoPagoCatalogo | null;
  onGuardada?: () => void;
};

type Draft = {
  codigo: string;
  nombre: string;
  descripcion: string;
  medioPagoDian: MedioPagoDian;
  estado: boolean;
  modoBancos: ModoBancosMetodoPago;
  bancosAsociados: string[];
};

const inicial: Draft = {
  codigo: '', nombre: '', descripcion: '', medioPagoDian: '', estado: true, modoBancos: 'NINGUNO', bancosAsociados: [],
};

const errMsg = (e: unknown, f: string): string => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function MetodoPagoFormSubmodal({
  open, onOpenChange, saving = false, registro = null, onGuardada,
}: Props): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<Draft>(inicial);
  const [submitting, setSubmitting] = useState(false);
  const [mediosDian, setMediosDian] = useState<CatalogoCodigo[]>([]);
  const { bancos: bancosCatalogo } = useBancosColombiaCatalogo();
  const bancosActivos = bancosCatalogo.filter((banco) => banco.estado);

  const cargarMediosDian = async (): Promise<void> => {
    try {
      setMediosDian(await reglasContablesService.listarCatalogoCodigos('DIAN_MEDIOS_PAGO'));
    } catch {
      setMediosDian([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    setDraft(
      registro
        ? {
            codigo: registro.codigo,
            nombre: registro.nombre,
            descripcion: registro.descripcion ?? '',
            medioPagoDian: registro.medioPagoDian ?? '',
            estado: registro.estado !== false,
            modoBancos: registro.modoBancos ?? (registro.esPse ? 'MULTIPLE' : 'NINGUNO'),
            bancosAsociados: registro.bancosAsociados ?? registro.bancosPse ?? [],
          }
        : inicial
    );
    void cargarMediosDian();
  }, [open, registro]);

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim() || !draft.medioPagoDian) {
      toast.error('Código, nombre y medio de pago DIAN son obligatorios.');
      return;
    }
    if (draft.modoBancos === 'UNICO' && draft.bancosAsociados.length !== 1) {
      toast.error('Seleccione exactamente una entidad bancaria.');
      return;
    }
    if (draft.modoBancos === 'MULTIPLE' && draft.bancosAsociados.length === 0) {
      toast.error('Seleccione al menos una entidad bancaria.');
      return;
    }
    try {
      setSubmitting(true);
      const body = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        medioPagoDian: draft.medioPagoDian,
        estado: draft.estado,
        esPse: draft.codigo.trim().toUpperCase() === 'PSE',
        modoBancos: draft.modoBancos,
        bancosAsociados: draft.modoBancos === 'NINGUNO' ? [] : draft.bancosAsociados,
      };
      if (esEdicion && registro) {
        const { msg } = await metodoPagoService.actualizar(registro.codigo, body);
        toast.success(msg || 'Método de pago actualizado.');
      } else {
        const { msg } = await metodoPagoService.crear({
          codigo: draft.codigo.trim(),
          ...body,
        });
        toast.success(msg || 'Método de pago registrado.');
      }
      onGuardada?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo guardar el método de pago.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) setDraft(inicial); onOpenChange(n); }}>
      <DialogContent className={reglasContablesUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar método de pago' : 'Nuevo método de pago'}</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            Defina el método y a qué medio de pago DIAN (Lista 15A) mapea para la factura electrónica.
          </DialogDescription>
        </DialogHeader>
        <div className={reglasContablesUi.section}>
          <div className="space-y-2">
            <Label>Código</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.codigo}
              disabled={esEdicion}
              onChange={(e) => {
                const codigo = e.target.value;
                setDraft((p) => ({
                  ...p,
                  codigo,
                  modoBancos: codigo.trim().toUpperCase() === 'PSE' && p.modoBancos === 'NINGUNO'
                    ? 'MULTIPLE'
                    : p.modoBancos,
                }));
              }}
              placeholder="Ej: NEQUI"
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.nombre}
              onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Efectivo, PSE, Nequi o Tarjeta"
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.descripcion}
              onChange={(e) => setDraft((p) => ({ ...p, descripcion: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Medio de pago DIAN</Label>
            <Select
              value={draft.medioPagoDian}
              onValueChange={(value) => setDraft((p) => ({ ...p, medioPagoDian: value as MedioPagoDian }))}
            >
              <SelectTrigger className={reglasContablesUi.input}>
                <SelectValue placeholder="Selecciona el medio DIAN" />
              </SelectTrigger>
              <SelectContent>
                {mediosDian.map(medio => (
                  <SelectItem key={medio.codigo} value={medio.codigo}>
                    {medio.codigo} — {medio.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Asociación con catálogo bancario</Label>
            <Select
              value={draft.modoBancos}
              onValueChange={(value) => setDraft((p) => ({
                ...p,
                modoBancos: value as ModoBancosMetodoPago,
                bancosAsociados: value === 'NINGUNO' ? [] : p.bancosAsociados,
              }))}
            >
              <SelectTrigger id="select-modo-bancos-metodo-pago" className={reglasContablesUi.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NINGUNO">Sin banco — efectivo, tarjeta u otro</SelectItem>
                <SelectItem value="UNICO">Un banco — Nequi u otra entidad</SelectItem>
                <SelectItem value="MULTIPLE">Múltiples bancos — grupo PSE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.modoBancos === 'UNICO' && (
            <div className="space-y-2">
              <Label>Entidad bancaria</Label>
              <Select
                value={draft.bancosAsociados[0] || ''}
                onValueChange={(value) => setDraft((p) => ({ ...p, bancosAsociados: [value] }))}
              >
                <SelectTrigger id="select-banco-unico-metodo-pago" className={reglasContablesUi.input}>
                  <SelectValue placeholder="Seleccione una entidad" />
                </SelectTrigger>
                <SelectContent>
                  {bancosActivos.map((banco) => (
                    <SelectItem key={banco.sfcId} value={banco.sfcId}>
                      {nombreBancoVisible(banco.nombreCorto, banco.nombre)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {draft.modoBancos === 'MULTIPLE' && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-2">
                  <Landmark className="h-4 w-4" /> Bancos del grupo PSE
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft((p) => ({
                    ...p,
                    bancosAsociados: p.bancosAsociados.length === bancosActivos.length
                      ? []
                      : bancosActivos.map((banco) => banco.sfcId),
                  }))}
                >
                  {draft.bancosAsociados.length === bancosActivos.length ? 'Limpiar' : 'Seleccionar todos'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Seleccione las entidades que se mostrarán agrupadas bajo el método PSE.
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {bancosActivos.map((banco) => (
                  <label key={banco.sfcId} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={draft.bancosAsociados.includes(banco.sfcId)}
                      onCheckedChange={(checked) => setDraft((p) => ({
                        ...p,
                        bancosAsociados: checked === true
                          ? [...new Set([...p.bancosAsociados, banco.sfcId])]
                          : p.bancosAsociados.filter((id) => id !== banco.sfcId),
                      }))}
                    />
                    <span>{nombreBancoVisible(banco.nombreCorto, banco.nombre)}</span>
                  </label>
                ))}
                {bancosActivos.length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">No hay bancos activos en el catálogo.</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{draft.bancosAsociados.length} banco(s) seleccionado(s).</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="metodo-pago-activo"
              checked={draft.estado}
              onCheckedChange={(c) => setDraft((p) => ({ ...p, estado: c === true }))}
            />
            <Label htmlFor="metodo-pago-activo" className="font-normal cursor-pointer">Activo</Label>
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
