import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import reglasContablesService, {
  type AplicaEnRegla,
  type BaseCalculoRegla,
  type ReglaContable,
  type TipoReglaContable,
} from '@/app/services/reglasContablesService';
import productosService, { type BackendCategoria } from '@/app/services/productosService';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import InventarioCodigoPresetField from '../inventario-ajuste/InventarioCodigoPresetField';
import AmbitoReglaContableModal from './AmbitoReglaContableModal';
import AmbitoReglaContableSelect from './AmbitoReglaContableSelect';
import TipoReglaContableModal from './TipoReglaContableModal';
import TipoReglaContableSelect from './TipoReglaContableSelect';
import TarifaReglaContableModal from './TarifaReglaContableModal';
import TarifaReglaContableSelect from './TarifaReglaContableSelect';
import { BASES_CALCULO_REGLA, PRESETS_REGLA_CONTABLE } from './reglasContablesConstants';
import { reglasContablesUi } from './reglasContablesUi';

type ReglaContableFormSubmodalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  registro?: ReglaContable | null;
  onGuardada?: () => void;
  tiposRefreshKey?: number;
  ambitosRefreshKey?: number;
  tarifasRefreshKey?: number;
  onAbrirParametrizacionTipos?: () => void;
  onAbrirParametrizacionAmbitos?: () => void;
  onAbrirParametrizacionTarifas?: () => void;
};

type DraftRegla = {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: TipoReglaContable;
  tarifaCodigo: string;
  tarifa: string;
  montoFijo: string;
  baseCalculo: BaseCalculoRegla;
  aplicaEn: AplicaEnRegla;
  aplicaEnCarrito: boolean;
  categoriasAplicacion: string[];
  orden: string;
  codigoDian: string;
  estado: boolean;
};

const draftInicial: DraftRegla = {
  codigo: '',
  nombre: '',
  descripcion: '',
  tipo: 'IVA',
  tarifaCodigo: '',
  tarifa: '0',
  montoFijo: '0',
  baseCalculo: 'SUBTOTAL_COMERCIAL',
  aplicaEn: 'VENTA',
  aplicaEnCarrito: false,
  categoriasAplicacion: [],
  orden: '0',
  codigoDian: '',
  estado: true,
};

const draftDesdeRegistro = (registro: ReglaContable): DraftRegla => ({
  codigo: registro.codigo,
  nombre: registro.nombre,
  descripcion: registro.descripcion ?? '',
  tipo: registro.tipo,
  tarifaCodigo: '',
  tarifa: String(registro.tarifa ?? 0),
  montoFijo: String(registro.montoFijo ?? 0),
  baseCalculo: registro.baseCalculo,
  aplicaEn: registro.aplicaEn,
  aplicaEnCarrito: registro.aplicaEnCarrito === true,
  categoriasAplicacion: (registro.categoriasAplicacion || []).map((categoria) => String(categoria)),
  orden: String(registro.orden ?? 0),
  codigoDian: registro.codigoDian ?? '',
  estado: registro.estado !== false,
});

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;

const backendId = (row: { _id?: string; iud?: string; id?: string } | null | undefined): string =>
  String(row?.iud || row?._id || row?.id || '');

const categoriaLabel = (categoria: BackendCategoria): string => {
  const padre = typeof categoria.padre === 'object' && categoria.padre !== null ? categoria.padre.nombre : '';
  return padre ? `${padre} / ${categoria.nombre}` : categoria.nombre;
};

export default function ReglaContableFormSubmodal({
  open,
  onOpenChange,
  saving = false,
  registro = null,
  onGuardada,
  tiposRefreshKey = 0,
  ambitosRefreshKey = 0,
  tarifasRefreshKey = 0,
  onAbrirParametrizacionTipos,
  onAbrirParametrizacionAmbitos,
  onAbrirParametrizacionTarifas,
}: ReglaContableFormSubmodalProps): React.ReactElement {
  const esEdicion = Boolean(registro?.codigo);
  const [draft, setDraft] = useState<DraftRegla>(draftInicial);
  const [submitting, setSubmitting] = useState(false);
  const [tipoModalLocalOpen, setTipoModalLocalOpen] = useState(false);
  const [ambitoModalLocalOpen, setAmbitoModalLocalOpen] = useState(false);
  const [tarifaModalLocalOpen, setTarifaModalLocalOpen] = useState(false);
  const [tiposKeyLocal, setTiposKeyLocal] = useState(0);
  const [ambitosKeyLocal, setAmbitosKeyLocal] = useState(0);
  const [tarifasKeyLocal, setTarifasKeyLocal] = useState(0);
  const [categorias, setCategorias] = useState<BackendCategoria[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(registro ? draftDesdeRegistro(registro) : draftInicial);
  }, [open, registro]);

  useEffect(() => {
    if (!open) return;
    productosService.listarCategorias()
      .then((data) => setCategorias(data))
      .catch((error) => {
        console.error('Error cargando categorias:', error);
        setCategorias([]);
      });
  }, [open]);

  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      const payloadBase = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        tipo: draft.tipo,
        tarifa: Number(draft.tarifa) || 0,
        montoFijo: Number(draft.montoFijo) || 0,
        baseCalculo: draft.baseCalculo,
        aplicaEn: draft.aplicaEn,
        aplicaEnCarrito: draft.aplicaEnCarrito,
        categoriasAplicacion: draft.aplicaEnCarrito ? draft.categoriasAplicacion : [],
        orden: Number(draft.orden) || 0,
        codigoDian: draft.codigoDian.trim(),
        estado: draft.estado,
      };
      if (esEdicion && registro) {
        const { msg } = await reglasContablesService.actualizar(registro.codigo, payloadBase);
        toast.success(msg || `Regla "${registro.codigo}" actualizada.`);
      } else {
        const { msg } = await reglasContablesService.crear({
          codigo: draft.codigo.trim(),
          ...payloadBase,
        });
        toast.success(msg || `Regla "${draft.codigo}" registrada.`);
      }
      setDraft(draftInicial);
      onGuardada?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error guardando regla contable:', error);
      toast.error(
        errorMessage(error, esEdicion ? 'No se pudo actualizar la regla.' : 'No se pudo registrar la regla.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next) setDraft(draftInicial);
    onOpenChange(next);
  };

  const toggleCategoria = (categoriaId: string, checked: boolean): void => {
    setDraft((prev) => {
      const actual = new Set(prev.categoriasAplicacion);
      if (checked) actual.add(categoriaId);
      else actual.delete(categoriaId);
      return { ...prev, categoriasAplicacion: Array.from(actual) };
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={reglasContablesUi.dialogContentSm}>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar regla contable' : 'Nueva regla contable'}</DialogTitle>
          <DialogDescription className={reglasContablesUi.description}>
            {esEdicion
              ? 'El código no se modifica. Ajusta tarifas, base de cálculo y ámbito (compra/venta).'
              : 'Define impuestos, retenciones, márgenes o reglas comerciales para el cálculo de precios.'}
          </DialogDescription>
        </DialogHeader>

        <div className={reglasContablesUi.section}>
          {!esEdicion ? (
            <InventarioCodigoPresetField
              value={draft.codigo}
              onChange={(codigo) => setDraft((prev) => ({ ...prev, codigo }))}
              presets={PRESETS_REGLA_CONTABLE}
              disabled={submitting || saving}
              label="Código"
              onPresetPick={(preset) =>
                setDraft((prev) => ({
                  ...prev,
                  codigo: preset.codigo,
                  nombre: preset.nombre,
                  tipo: preset.tipo,
                  tarifa: String(preset.tarifa),
                  baseCalculo: preset.baseCalculo,
                  aplicaEn: preset.aplicaEn,
                  aplicaEnCarrito: preset.tipo === 'IVA' && preset.aplicaEn === 'VENTA',
                  categoriasAplicacion: [],
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
            <Input
              className={reglasContablesUi.input}
              value={draft.nombre}
              onChange={(e) => setDraft((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="IVA venta 19%"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TipoReglaContableSelect
              value={draft.tipo}
              onChange={(codigo) =>
                setDraft((prev) => ({ ...prev, tipo: codigo, tarifaCodigo: '', tarifa: '0' }))
              }
              disabled={submitting || saving || Boolean(registro?.esSistema)}
              refreshKey={tiposRefreshKey + tiposKeyLocal}
              onParametrizar={() => {
                if (onAbrirParametrizacionTipos) onAbrirParametrizacionTipos();
                else setTipoModalLocalOpen(true);
              }}
            />
            <AmbitoReglaContableSelect
              value={draft.aplicaEn}
              onChange={(codigo) => setDraft((prev) => ({ ...prev, aplicaEn: codigo }))}
              disabled={submitting || saving}
              label="Ámbito (compra / venta)"
              refreshKey={ambitosRefreshKey + ambitosKeyLocal}
              onParametrizar={() => {
                if (onAbrirParametrizacionAmbitos) onAbrirParametrizacionAmbitos();
                else setAmbitoModalLocalOpen(true);
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TarifaReglaContableSelect
              value={draft.tarifaCodigo}
              tarifaValor={draft.tarifa}
              tipoReglaCodigo={draft.tipo}
              onChange={(codigo, _t, valor) =>
                setDraft((prev) => ({ ...prev, tarifaCodigo: codigo, tarifa: valor }))
              }
              disabled={submitting || saving}
              refreshKey={tarifasRefreshKey + tarifasKeyLocal}
              onParametrizar={() => {
                if (onAbrirParametrizacionTarifas) onAbrirParametrizacionTarifas();
                else setTarifaModalLocalOpen(true);
              }}
            />
            <div className="space-y-2">
              <Label>Monto fijo (COP)</Label>
              <Input
                type="number"
                min={0}
                className={reglasContablesUi.input}
                value={draft.montoFijo}
                onChange={(e) => setDraft((prev) => ({ ...prev, montoFijo: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Base de cálculo</Label>
              <Select
                value={draft.baseCalculo}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, baseCalculo: value as BaseCalculoRegla }))
                }
                disabled={submitting || saving}
              >
                <SelectTrigger className={reglasContablesUi.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BASES_CALCULO_REGLA.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orden de aplicación</Label>
              <Input
                type="number"
                min={0}
                className={reglasContablesUi.input}
                value={draft.orden}
                onChange={(e) => setDraft((prev) => ({ ...prev, orden: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Código DIAN (opcional)</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.codigoDian}
              onChange={(e) => setDraft((prev) => ({ ...prev, codigoDian: e.target.value }))}
              placeholder="01"
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="regla-contable-activa"
              checked={draft.estado}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, estado: checked === true }))}
              disabled={submitting || saving}
            />
            <Label htmlFor="regla-contable-activa" className="cursor-pointer font-normal">
              Activa en catálogo
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="regla-contable-carrito"
              checked={draft.aplicaEnCarrito}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, aplicaEnCarrito: checked === true }))}
              disabled={submitting || saving}
            />
            <Label htmlFor="regla-contable-carrito" className="cursor-pointer font-normal">
              Aplicar masivamente a productos de venta
            </Label>
          </div>

          {draft.aplicaEnCarrito ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div>
                <Label>Categorias de aplicacion</Label>
                <p className={reglasContablesUi.description}>
                  Si no seleccionas categorias, se aplica a todos los productos de venta.
                </p>
              </div>
              {categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay categorias activas.</p>
              ) : (
                <div className="grid max-h-48 gap-2 overflow-auto sm:grid-cols-2">
                  {categorias.map((categoria) => {
                    const id = backendId(categoria);
                    const checked = draft.categoriasAplicacion.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <Checkbox
                          checked={checked}
                          disabled={submitting || saving}
                          onCheckedChange={(value) => toggleCategoria(id, value === true)}
                        />
                        <span className="min-w-0 truncate">
                          {categoriaLabel(categoria)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            className={reglasContablesUi.btnPrimary}
            onClick={() => void guardar()}
            disabled={saving || submitting}
          >
            {esEdicion ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {esEdicion ? 'Guardar cambios' : 'Guardar regla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {!onAbrirParametrizacionTipos ? (
      <TipoReglaContableModal
        open={tipoModalLocalOpen}
        onOpenChange={setTipoModalLocalOpen}
        saving={saving}
        onTiposActualizados={() => {
          setTiposKeyLocal((k) => k + 1);
          setTarifasKeyLocal((k) => k + 1);
        }}
      />
    ) : null}
    {!onAbrirParametrizacionAmbitos ? (
      <AmbitoReglaContableModal
        open={ambitoModalLocalOpen}
        onOpenChange={setAmbitoModalLocalOpen}
        saving={saving}
        onAmbitosActualizados={() => setAmbitosKeyLocal((k) => k + 1)}
      />
    ) : null}
    {!onAbrirParametrizacionTarifas ? (
      <TarifaReglaContableModal
        open={tarifaModalLocalOpen}
        onOpenChange={setTarifaModalLocalOpen}
        saving={saving}
        tiposRefreshKey={tiposRefreshKey + tiposKeyLocal}
        onTarifasActualizadas={() => setTarifasKeyLocal((k) => k + 1)}
      />
    ) : null}
    </>
  );
}
