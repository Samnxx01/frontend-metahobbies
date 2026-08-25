import React from 'react';
import { Ban, CheckCircle2, FileText, Loader2, Pencil, RotateCcw, Save, X } from 'lucide-react';
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
import { textoUsuarioAuditoria } from '@/app/presentation/pages/admin/utils/ordenCompraIdUtils';

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
  /** Ids de comprobantes confirmándose en segundo plano (no solo el de este modal): permite
   * cerrar esta ventana y abrir/confirmar otro comprobante mientras el anterior sigue en
   * curso, en vez de bloquear hasta que termine — igual que en órdenes de compra. */
  confirmandoIds?: Set<string>;
  /** Se dispara tras anular o regenerar: la orden de compra, el stock y el listado de
   * comprobantes usados por el formulario de "Registrar movimiento" quedan desactualizados. */
  onCambio?: (recepcionId: string) => Promise<void>;
};

export default function InventarioComprobanteEntradaVistaModal({
  open,
  recepcionId,
  onOpenChange,
  onConfirmarComprobante,
  confirmandoIds,
  onCambio,
}: InventarioComprobanteEntradaVistaModalProps): React.ReactElement {
  const [loading, setLoading] = React.useState(false);
  const [detalle, setDetalle] = React.useState<ComprobanteEntradaDetalle | null>(null);
  const [editando, setEditando] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [cantidades, setCantidades] = React.useState<Record<string, string>>({});
  const [anulando, setAnulando] = React.useState(false);
  const [anulacionOpen, setAnulacionOpen] = React.useState(false);
  const [justificacionAnulacion, setJustificacionAnulacion] = React.useState('');
  const [regenerando, setRegenerando] = React.useState(false);

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
  const estadoNorm = String(detalle?.estado || '').trim().toUpperCase();
  const pendienteConfirmacion = estadoNorm === 'PENDIENTE_APROBACION';
  const anuladaParaRegenerar = estadoNorm === 'ANULADA';
  const confirmando = Boolean(recepcionId && confirmandoIds?.has(recepcionId));
  const mostrarAnular = Boolean(recepcionId) && !anuladaParaRegenerar;

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

  const anularComprobante = async (): Promise<void> => {
    if (!recepcionId || justificacionAnulacion.trim().length < 5) {
      toast.error('Indique una justificacion de al menos 5 caracteres.');
      return;
    }
    try {
      setAnulando(true);
      await inventarioService.anularRecepcionOrdenCompra(recepcionId, justificacionAnulacion.trim());
      await cargarDetalle();
      await onCambio?.(recepcionId);
      setAnulacionOpen(false);
      setJustificacionAnulacion('');
      toast.success('Comprobante anulado. Kardex, contable y orden de compra fueron revertidos; ya puede regenerarlo.');
    } catch (error) {
      console.error('Error anulando comprobante:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo anular el comprobante.');
    } finally {
      setAnulando(false);
    }
  };

  const regenerarComprobante = async (): Promise<void> => {
    if (!recepcionId) return;
    try {
      setRegenerando(true);
      // Reusa el mismo endpoint de confirmación: al estar ANULADA, el backend reconoce
      // el comprobante y lo reconstruye sobre la misma secuencia/numeroRecepcion, con
      // los mismos items de la orden de compra que tenía antes de anularse.
      await onConfirmarComprobante?.(recepcionId);
      await cargarDetalle();
      await onCambio?.(recepcionId);
    } finally {
      setRegenerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[980px] overflow-y-auto border-border bg-background p-3 text-foreground sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {(detalle?.reporteKardex?.length ?? 0) > 0
              ? 'Comprobante de entrada · Kardex registrado'
              : 'Comprobante de entrada'}
          </DialogTitle>
          {pendienteConfirmacion && recepcionId ? (
            <div className="flex flex-col gap-2 pr-8 sm:flex-row sm:flex-wrap">
              {editando ? (
                <>
                  <Button type="button" className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => setEditando(false)} disabled={guardando}>
                    <X className="mr-2 h-4 w-4" /> Cancelar edición
                  </Button>
                  <Button type="button" className="w-full sm:w-auto" size="sm" onClick={() => void guardarEdicion()} disabled={guardando}>
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
                    className="w-full sm:w-auto"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditando(true)}
                    disabled={confirmando}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
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
          {anuladaParaRegenerar && recepcionId ? (
            <div className="flex flex-col gap-2 pr-8 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="w-full sm:w-auto"
                size="sm"
                onClick={() => void regenerarComprobante()}
                disabled={regenerando || confirmando}
              >
                {regenerando || confirmando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                {regenerando || confirmando ? 'Regenerando...' : 'Regenerar comprobante'}
              </Button>
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
            <div className="grid min-w-0 gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
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
                {detalle.comprobanteContable?.confirmadoEn ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirmado: {formatDateTimeCo(detalle.comprobanteContable.confirmadoEn)}
                  </p>
                ) : null}
                {detalle.comprobanteContable?.usuario ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirmado por: {textoUsuarioAuditoria({ usuario: detalle.comprobanteContable.usuario })}
                  </p>
                ) : null}
              </div>
              {detalle.orden?.proveedor?.nombre ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Proveedor</p>
                  <p className="break-words text-sm font-medium">{detalle.orden.proveedor.nombre}</p>
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
              <div className="space-y-3 md:hidden">
                {detalle.items.map((it) => {
                  const key = it.lineaKey || `${it.sku}-${it.bodega}`;
                  const calculada = desgloseEditado.find((row) => row.key === key);
                  const subtotal = calculada?.total ?? Number(it.subtotal || 0);
                  return (
                    <article key={key} className="rounded-md border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">{it.nombreProducto || 'Producto sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">{it.bodega}</p>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{it.sku}</span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Recibido</dt>
                          <dd className="mt-1 tabular-nums">
                            {editando ? (
                              <Input type="number" min="0.01" step="0.01" className="h-9 w-full text-right" value={cantidades[key] ?? ''} onChange={(event) => setCantidades((actual) => ({ ...actual, [key]: event.target.value }))} />
                            ) : formatQty(Number(it.cantidadRecibida || 0))}
                          </dd>
                        </div>
                        <div><dt className="text-muted-foreground">Disponible kardex</dt><dd className="mt-1 tabular-nums">{formatQty(Number(it.disponibleKardex || 0))}</dd></div>
                        <div><dt className="text-muted-foreground">Kardex</dt><dd className="mt-1"><Badge variant="outline" className={estadoKardexLineaBadgeClass(it.estadoKardex)}>{labelEstadoKardexLinea(it.estadoKardex)}</Badge></dd></div>
                        <div><dt className="text-muted-foreground">Costo unitario</dt><dd className="mt-1 tabular-nums">{moneyCo(Number(it.costoUnitario || 0))}</dd></div>
                        <div className="col-span-2 border-t border-border pt-2"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold tabular-nums">{moneyCo(subtotal)}</dd></div>
                      </dl>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto rounded-md border border-border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Proveedor</TableHead>
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
                          <TableCell>
                            <span className="block text-sm font-medium">{it.nombreProducto || 'Producto sin nombre'}</span>
                            <span className="block font-mono text-xs text-muted-foreground">{it.sku}</span>
                          </TableCell>
                          <TableCell><span className="block text-sm">{detalle.orden?.proveedor?.nombre || 'Proveedor no identificado'}</span>{detalle.orden?.proveedor?.nit ? <span className="block text-xs text-muted-foreground">NIT {detalle.orden.proveedor.nit}</span> : null}</TableCell>
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
              <div className="ml-auto grid w-full gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm sm:max-w-sm">
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

        <DialogFooter className="gap-2 sm:gap-0">
          {mostrarAnular ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              variant="destructive"
              onClick={() => setAnulacionOpen(true)}
              disabled={confirmando || anulando || regenerando}
            >
              <Ban className="mr-2 h-4 w-4" /> Anular comprobante
            </Button>
          ) : null}
          <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>

        <Dialog open={anulacionOpen} onOpenChange={setAnulacionOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md border-border bg-background text-foreground">
            <DialogHeader>
              <DialogTitle>Anular comprobante de entrada</DialogTitle>
              <DialogDescription>
                Se revierte el kardex, el comprobante contable y la cantidad recibida en la orden de compra. Luego
                podrá regenerarlo reutilizando la misma secuencia y los mismos items.
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={justificacionAnulacion}
              onChange={(event) => setJustificacionAnulacion(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Motivo de la anulación"
              className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAnulacionOpen(false)} disabled={anulando}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void anularComprobante()}
                disabled={anulando || justificacionAnulacion.trim().length < 5}
              >
                {anulando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                Confirmar anulación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
