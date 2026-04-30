import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type BodegaInventario, type InventarioProveedor } from '@/app/services/inventarioService';
import type { BackendProducto } from '@/app/services/productosService';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type LineId = string;

type OcLineDraft = {
  id: LineId;
  sku: string;
  nombreProducto: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
  impuestos: string;
  bodega: string;
};

const newLineId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const calcSubtotalLinea = (line: OcLineDraft): number => {
  const q = Number(line.cantidad) || 0;
  const p = Number(line.precioUnitario) || 0;
  const d = Number(line.descuento) || 0;
  const t = Number(line.impuestos) || 0;
  const base = q * p;
  return Math.max(0, Math.round((base - d + t + Number.EPSILON) * 100) / 100);
};

export type InventarioOrdenCompraModalProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  proveedores: InventarioProveedor[];
  bodegas: BodegaInventario[];
  productos: BackendProducto[];
  onCreated: () => void | Promise<void>;
  showTrigger?: boolean;
  triggerClassName?: string;
};

export default function InventarioOrdenCompraModal({
  open,
  saving,
  onOpenChange,
  proveedores,
  bodegas,
  productos,
  onCreated,
  showTrigger = false,
  triggerClassName = '',
}: InventarioOrdenCompraModalProps): React.ReactElement {
  const bodegasActivas = useMemo(() => bodegas.filter((b) => b.estado !== false), [bodegas]);
  const productosConSku = useMemo(
    () => [...productos].filter((p) => p.sku).sort((a, b) => String(a.sku).localeCompare(String(b.sku))),
    [productos]
  );

  const [numeroOrden, setNumeroOrden] = useState('');
  const [numeroRemision, setNumeroRemision] = useState('');
  const [fechaOrden, setFechaOrden] = useState(() => new Date().toISOString().slice(0, 10));
  const [proveedorId, setProveedorId] = useState('');
  const [lines, setLines] = useState<OcLineDraft[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNumeroOrden('');
    setNumeroRemision('');
    setFechaOrden(new Date().toISOString().slice(0, 10));
    setProveedorId('');
    const b0 = bodegasActivas[0]?.nombre ?? '';
    setLines([
      {
        id: newLineId(),
        sku: '',
        nombreProducto: '',
        cantidad: '1',
        precioUnitario: '0',
        descuento: '0',
        impuestos: '0',
        bodega: b0,
      },
    ]);
  }, [open, bodegasActivas]);

  const addLine = (): void => {
    const b0 = bodegasActivas[0]?.nombre ?? '';
    setLines((prev) => [
      ...prev,
      {
        id: newLineId(),
        sku: '',
        nombreProducto: '',
        cantidad: '1',
        precioUnitario: '0',
        descuento: '0',
        impuestos: '0',
        bodega: b0,
      },
    ]);
  };

  const removeLine = (id: LineId): void => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const updateLine = (id: LineId, patch: Partial<Omit<OcLineDraft, 'id'>>): void => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const onSkuChange = (lineId: LineId, sku: string): void => {
    const prod = productosConSku.find((p) => String(p.sku) === sku);
    updateLine(lineId, {
      sku,
      nombreProducto: prod?.nombre ?? '',
      precioUnitario: prod ? String(Math.max(0, Number(prod.precio) || 0)) : '0',
    });
  };

  const totalOrden = useMemo(() => lines.reduce((acc, l) => acc + calcSubtotalLinea(l), 0), [lines]);

  const guardar = async (): Promise<void> => {
    const ord = numeroOrden.trim();
    if (!ord) {
      toast.error('El número de orden es obligatorio.');
      return;
    }
    if (!proveedorId) {
      toast.error('Selecciona un proveedor.');
      return;
    }
    const prov = proveedores.find((p) => p._id === proveedorId);
    if (!prov) {
      toast.error('Proveedor no válido.');
      return;
    }
    if (!fechaOrden) {
      toast.error('La fecha de la orden es obligatoria.');
      return;
    }

    const items = lines
      .map((l) => {
        const sku = String(l.sku || '').trim().toUpperCase();
        const cant = Number(l.cantidad);
        const precio = Number(l.precioUnitario);
        const desc = Number(l.descuento) || 0;
        const imp = Number(l.impuestos) || 0;
        const bod = String(l.bodega || '').trim();
        return {
          sku,
          nombreProducto: String(l.nombreProducto || '').trim(),
          cantidadOrdenada: cant,
          costoUnitario: precio,
          descuento: desc,
          impuestos: imp,
          bodega: bod,
        };
      })
      .filter((it) => it.sku && it.bodega && it.cantidadOrdenada > 0 && !Number.isNaN(it.costoUnitario) && it.costoUnitario >= 0);

    if (items.length === 0) {
      toast.error('Agrega al menos una línea con SKU, bodega, cantidad y precio válidos.');
      return;
    }

    try {
      setEnviando(true);
      const isoFecha = `${fechaOrden}T12:00:00.000Z`;
      await inventarioService.crearOrdenCompra({
        numeroOrden: ord,
        numeroRemision: numeroRemision.trim() || undefined,
        fechaOrden: isoFecha,
        proveedor: { nombre: prov.nombre.trim(), nit: prov.nit.trim() },
        documentoLegalCompra: {
          tipo: 'ORDEN_COMPRA',
          numero: ord,
          fecha: isoFecha,
        },
        items,
      });
      toast.success('Orden de compra registrada.');
      onOpenChange(false);
      await onCreated();
    } catch (error) {
      console.error('Error creando orden de compra:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo crear la orden.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {showTrigger ? (
        <Button type="button" variant="secondary" className={triggerClassName} onClick={() => onOpenChange(true)} disabled={saving || enviando}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Nueva orden de compra
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[95vh] max-w-5xl overflow-y-auto border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Nueva orden de compra
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Registra la OC con remisión opcional, fecha, proveedor e ítems con SKU, nombre, cantidades y valores de línea (descuento e impuestos en pesos).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Número de orden *</Label>
              <Input value={numeroOrden} onChange={(e) => setNumeroOrden(e.target.value)} placeholder="OC-2026-001" className="border-input bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Número de remisión</Label>
              <Input
                value={numeroRemision}
                onChange={(e) => setNumeroRemision(e.target.value)}
                placeholder="REM-123 (opcional)"
                className="border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de creación *</Label>
              <Input type="date" value={fechaOrden} onChange={(e) => setFechaOrden(e.target.value)} className="border-input bg-background" />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Proveedor *</Label>
              <Select value={proveedorId || undefined} onValueChange={setProveedorId}>
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder={proveedores.length ? 'Selecciona proveedor' : 'Sin proveedores'} />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-border bg-popover">
                  {proveedores.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.nombre} · NIT {p.nit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-base font-medium">Detalle de ítems</Label>
              <Button type="button" size="sm" variant="outline" onClick={addLine} disabled={saving || enviando}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar línea
              </Button>
            </div>
            <ScrollArea className="w-full rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">SKU</TableHead>
                    <TableHead className="min-w-[140px]">Nombre producto</TableHead>
                    <TableHead className="w-24 text-right">Cantidad</TableHead>
                    <TableHead className="min-w-[100px] text-right">Precio u.</TableHead>
                    <TableHead className="min-w-[90px] text-right">Descuento</TableHead>
                    <TableHead className="min-w-[90px] text-right">Impuestos</TableHead>
                    <TableHead className="min-w-[100px] text-right">Subtotal</TableHead>
                    <TableHead className="min-w-[130px]">Bodega</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="align-top">
                        <Select value={line.sku || undefined} onValueChange={(v) => onSkuChange(line.id, v)}>
                          <SelectTrigger className="h-9 border-input bg-background">
                            <SelectValue placeholder="SKU" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 border-border bg-popover">
                            {productosConSku.map((p) => (
                              <SelectItem key={p.iud} value={String(p.sku)}>
                                {p.sku}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="mt-1 h-8 border-input bg-background text-xs"
                          value={line.sku}
                          onChange={(e) => updateLine(line.id, { sku: e.target.value.toUpperCase() })}
                          placeholder="O escribe SKU"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={line.nombreProducto}
                          onChange={(e) => updateLine(line.id, { nombreProducto: e.target.value })}
                          className="border-input bg-background"
                          placeholder="Nombre"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background text-right"
                          value={line.cantidad}
                          onChange={(e) => updateLine(line.id, { cantidad: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background text-right"
                          value={line.precioUnitario}
                          onChange={(e) => updateLine(line.id, { precioUnitario: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background text-right"
                          value={line.descuento}
                          onChange={(e) => updateLine(line.id, { descuento: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background text-right"
                          value={line.impuestos}
                          onChange={(e) => updateLine(line.id, { impuestos: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top text-right text-sm font-medium tabular-nums">
                        {moneyCo(calcSubtotalLinea(line))}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select value={line.bodega || undefined} onValueChange={(v) => updateLine(line.id, { bodega: v })}>
                          <SelectTrigger className="h-9 border-input bg-background">
                            <SelectValue placeholder="Bodega" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 border-border bg-popover">
                            {bodegasActivas.map((b) => (
                              <SelectItem key={b._id} value={b.nombre}>
                                {b.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLine(line.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <p className="text-right text-sm font-semibold text-foreground">
              Total orden: <span className="tabular-nums">{moneyCo(totalOrden)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Subtotal por línea = (cantidad × precio unitario) − descuento + impuestos. El backend recalcula y persiste el valor final.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || enviando}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void guardar()} disabled={saving || enviando}>
              <Save className="mr-2 h-4 w-4" />
              Guardar orden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
