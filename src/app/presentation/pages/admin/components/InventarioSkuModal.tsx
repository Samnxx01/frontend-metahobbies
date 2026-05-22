import React from 'react';
import { RefreshCw, Save, SlidersHorizontal } from 'lucide-react';
import type { InventarioUnidadMedida } from '@/app/services/inventarioService';
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
  descripcion: string;
};

type InventarioSkuModalProps = {
  open: boolean;
  saving: boolean;
  form: SkuForm;
  unidadesMedida: InventarioUnidadMedida[];
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: SkuForm) => void;
  onOpenUnidadMedida: () => void;
  onSubmit: () => void;
};

export default function InventarioSkuModal({
  open,
  saving,
  form,
  unidadesMedida,
  onOpenChange,
  onFormChange,
  onOpenUnidadMedida,
  onSubmit,
}: InventarioSkuModalProps): React.ReactElement {
  const update = (field: keyof SkuForm, value: string): void => {
    onFormChange({ ...form, [field]: value });
  };
  const calcularDigitoEan13 = (base12: string): string => {
    const suma = base12.split('').reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return String((10 - (suma % 10)) % 10);
  };
  const generarCodigoBarras = (): void => {
    const timestamp = Date.now().toString().slice(-9);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const base = `${timestamp}${random}`.slice(0, 12).padStart(12, '0');
    update('codigoBarras', `${base}${calcularDigitoEan13(base)}`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear SKU de inventario</DialogTitle>
          <DialogDescription>
            Crea un producto fisico activo para usarlo en los movimientos de kardex.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>SKU *</Label>
            <Input value={form.sku} onChange={(event) => update('sku', event.target.value.toUpperCase())} placeholder="CAM-BAS-M" />
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
              inputMode="numeric"
              value={form.codigoBarras}
              onChange={(event) => update('codigoBarras', event.target.value.replace(/\D/g, ''))}
              placeholder="Automatico al crear"
            />
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
            <Label>Stock minimo</Label>
            <Input type="number" min="0" value={form.stockMinimo} onChange={(event) => update('stockMinimo', event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripcion</Label>
            <Textarea value={form.descripcion} onChange={(event) => update('descripcion', event.target.value)} placeholder="Detalle interno del producto" />
          </div>
        </div>

        <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Se creara activo para movimientos de kardex.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={onSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Crear y seleccionar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
