import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import type { InventarioOrdenCompra } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const calcSubtotalLinea = (line: {
  cantidadOrdenada?: number;
  costoUnitario?: number;
  descuento?: number;
  impuestoPorcentaje?: number;
  impuestos?: number;
  subtotal?: number;
}): number => {
  const subtotal = Number(line.subtotal);
  if (!Number.isNaN(subtotal) && subtotal > 0) return subtotal;

  const q = Number(line.cantidadOrdenada) || 0;
  const p = Number(line.costoUnitario) || 0;
  const d = Number(line.descuento) || 0;
  const taxPercent = Number(line.impuestoPorcentaje) || 0;
  const base = q * p;
  const baseNeta = Math.max(0, base - d);
  const taxAmount =
    !Number.isNaN(Number(line.impuestos)) && Number(line.impuestos) > 0 ? Number(line.impuestos) : baseNeta * (taxPercent / 100);
  return Math.max(0, round2(baseNeta + taxAmount));
};

export type InventarioOrdenCompraDetallesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: InventarioOrdenCompra | null;
};

export default function InventarioOrdenCompraDetallesModal({
  open,
  onOpenChange,
  orden,
}: InventarioOrdenCompraDetallesModalProps): React.ReactElement {
  const total = useMemo(() => (orden?.items ?? []).reduce((acc, it) => acc + calcSubtotalLinea(it), 0), [orden]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1120px,calc(100vw-2rem))] max-w-none border-border bg-background text-foreground">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Detalles orden de compra
          </DialogTitle>
        </DialogHeader>

        {!orden ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">No hay orden seleccionada.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Número OC</p>
                <p className="font-mono text-sm font-semibold text-foreground">{orden.numeroOrden}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <Badge variant="outline" className="mt-1">
                  {orden.estado}
                </Badge>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="text-sm text-foreground">{orden.proveedor?.nombre}</p>
                <p className="text-xs text-muted-foreground">NIT {orden.proveedor?.nit}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remisión</p>
                <p className="text-sm text-foreground">{orden.numeroRemision?.trim() || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Factura electrónica</p>
                <p className="text-sm text-foreground">{orden.numeroFacturaElectronico?.trim() || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creada</p>
                <p className="text-sm text-foreground">
                  {orden.createdAt ? new Date(orden.createdAt).toLocaleString('es-CO') : orden.fechaOrden ? new Date(orden.fechaOrden).toLocaleString('es-CO') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actualizada</p>
                <p className="text-sm text-foreground">{orden.updatedAt ? new Date(orden.updatedAt).toLocaleString('es-CO') : '—'}</p>
              </div>
            </div>

            {orden.concepto ? (
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Concepto</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{orden.concepto}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Ítems</p>
                <p className="text-sm font-semibold text-foreground">
                  Total: <span className="tabular-nums">{moneyCo(total)}</span>
                </p>
              </div>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-right">Cant. ord.</TableHead>
                      <TableHead className="text-right">Cant. rec.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Desc.</TableHead>
                      <TableHead className="text-right">Imp. %</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(orden.items ?? []).map((it, idx) => (
                      <TableRow key={`${it.sku}-${it.bodega}-${idx}`}>
                        <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                        <TableCell className="max-w-[360px]">
                          <p className="text-sm text-foreground">{it.nombreProducto || '—'}</p>
                          {it.descripcion ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{it.descripcion}</p> : null}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{it.bodega}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(it.cantidadOrdenada ?? 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number((it as any).cantidadRecibida ?? 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{moneyCo(Number(it.costoUnitario ?? 0))}</TableCell>
                        <TableCell className="text-right tabular-nums">{moneyCo(Number(it.descuento ?? 0))}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(it.impuestoPorcentaje ?? 0)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{moneyCo(calcSubtotalLinea(it))}</TableCell>
                      </TableRow>
                    ))}
                    {(orden.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                          Sin ítems.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

