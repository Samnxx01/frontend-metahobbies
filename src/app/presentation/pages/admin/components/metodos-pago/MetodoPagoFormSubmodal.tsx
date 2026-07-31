import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import metodoPagoService, { type MedioPagoDian, type MetodoPagoCatalogo } from '@/app/services/metodoPagoService';
import reglasContablesService, { type CatalogoCodigo } from '@/app/services/reglasContablesService';
import { useBancosColombiaCatalogo } from '@/app/hooks/useBancosColombiaCatalogo';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GobernanzaModuloSearchableSelect,
  type GobernanzaSearchableSelectOption,
} from '../../gobernanza/GobernanzaModuloSearchableSelect';
import { reglasContablesUi } from '../reglas-contables/reglasContablesUi';

const NOMBRE_MANUAL_VALUE = '__MANUAL__';

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
};

const inicial: Draft = { codigo: '', nombre: '', descripcion: '', medioPagoDian: '', estado: true };

const errMsg = (e: unknown, f: string): string => (e instanceof Error ? e.message.replace(/^\[\d+\]\s*/, '') : f);

export default function MetodoPagoFormSubmodal({
  open, onOpenChange, saving = false, registro = null, onGuardada,
}: Props): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<Draft>(inicial);
  const [submitting, setSubmitting] = useState(false);
  const [mediosDian, setMediosDian] = useState<CatalogoCodigo[]>([]);
  const [nombreSelectValue, setNombreSelectValue] = useState('');
  const { bancos: bancosCatalogo } = useBancosColombiaCatalogo();

  const bancosOptions: GobernanzaSearchableSelectOption[] = bancosCatalogo
    .filter((banco) => banco.estado)
    .map((banco) => ({
      value: banco.nombre,
      label: banco.nombreCorto || banco.nombre,
      searchText: `${banco.nombreCorto || ''} ${banco.nombre}`,
    }))
    .concat([{ value: NOMBRE_MANUAL_VALUE, label: 'Otro / escribir manualmente…', searchText: 'otro manual' }]);

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
          }
        : inicial
    );
    if (registro?.nombre) {
      const coincide = bancosCatalogo.some((banco) => banco.nombre === registro.nombre);
      setNombreSelectValue(coincide ? registro.nombre : NOMBRE_MANUAL_VALUE);
    } else {
      setNombreSelectValue('');
    }
    void cargarMediosDian();
  }, [open, registro, bancosCatalogo]);

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim() || !draft.medioPagoDian) {
      toast.error('Código, nombre y medio de pago DIAN son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      const body = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        medioPagoDian: draft.medioPagoDian,
        estado: draft.estado,
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
              onChange={(e) => setDraft((p) => ({ ...p, codigo: e.target.value }))}
              placeholder="Ej: NEQUI"
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <GobernanzaModuloSearchableSelect
              value={nombreSelectValue}
              onValueChange={(value) => {
                setNombreSelectValue(value);
                if (value && value !== NOMBRE_MANUAL_VALUE) {
                  setDraft((p) => ({ ...p, nombre: value }));
                } else if (value === NOMBRE_MANUAL_VALUE) {
                  setDraft((p) => ({ ...p, nombre: '' }));
                }
              }}
              options={bancosOptions}
              placeholder="Seleccione una entidad del catálogo de bancos"
              searchPlaceholder="Buscar banco…"
            />
            {nombreSelectValue === NOMBRE_MANUAL_VALUE && (
              <Input
                className={`${reglasContablesUi.input} mt-2`}
                value={draft.nombre}
                onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Nequi"
              />
            )}
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
