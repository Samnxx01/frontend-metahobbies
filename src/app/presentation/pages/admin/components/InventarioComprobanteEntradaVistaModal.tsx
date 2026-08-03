import React from 'react';
import { CheckCircle2, FileText, Loader2, Pencil, Save, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
  onConfirmarComprobante?: (recepcionId: string) => Promise<void>;
  confirmandoComprobanteId?: string;
};

export default function InventarioComprobanteEntradaVistaModal({
  open,
  recepcionId,
  onOpenChange,
  onConfirmarComprobante,
  confirmandoComprobanteId,
}: InventarioComprobanteEntradaVistaModalProps): React.ReactElement {
  const [loading, setLoading] = React.useState(false);
  const [detalle, setDetalle] = React.useState<ComprobanteEntradaDetalle | null>(null);
  const [editando, setEditando] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [cantidades, setCantidades] = React.useState<Record<string, string>>({});

  const cargarDetalle = React.useCallback(async (): Promise<void> => {
    if (!recepcionId) return;
    const data = await inventarioService.obtenerDetalleComprobanteEntrada(recepcionId);
    setDetalle(data);
    setCantidades(Object.fromEntries(data.items.map((item) => [
      item.lineaKey || `${item.sku}-${item.bodega}`,
      String(item.cantidadRecibida),
    ])));
  }, [recepcionId]);

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
        if (!cancelled) {
          setDetalle(data);
          setEditando(false);
          setCantidades(Object.fromEntries(data.items.map((item) => [
            item.lineaKey || `${item.sku}-${item.bodega}`,
            String(item.cantidadRecibida),
          ])));
        }
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

  const desgloseEditado = React.useMemo(() => (detalle?.items || []).map((item) => {
    const key = item.lineaKey || `${item.sku}-${item.bodega}`;
    const cantidadOriginal = Number(item.cantidadRecibida || 0);
    const cantidad = editando ? Number(cantidades[key] || 0) : cantidadOriginal;
    const factor = cantidadOriginal > 0 ? cantidad / cantidadOriginal : 0;
    const escalar = (valor?: number) => Math.round((Number(valor || 0) * factor + Number.EPSILON) * 100) / 100;
    return {
      key,
      cantidad,
      subtotalBruto: escalar(item.desglose?.subtotalBruto),
      descuento: escalar(item.desglose?.descuento),
      baseGravable: escalar(item.desglose?.baseGravable),
      iva: escalar(item.desglose?.iva),
      total: item.desglose
        ? escalar(item.desglose.total)
        : subtotalLineaComprobanteEntrada(cantidad, Number(item.costoUnitario || 0)),
    };
  }), [detalle, editando, cantidades]);
  const resumen = React.useMemo(() => desgloseEditado.reduce((acc, item) => ({
    subtotalBruto: acc.subtotalBruto + item.subtotalBruto,
    descuento: acc.descuento + item.descuento,
    baseGravable: acc.baseGravable + item.baseGravable,
    iva: acc.iva + item.iva,
    total: acc.total + item.total,
  }), { subtotalBruto: 0, descuento: 0, baseGravable: 0, iva: 0, total: 0 }), [desgloseEditado]);
  const total = resumen.total;
  const pendienteConfirmacion = String(detalle?.estado || '').trim().toUpperCase() === 'PENDIENTE_APROBACION';
  const confirmando = Boolean(recepcionId && confirmandoComprobanteId === recepcionId);

  const guardarEdicion = async (): Promise<void> => {
    if (!recepcionId || !detalle) return;
    const items = detalle.items.map((item) => {
      const key = item.lineaKey || `${item.sku}-${item.bodega}`;
      return {
        ordenItemIndex: item.ordenItemIndex,
        sku: item.sku,
        cantidadRecibida: Number(cantidades[key]),
      };
    });
    if (items.some((item) => !Number.isFinite(item.cantidadRecibida) || item.cantidadRecibida <= 0)) {
      toast.error('Todas las cantidades recibidas deben ser mayores que cero.');
      return;
    }
    try {
      setGuardando(true);
      await inventarioService.actualizarComprobanteEntradaPendiente(recepcionId, { items });
      await cargarDetalle();
      setEditando(false);
      toast.success('Comprobante actualizado. Ya puede confirmarlo.');
    } catch (error) {
      console.error('Error actualizando comprobante:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el comprobante.');
    } finally {
      setGuardando(false);
    }
  };

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
          {pendienteConfirmacion && recepcionId ? (
            <div className="absolute right-14 top-5 flex items-center gap-2">
              {editando ? (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditando(false)} disabled={guardando}>
                    <X className="mr-2 h-4 w-4" /> Cancelar edición
                  </Button>
                  <Button type="button" size="sm" onClick={() => void guardarEdicion()} disabled={guardando}>
                    {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    id="editar-comprobante-entrada"
                    data-testid="editar-comprobante-entrada"
                    data-recepcion-id={recepcionId}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditando(true)}
                    disabled={confirmando}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void onConfirmarComprobante?.(recepcionId)}
                    disabled={confirmando}
                  >
                    {confirmando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {confirmando ? 'Confirmando...' : 'Confirmar comprobante'}
                  </Button>
                </>
              )}
            </div>
          ) : null}
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
                      const calculada = desgloseEditado.find((row) => row.key === (it.lineaKey || `${it.sku}-${it.bodega}`));
                      const subtotal = calculada?.total ?? Number(it.subtotal || 0);
                      return (
                        <TableRow key={it.lineaKey || `${it.sku}-${it.bodega}`}>
                          <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                          <TableCell>{it.bodega}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {editando ? (
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="ml-auto h-8 w-28 text-right"
                                value={cantidades[it.lineaKey || `${it.sku}-${it.bodega}`] ?? ''}
                                onChange={(event) => setCantidades((actual) => ({
                                  ...actual,
                                  [it.lineaKey || `${it.sku}-${it.bodega}`]: event.target.value,
                                }))}
                              />
                            ) : formatQty(Number(it.cantidadRecibida || 0))}
                          </TableCell>
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
              <div className="ml-auto grid w-full max-w-sm gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between gap-4"><span>Subtotal bruto</span><span className="font-medium tabular-nums">{moneyCo(resumen.subtotalBruto)}</span></div>
                <div className="flex justify-between gap-4"><span>Descuento</span><span className="font-medium tabular-nums">- {moneyCo(resumen.descuento)}</span></div>
                <div className="flex justify-between gap-4"><span>Base gravable</span><span className="font-medium tabular-nums">{moneyCo(resumen.baseGravable)}</span></div>
                <div className="flex justify-between gap-4"><span>IVA según tarifa</span><span className="font-medium tabular-nums">+ {moneyCo(resumen.iva)}</span></div>
                <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold"><span>Total recibido</span><span className="tabular-nums">{moneyCo(resumen.total)}</span></div>
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
