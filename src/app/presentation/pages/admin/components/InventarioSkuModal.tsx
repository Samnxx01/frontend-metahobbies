import React, { useMemo } from 'react';
import { RefreshCw, Save, SlidersHorizontal } from 'lucide-react';
import type { InventarioUnidadMedida } from '@/app/services/inventarioService';
import { normalizarCodigoBarrasAlfanumerico } from '@/app/presentation/pages/admin/inventario/inventarioBarcodeUtils';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type SkuForm = {
  sku: string;
  codigoBarras: string;
  nombre: string;
  precio: string;
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
  codigosBarrasExistentes?: string[];
  excluirCodigoBarras?: string;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: SkuForm) => void;
  onOpenUnidadMedida: () => void;
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
  codigosBarrasExistentes = [],
  excluirCodigoBarras = '',
  onOpenChange,
  onFormChange,
  onOpenUnidadMedida,
  onSubmit,
}: InventarioSkuModalProps): React.ReactElement {
  const esEdicion = mode === 'edit';
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
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let intento = 0; intento < 16; intento += 1) {
      const tsPart = Date.now().toString(36).toUpperCase();
      let code = `B${tsPart}`;
      while (code.length < 12) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      const candidato = code.slice(0, 12);
      if (!codigosExistentesSet.has(candidato)) {
        update('codigoBarras', candidato);
        return;
      }
    }
    update('codigoBarras', `B${Date.now().toString(36).toUpperCase()}`.slice(0, 12));
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar SKU de inventario' : 'Crear SKU de inventario'}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? 'Actualiza los datos del producto fisico. El stock minimo se valida contra las cantidades del kardex.'
              : 'Crea un producto fisico activo para usarlo en los movimientos de kardex.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
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
                <RefreshCw className="mr-2 h-4 w-4" />
                Generar
              </Button>
            </div>
            <Input
              value={form.codigoBarras}
              onChange={(event) => update('codigoBarras', normalizarCodigoBarrasAlfanumerico(event.target.value))}
              placeholder="Manual (8-14) o automatico al crear"
              maxLength={14}
              aria-invalid={codigoDuplicado}
              className={codigoDuplicado ? 'border-destructive focus-visible:ring-destructive' : undefined}
            />
            {codigoDuplicado ? (
              <p className="text-xs text-destructive">El codigo debe ser unico.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Deja vacio para generarlo automaticamente o escribe tu codigo alfanumerico unico (8-14 caracteres).
                Se imprime en Code 128 (alfanumerico) o EAN-13 (si son 13 digitos) para lectura con pistola laser.
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
              <Label>Unidad de medida</Label>
              <Button type="button" variant="outline" size="sm" onClick={onOpenUnidadMedida}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Parametrizar
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
                Unidades que no se ofrecen en venta. Disponible para venta: {disponibleVenta.toLocaleString('es-CO')}.
              </p>
            )}
          </div>
          {esEdicion ? (
            <div className="space-y-2">
              <Label>Stock kardex actual</Label>
              <Input type="number" value={stockKardexNum} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Suma de saldos en todas las bodegas. Se recalcula al abrir edicion.
              </p>
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <Label>Descripcion</Label>
            <Textarea value={form.descripcion} onChange={(event) => update('descripcion', event.target.value)} placeholder="Detalle interno del producto" />
          </div>
        </div>

        <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {esEdicion ? 'El codigo SKU no se puede modificar.' : 'Se creara activo para movimientos de kardex.'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={onSubmit} disabled={saving || codigoDuplicado || stockMinimoExcedeKardex}>
              <Save className="mr-2 h-4 w-4" />
              {esEdicion ? 'Guardar cambios' : 'Crear y seleccionar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
