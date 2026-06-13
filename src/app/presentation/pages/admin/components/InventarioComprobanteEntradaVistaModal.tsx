import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type ComprobanteEntradaDetalle } from '@/app/services/inventarioService';
import {
  estadoComprobanteEntradaBadgeClass,
  estadoKardexLineaBadgeClass,
  labelEstadoComprobanteEntrada,
  labelEstadoKardexLinea,
  salidaKardexComprobanteBadgeClass,
} from '@/app/presentation/pages/admin/utils/estadoComprobanteEntradaUi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import InventarioReporteKardexEntrada from './InventarioReporteKardexEntrada';
import { subtotalLineaComprobanteEntrada } from '@/app/presentation/pages/admin/utils/ordenCompraLineaCalculo';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const formatQty = (value: number): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);

const formatDateTimeCo = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

export type InventarioComprobanteEntradaVistaModalProps = {
  open: boolean;
  recepcionId: string | null;
  onOpenChange: (open: boolean) => void;
};

export default function InventarioComprobanteEntradaVistaModal({
  open,
  recepcionId,
  onOpenChange,
}: InventarioComprobanteEntradaVistaModalProps): React.ReactElement {
  const [loading, setLoading] = React.useState(false);
  const [detalle, setDetalle] = React.useState<ComprobanteEntradaDetalle | null>(null);

  React.useEffect(() => {
    if (!open || !recepcionId) {
      setDetalle(null);
      return;
    }
    let cancelled = false;
    const cargar = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await inventarioService.obtenerDetalleComprobanteEntrada(recepcionId);
        if (!cancelled) setDetalle(data);
      } catch (error) {
        console.error('Error cargando comprobante:', error);
        toast.error('No se pudo cargar el comprobante de entrada.');
        if (!cancelled) onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void cargar();
    return () => {
      cancelled = true;
    };
  }, [open, recepcionId, onOpenChange]);

  const total = React.useMemo(
    () => (detalle?.items || []).reduce(
      (acc, it) => acc + subtotalLineaComprobanteEntrada(
        Number(it.cantidadRecibida || 0),
        Number(it.costoUnitario || 0),
        it.subtotal,
      ),
      0,
    ),
    [detalle],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(980px,calc(100vw-2rem))] max-w-none border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {(detalle?.reporteKardex?.length ?? 0) > 0
              ? 'Comprobante de entrada · Kardex registrado'
              : 'Comprobante de entrada'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Consulta del comprobante de entrada, líneas recibidas y movimiento en kardex.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando comprobante...
          </div>
        ) : !detalle ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No hay información del comprobante.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Recepción</p>
                <p className="font-mono text-sm font-semibold">{detalle.numeroRecepcion}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orden compra</p>
                <p className="font-mono text-sm font-semibold">{detalle.orden?.numeroOrden || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado comprobante</p>
                <Badge
                  variant="outline"
                  className={`mt-1 ${estadoComprobanteEntradaBadgeClass(detalle.estado)}`}
                >
                  {labelEstadoComprobanteEntrada(detalle.estado)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salida en kardex</p>
                <Badge
                  variant="outline"
                  className={`mt-1 ${salidaKardexComprobanteBadgeClass(detalle.puedeSalidaComprobante)}`}
                >
                  {detalle.puedeSalidaComprobante ? 'Disponible' : 'Sin stock / pendiente kardex'}
                </Badge>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Documento soporte</p>
                <p className="text-sm">
                  {detalle.documentoSoporte.tipo} · {detalle.documentoSoporte.numero}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Creado: {formatDateTimeCo(detalle.createdAt)}</p>
              </div>
              {detalle.orden?.proveedor?.nombre ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Proveedor</p>
                  <p className="text-sm font-medium">{detalle.orden.proveedor.nombre}</p>
                  {detalle.orden.proveedor.nit ? (
                    <p className="text-xs text-muted-foreground">NIT {detalle.orden.proveedor.nit}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Detalle de líneas</p>
                <p className="text-sm font-semibold">Total: {moneyCo(total)}</p>
              </div>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-right">Recibido</TableHead>
                      <TableHead className="text-right">Disp. kardex</TableHead>
                      <TableHead>Kardex</TableHead>
                      <TableHead className="text-right">Costo unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.items.map((it) => {
                      const subtotal = subtotalLineaComprobanteEntrada(
                        Number(it.cantidadRecibida || 0),
                        Number(it.costoUnitario || 0),
                        it.subtotal,
                      );
                      return (
                        <TableRow key={it.lineaKey || `${it.sku}-${it.bodega}`}>
                          <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                          <TableCell>{it.bodega}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatQty(Number(it.cantidadRecibida || 0))}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatQty(Number(it.disponibleKardex || 0))}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={estadoKardexLineaBadgeClass(it.estadoKardex)}
                            >
                              {labelEstadoKardexLinea(it.estadoKardex)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{moneyCo(Number(it.costoUnitario || 0))}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{moneyCo(subtotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {(detalle.reporteKardex?.length ?? 0) > 0 ? (
              <InventarioReporteKardexEntrada lineas={detalle.reporteKardex ?? []} />
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
