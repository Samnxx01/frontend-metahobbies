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
import ReglaProductosMatriz from './ReglaProductosMatriz';
import AmbitoReglaContableModal from './AmbitoReglaContableModal';
import AmbitoReglaContableSelect from './AmbitoReglaContableSelect';
import TipoReglaContableModal from './TipoReglaContableModal';
import TipoReglaContableSelect from './TipoReglaContableSelect';
import TarifaReglaContableModal from './TarifaReglaContableModal';
import TarifaReglaContableSelect from './TarifaReglaContableSelect';
import { BASES_CALCULO_REGLA } from './reglasContablesConstants';
import { reglasContablesUi } from './reglasContablesUi';

type TenantOption = { value: string; label: string };

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
  productosAplicacion: string[];
  orden: string;
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
  productosAplicacion: [],
  orden: '0',
  estado: true,
};

const draftDesdeRegistro = (registro: ReglaContable): DraftRegla => ({
  codigo: registro.codigo,
  nombre: registro.nombre,
  descripcion: registro.descripcion ?? '',
  tipo: registro.tipo,
  tarifaCodigo: registro.tarifaCodigo ?? '',
  tarifa: String(registro.tarifa ?? 0),
  montoFijo: String(registro.montoFijo ?? 0),
  baseCalculo: registro.baseCalculo,
  aplicaEn: registro.aplicaEn,
  aplicaEnCarrito: registro.aplicaEnCarrito === true,
  // Se completan aparte desde `listarAplicacionesRegla` (colección ReglaContableAplicacion) en el
  // useEffect de abajo; ya no vienen embebidos en el registro de ReglaContable.
  categoriasAplicacion: [],
  productosAplicacion: [],
  orden: String(registro.orden ?? 0),
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
  const [presetsDinamicos, setPresetsDinamicos] = useState<ReglaContable[]>([]);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [tenantsSel, setTenantsSel] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(registro ? draftDesdeRegistro(registro) : draftInicial);
    setTenantsSel([]);
    if (!registro) {
      // Tenants de la rama del JWT (tenantjerarquiacounters). Sin selección aplica al tenant actual.
      reglasContablesService.listarTenantsAutorizables()
        .then((data) => setTenantOptions(data.map((t) => ({ value: t.tenantId, label: t.label }))))
        .catch(() => setTenantOptions([]));
    }
  }, [open, registro]);

  const toggleTenant = (id: string): void => {
    setTenantsSel((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  useEffect(() => {
    if (!open || !registro?.codigo) return;
    reglasContablesService.listarAplicacionesRegla(registro.codigo)
      .then(({ categoriasAplicacion, productosAplicacion }) => {
        setDraft((prev) => ({ ...prev, categoriasAplicacion, productosAplicacion }));
      })
      .catch(() => {
        // Sin aplicaciones parametrizadas aún; el draft queda con los arrays vacíos del estado inicial.
      });
  }, [open, registro?.codigo]);

  useEffect(() => {
    if (!open) return;
    productosService.listarCategorias()
      .then((data) => setCategorias(data))
      .catch((error) => {
        console.error('Error cargando categorias:', error);
        setCategorias([]);
      });
  }, [open]);

  useEffect(() => {
    if (!open || esEdicion) return;
    reglasContablesService.listarAdmin()
      .then((data) => setPresetsDinamicos(data))
      .catch(() => setPresetsDinamicos([]));
  }, [open, esEdicion]);


  const guardar = async (): Promise<void> => {
    if (!draft.codigo.trim() || !draft.nombre.trim()) {
      toast.error('Código y nombre son obligatorios.');
      return;
    }
    try {
      setSubmitting(true);
      const mostrarSelectorProductos = draft.aplicaEnCarrito || draft.aplicaEn === 'COMPRA';
      const categoriasAplicacion = mostrarSelectorProductos ? draft.categoriasAplicacion : [];
      const productosAplicacion = draft.aplicaEn === 'COMPRA' ? draft.productosAplicacion : [];
      // PUT/POST normal de la regla: sin categoriasAplicacion/productosAplicacion (esos campos ya no
      // se persisten en ReglaContable, viven en ReglaContableAplicacion). `categoriasAplicacion` es la
      // única excepción: se sigue enviando aquí de forma transitoria para que el backend sincronice
      // ProductoVentaRelacion (venta masiva) cuando aplicaEnCarrito está activo.
      const payloadBase = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        tipo: draft.tipo,
        tarifaCodigo: draft.tarifaCodigo,
        tarifa: Number(draft.tarifa) || 0,
        montoFijo: Number(draft.montoFijo) || 0,
        baseCalculo: draft.baseCalculo,
        aplicaEn: draft.aplicaEn,
        aplicaEnCarrito: draft.aplicaEnCarrito,
        categoriasAplicacion,
        // Mecanismo de venta/carrito (ProductoVentaRelacion); solo aplica cuando aplicaEnCarrito.
        productosEspecificos: draft.aplicaEnCarrito ? draft.productosAplicacion : [],
        estado: draft.estado,
      };
      let codigoFinal = registro?.codigo || draft.codigo.trim();
      if (esEdicion && registro) {
        const { msg } = await reglasContablesService.actualizar(registro.codigo, payloadBase);
        toast.success(msg || `Regla "${registro.codigo}" actualizada.`);
      } else {
        codigoFinal = draft.codigo.trim();
        const { msg } = await reglasContablesService.crear({
          codigo: codigoFinal,
          ...payloadBase,
          ...(tenantsSel.length > 0 ? { tenantIds: tenantsSel } : {}),
        });
        toast.success(msg || `Regla "${draft.codigo}" registrada.`);
      }
      // Segunda llamada: reemplaza el set de categorías/productos en ReglaContableAplicacion (fuente
      // de verdad que consume resolverTarifaAplicable, principalmente en ámbito COMPRA).
      // En creación sin selección no hay nada que reemplazar (y evita fallar si el tenant actual
      // no quedó incluido en los tenants autorizados).
      if (esEdicion || categoriasAplicacion.length > 0 || productosAplicacion.length > 0) {
        await reglasContablesService.reemplazarAplicacionesRegla(codigoFinal, {
          categoriasAplicacion,
          productosAplicacion,
        });
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
      return { ...prev, categoriasAplicacion: Array.from(actual), productosAplicacion: [] };
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
            <InventarioCodigoPresetField<ReglaContable>
              value={draft.codigo}
              onChange={(codigo) => setDraft((prev) => ({ ...prev, codigo }))}
              presets={presetsDinamicos}
              disabled={submitting || saving}
              label="Código"
              onPresetPick={(preset) =>
                setDraft((prev) => ({
                  ...prev,
                  codigo: preset.codigo,
                  nombre: preset.nombre,
                  tipo: preset.tipo,
                  tarifa: String(preset.tarifa ?? 0),
                  montoFijo: String(preset.montoFijo ?? 0),
                  baseCalculo: preset.baseCalculo,
                  aplicaEn: preset.aplicaEn,
                  orden: String(preset.orden ?? 0),
                  aplicaEnCarrito: preset.aplicaEnCarrito === true,
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
              onChange={(codigo) =>
                setDraft((prev) => ({
                  ...prev,
                  aplicaEn: codigo,
                  categoriasAplicacion: [],
                  productosAplicacion: [],
                }))
              }
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
          </div>

          <p className="text-xs text-muted-foreground">
            El código DIAN, su lista y si suma o resta al total se heredan del <span className="font-medium">tipo de regla</span> seleccionado (parametrízalo en «Parametrizar tipos»).
          </p>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              className={reglasContablesUi.input}
              value={draft.descripcion}
              onChange={(e) => setDraft((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>

          {!esEdicion && tenantOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Tenants autorizados</Label>
              <p className="text-xs text-muted-foreground">
                Selecciona a quién se le autoriza esta regla. Sin selección, aplica solo a tu tenant actual.
                Cada tenant debe tener el tipo y el ámbito activos en su catálogo.
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {tenantOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`regla-tenant-${option.value}`}
                      checked={tenantsSel.includes(option.value)}
                      onCheckedChange={() => toggleTenant(option.value)}
                      disabled={submitting || saving}
                    />
                    <Label htmlFor={`regla-tenant-${option.value}`} className="cursor-pointer font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
              {tenantsSel.length > 0 && (
                <p className="text-xs text-muted-foreground">{tenantsSel.length} tenant(s) seleccionado(s).</p>
              )}
            </div>
          )}

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

          {draft.aplicaEnCarrito || draft.aplicaEn === 'COMPRA' ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div>
                <Label>Categorias de aplicacion</Label>
                <p className={reglasContablesUi.description}>
                  {draft.aplicaEn === 'COMPRA'
                    ? 'Si no seleccionas categorias, se aplica a todos los productos del catálogo.'
                    : 'Si no seleccionas categorias, se aplica a todos los productos de venta.'}
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
              {(draft.aplicaEn === 'COMPRA' || draft.categoriasAplicacion.length > 0) && (
                <ReglaProductosMatriz
                  codigo={draft.codigo || (registro?.codigo ?? '')}
                  categorias={draft.categoriasAplicacion}
                  selectedIds={draft.productosAplicacion}
                  onChange={(ids) => setDraft((prev) => ({ ...prev, productosAplicacion: ids }))}
                  disabled={submitting || saving}
                  ambito={draft.aplicaEn}
                  catalogo={draft.aplicaEnCarrito ? 'VENTA' : 'GENERAL'}
                />
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
