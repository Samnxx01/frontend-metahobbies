import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import type { InventarioOrdenCompra, RecepcionOrdenCompraResponse } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export type DocumentoSoporte = { tipo: string; numero: string };

export type InventarioComprobanteEntradaModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RecepcionOrdenCompraResponse | null;
  documentoSoporte?: DocumentoSoporte | null;
};

const getOrdenFromData = (data: RecepcionOrdenCompraResponse | null): InventarioOrdenCompra | null => data?.orden ?? null;

export default function InventarioComprobanteEntradaModal({
  open,
  onOpenChange,
  data,
  documentoSoporte = null,
}: InventarioComprobanteEntradaModalProps): React.ReactElement {
  const orden = getOrdenFromData(data);

  const total = useMemo(() => {
    const items = data?.recepcion?.items ?? [];
    return items.reduce((acc, it) => acc + Math.max(0, Number(it.cantidadRecibida || 0) * Number(it.costoUnitario || 0)), 0);
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(980px,calc(100vw-2rem))] max-w-none border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Comprobante de entrada
          </DialogTitle>
        </DialogHeader>

        {!data || !orden ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No hay información de comprobante.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Recepción</p>
                <p className="font-mono text-sm font-semibold text-foreground">{data.recepcion.numeroRecepcion}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orden compra</p>
                <p className="font-mono text-sm font-semibold text-foreground">{orden.numeroOrden}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado OC</p>
                <Badge variant="outline" className="mt-1">
                  {orden.estado}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Documento soporte</p>
                <p className="text-sm text-foreground">
                  {documentoSoporte?.tipo?.trim() ? documentoSoporte.tipo : '—'} {documentoSoporte?.numero?.trim() ? `· ${documentoSoporte.numero}` : ''}
                </p>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="text-sm text-foreground">{orden.proveedor?.nombre}</p>
                <p className="text-xs text-muted-foreground">NIT {orden.proveedor?.nit}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Detalle recibido</p>
                <p className="text-sm font-semibold text-foreground">
                  Total: <span className="tabular-nums">{moneyCo(total)}</span>
                </p>
              </div>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-right">Cant. recibida</TableHead>
                      <TableHead className="text-right">Costo unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recepcion.items.map((it, idx) => {
                      const subtotal = Math.max(0, Number(it.cantidadRecibida || 0) * Number(it.costoUnitario || 0));
                      return (
                        <TableRow key={`${it.sku}-${it.bodega}-${idx}`}>
                          <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                          <TableCell className="text-sm text-foreground">{it.bodega}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(it.cantidadRecibida ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{moneyCo(Number(it.costoUnitario ?? 0))}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{moneyCo(subtotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={() => {
              // impresión básica del navegador (el usuario puede “Guardar como PDF”)
              window.print();
            }}
            disabled={!data}
          >
            Imprimir / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

