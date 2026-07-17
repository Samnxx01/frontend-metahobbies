import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, CircleHelp, RefreshCw, Save, SlidersHorizontal } from 'lucide-react';
import type { InventarioUnidadMedida } from '@/app/services/inventarioService';
import type { BackendTipoProducto } from '@/app/services/productosService';
import {
  generarCodigoBarrasDesdeSkú,
  normalizarCodigoBarrasAlfanumerico,
} from '@/app/presentation/pages/admin/inventario/inventarioBarcodeUtils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type SkuForm = {
  sku: string;
  codigoBarras: string;
  nombre: string;
  precio: string;
  tipo: string;
  unidadMedida: string;
  stockMinimo: string;
  /** Cantidad total en kardex (todas las bodegas). Solo lectura en UI. */
  stockKardex: string;
  descripcion: string;
};

type InventarioSkuModalProps = {
  open: boolean;
  saving: boolean;
  mode?: 'create' | 'edit';
  form: SkuForm;
  unidadesMedida: InventarioUnidadMedida[];
  tiposProducto: BackendTipoProducto[];
  codigosBarrasExistentes?: string[];
  excluirCodigoBarras?: string;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: SkuForm) => void;
  onOpenUnidadMedida: () => void;
  onOpenTipoProducto: () => void;
  onSubmit: () => void;
};

const calcularDisponibleVenta = (stockKardex: number, stockMinimo: number): number => {
  const total = Math.max(0, Number(stockKardex) || 0);
  const reserva = Math.max(0, Number(stockMinimo) || 0);
  return Math.max(0, total - reserva);
};

export default function InventarioSkuModal({
  open,
  saving,
  mode = 'create',
  form,
  unidadesMedida,
  tiposProducto,
  codigosBarrasExistentes = [],
  excluirCodigoBarras = '',
  onOpenChange,
  onFormChange,
  onOpenUnidadMedida,
  onOpenTipoProducto,
  onSubmit,
}: InventarioSkuModalProps): React.ReactElement {
  const esEdicion = mode === 'edit';
  const [ayudaVisible, setAyudaVisible] = useState(false);
  const update = (field: keyof SkuForm, value: string): void => {
    onFormChange({ ...form, [field]: value });
  };
  const codigoExcluido = normalizarCodigoBarrasAlfanumerico(excluirCodigoBarras);
  const codigosExistentesSet = useMemo(
    () => new Set(
      codigosBarrasExistentes
        .map((codigo) => normalizarCodigoBarrasAlfanumerico(codigo))
        .filter((codigo) => codigo && codigo !== codigoExcluido),
    ),
    [codigosBarrasExistentes, codigoExcluido],
  );
  const codigoNormalizado = normalizarCodigoBarrasAlfanumerico(form.codigoBarras);
  const codigoDuplicado = codigoNormalizado.length >= 8 && codigosExistentesSet.has(codigoNormalizado);
  const stockKardexNum = Number(form.stockKardex || 0);
  const stockMinimoNum = Number(form.stockMinimo || 0);
  const disponibleVenta = calcularDisponibleVenta(stockKardexNum, stockMinimoNum);
  const stockMinimoExcedeKardex = esEdicion && stockMinimoNum > stockKardexNum;
  const generarCodigoBarras = (): void => {
    const candidato = generarCodigoBarrasDesdeSkú(form.sku, codigosExistentesSet);
    update('codigoBarras', candidato);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* flex+max-h para fijar header/footer y hacer scroll solo en el cuerpo */}
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">

        {/* ── HEADER fijo ── */}
        <div className="shrink-0 border-b px-6 pb-4 pt-6">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="leading-tight">
                {esEdicion ? 'Editar SKU de inventario' : 'Crear SKU de inventario'}
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 px-2 text-muted-foreground"
                onClick={() => setAyudaVisible((v) => !v)}
                aria-label="Ayuda del formulario"
              >
                <CircleHelp className="h-4 w-4" />
                <span className="hidden sm:inline">Ayuda</span>
                {ayudaVisible ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
            <DialogDescription className="mt-1">
              {esEdicion
                ? 'Actualiza los datos del producto. El stock minimo se valida contra el kardex.'
                : 'Crea un producto activo para usarlo en los movimientos de kardex.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── CUERPO con scroll ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Panel de ayuda colapsable */}
          {ayudaVisible && (
            <div className="mb-5 rounded-md border border-info/20 bg-info/10 p-4 text-sm text-info">
              <p className="mb-3 font-semibold">Guia de campos</p>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {[
                  { titulo: 'SKU', desc: 'Codigo unico del producto. No se puede modificar despues de crearlo. Usa un formato descriptivo: CAM-BAS-M.' },
                  { titulo: 'Codigo de barras', desc: '"Generar" lo crea desde el SKU. Manual: 8-14 caracteres alfanumericos (CODE 128) o exactamente 13 digitos (EAN-13) para pistola laser.' },
                  { titulo: 'Nombre', desc: 'Visible en kardex, comprobantes y catalogo. Se guarda en mayusculas.' },
                  { titulo: 'Precio', desc: 'Precio base de venta. Las reglas de ventas pueden aplicar descuentos sobre este valor.' },
                  { titulo: 'Tipo de producto', desc: 'FISICO (maneja stock en bodega), SERVICIO (sin stock), DIGITAL, etc. Define el comportamiento en ventas e inventario.' },
                  { titulo: 'Unidad de medida', desc: 'Como se cuantifica: UNIDAD, KG, MT, LT, etc. Aparece en kardex y comprobantes.' },
                  { titulo: 'Stock minimo (reserva)', desc: 'Unidades bloqueadas que no se ofrecen en venta. Disponible = Kardex total − Stock minimo. Colchon ante devoluciones o urgencias.' },
                  { titulo: 'Descripcion', desc: 'Detalle interno del producto. Solo visible en administracion, no en catalogo publico ni comprobantes.' },
                ].map(({ titulo, desc }) => (
                  <div key={titulo}>
                    <p className="font-medium">{titulo}</p>
                    <p className="text-xs leading-relaxed text-info">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input
                value={form.sku}
                disabled={esEdicion}
                onChange={(event) => update('sku', event.target.value.toUpperCase())}
                placeholder="CAM-BAS-M"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Codigo de barras</Label>
                <Button type="button" variant="outline" size="sm" onClick={generarCodigoBarras}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Generar
                </Button>
              </div>
              <Input
                value={form.codigoBarras}
                onChange={(event) => update('codigoBarras', normalizarCodigoBarrasAlfanumerico(event.target.value))}
                placeholder="8-14 chars o vacio para auto"
                maxLength={14}
                aria-invalid={codigoDuplicado}
                className={codigoDuplicado ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {codigoDuplicado ? (
                <p className="text-xs text-destructive">El codigo debe ser unico.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Deja vacio para auto-generarlo. Code 128 (alfanumerico) o EAN-13 (13 digitos).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(event) => update('nombre', event.target.value)} placeholder="Camisa basica" />
            </div>

            <div className="space-y-2">
              <Label>Precio *</Label>
              <Input type="number" min="1" value={form.precio} onChange={(event) => update('precio', event.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Tipo de producto</Label>
                <Button type="button" variant="outline" size="sm" onClick={onOpenTipoProducto}>
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Parametrizar</span>
                </Button>
              </div>
              <Select value={form.tipo} onValueChange={(value) => update('tipo', value)}>
                <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposProducto.map((tipo) => (
                    <SelectItem key={tipo._id ?? tipo.iud ?? tipo.nombre} value={tipo.nombre ?? ''}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Unidad de medida</Label>
                <Button type="button" variant="outline" size="sm" onClick={onOpenUnidadMedida}>
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Parametrizar</span>
                </Button>
              </div>
              <Select value={form.unidadMedida} onValueChange={(value) => update('unidadMedida', value)}>
                <SelectTrigger><SelectValue placeholder="Selecciona unidad" /></SelectTrigger>
                <SelectContent>
                  {unidadesMedida.filter((unidad) => unidad.estado).map((unidad) => (
                    <SelectItem key={unidad._id} value={unidad.codigo}>
                      {unidad.nombre} ({unidad.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stock minimo (reserva)</Label>
              <Input
                type="number"
                min="0"
                max={esEdicion ? stockKardexNum : undefined}
                value={form.stockMinimo}
                onChange={(event) => update('stockMinimo', event.target.value)}
                aria-invalid={stockMinimoExcedeKardex}
                className={stockMinimoExcedeKardex ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {stockMinimoExcedeKardex ? (
                <p className="text-xs text-destructive">
                  La reserva no puede superar el stock kardex ({stockKardexNum.toLocaleString('es-CO')} uds).
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Unidades bloqueadas. Disponible para venta: {disponibleVenta.toLocaleString('es-CO')}.
                </p>
              )}
            </div>

            {esEdicion && (
              <div className="space-y-2">
                <Label>Stock kardex actual</Label>
                <Input type="number" value={stockKardexNum} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  Suma de saldos en todas las bodegas.
                </p>
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label>Descripcion</Label>
              <Textarea
                value={form.descripcion}
                onChange={(event) => update('descripcion', event.target.value)}
                placeholder="Detalle interno del producto"
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* ── FOOTER fijo ── */}
        <div className="shrink-0 border-t px-6 pb-5 pt-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {esEdicion ? 'El codigo SKU no se puede modificar.' : 'Se creara activo para movimientos de kardex.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="button" onClick={onSubmit} disabled={saving || codigoDuplicado || stockMinimoExcedeKardex}>
                <Save className="mr-2 h-4 w-4" />
                {esEdicion ? 'Guardar cambios' : 'Crear y seleccionar'}
              </Button>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
