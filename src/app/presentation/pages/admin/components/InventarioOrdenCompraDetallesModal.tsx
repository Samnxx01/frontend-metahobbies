import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type EstadoOrdenCompraConfig, type InventarioOrdenCompra } from '@/app/services/inventarioService';
import {
  formatActualizadaOrdenCompra,
  formatCreadaOrdenCompra,
  getOrdenCompraId,
  textoUsuarioAuditoria,
} from '@/app/presentation/pages/admin/utils/ordenCompraIdUtils';
import { descuentoMontoLinea } from '@/app/presentation/pages/admin/utils/ordenCompraLineaCalculo';
import {
  estadoOrdenBadgeClass,
  labelEstadoOrdenCompra,
  puedeConfirmarOrdenCompra,
} from '@/app/presentation/pages/admin/utils/estadoOrdenCompraUi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const desgloseLinea = (line: InventarioOrdenCompra['items'][number]) => {
  const subtotalBruto = Math.max(0, (Number(line.cantidadOrdenada) || 0) * (Number(line.costoUnitario) || 0));
  const descuento = descuentoMontoLinea(subtotalBruto, line);
  const baseCalculada = Math.max(0, subtotalBruto - descuento);
  const baseImpuestoPersistida = Number(line.baseImpuestoAlGuardar);
  const baseImpuesto = Number.isFinite(baseImpuestoPersistida) && baseImpuestoPersistida >= 0
    ? baseImpuestoPersistida
    : baseCalculada;
  const tarifa = Number(line.tarifaReglaAlGuardar ?? line.impuestoPorcentaje ?? 0) || 0;
  const impuestoPersistido = Number(line.impuestos);
  const impuesto = Number.isFinite(impuestoPersistido) && impuestoPersistido >= 0
    ? impuestoPersistido
    : Math.max(0, baseImpuesto * (tarifa / 100) + Number(line.montoFijoReglaAlGuardar || 0));
  const totalLinea = Math.max(0, subtotalBruto - descuento + impuesto);
  return { subtotalBruto, descuento, baseImpuesto, tarifa, impuesto, totalLinea };
};

const textoDescuentoLinea = (line: {
  cantidadOrdenada?: number;
  costoUnitario?: number;
  descuento?: number;
  descuentoPorcentaje?: number;
}): string => {
  const bruto = (Number(line.cantidadOrdenada) || 0) * (Number(line.costoUnitario) || 0);
  const monto = descuentoMontoLinea(bruto, line);
  return monto > 0 ? moneyCo(monto) : '—';
};

export type InventarioOrdenCompraDetallesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: InventarioOrdenCompra | null;
  estadosOrden?: EstadoOrdenCompraConfig[];
  onOrdenActualizada?: (orden: InventarioOrdenCompra) => void;
};

export default function InventarioOrdenCompraDetallesModal({
  open,
  onOpenChange,
  orden: ordenProp,
  estadosOrden = [],
  onOrdenActualizada,
}: InventarioOrdenCompraDetallesModalProps): React.ReactElement {
  const [ordenLocal, setOrdenLocal] = useState<InventarioOrdenCompra | null>(null);
  // Set de ids en confirmación (no un solo booleano): el modal se queda montado y puede
  // reabrirse con OTRA orden mientras una confirmación anterior sigue corriendo en segundo
  // plano — un booleano único dejaba el botón de la orden nueva bloqueado por la vieja.
  const [confirmandoIds, setConfirmandoIds] = useState<Set<string>>(new Set());
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const orden = ordenLocal ?? ordenProp;
  const ordenIdActual = getOrdenCompraId(orden);
  const confirmando = Boolean(ordenIdActual && confirmandoIds.has(ordenIdActual));
  const mostrarConfirmar = Boolean(orden && puedeConfirmarOrdenCompra(orden.estado, estadosOrden));
  const resumen = useMemo(() => (orden?.items ?? []).reduce(
    (acc, item) => {
      const linea = desgloseLinea(item);
      acc.subtotal += linea.subtotalBruto;
      acc.descuento += linea.descuento;
      acc.base += linea.baseImpuesto;
      acc.iva += linea.impuesto;
      acc.total += linea.totalLinea;
      return acc;
    },
    { subtotal: 0, descuento: 0, base: 0, iva: 0, total: 0 },
  ), [orden]);

  React.useEffect(() => {
    if (!open) {
      setOrdenLocal(null);
      return;
    }
    if (!ordenProp) {
      setOrdenLocal(null);
      return;
    }
    const ordenId = getOrdenCompraId(ordenProp);
    if (!ordenId) {
      setOrdenLocal(ordenProp);
      return;
    }
    setOrdenLocal(ordenProp);
    setCargandoDetalle(true);
    void inventarioService
      .obtenerOrdenCompra(ordenId)
      .then((detalle) => setOrdenLocal(detalle))
      .catch(() => setOrdenLocal(ordenProp))
      .finally(() => setCargandoDetalle(false));
  }, [open, ordenProp]);

  const confirmarOrden = async (): Promise<void> => {
    const ordenId = getOrdenCompraId(orden);
    if (!ordenId || !mostrarConfirmar || !orden) {
      if (!ordenId) toast.error('No se pudo identificar la orden de compra.');
      return;
    }
    const numeroOrden = orden.numeroOrden;

    // Confirmar genera movimientos + comprobante contable por cada ítem de la orden — puede
    // tardar varios segundos. Cerramos el modal ya y avisamos por toast al terminar, en vez
    // de dejar el formulario bloqueado esperando la respuesta. El resultado igual se refleja
    // en la tabla vía onOrdenActualizada, aunque el modal ya esté cerrado o muestre otra orden.
    onOpenChange(false);
    setConfirmandoIds((prev) => new Set(prev).add(ordenId));
    const toastId = toast.loading(`Confirmando orden ${numeroOrden}...`);
    try {
      const data = await inventarioService.confirmarOrdenCompra(ordenId);
      const base = data?.orden ?? orden;
      const actualizada: InventarioOrdenCompra = {
        ...base,
        estado: 'CONFIRMADO',
        comprobanteContable: base.comprobanteContable ?? {
          numero: data?.comprobanteContable?.numero,
          documentoSoporteId: data?.comprobanteContable?.documentoSoporteId ?? null,
          confirmadoEn: new Date().toISOString(),
        },
      };
      // Solo pisa el estado local si el modal sigue mostrando ESTA orden — si mientras
      // tanto se abrió otra, no queremos sobreescribirla con datos de la confirmación vieja.
      if (getOrdenCompraId(ordenLocal ?? ordenProp) === ordenId) {
        setOrdenLocal(actualizada);
      }
      onOrdenActualizada?.(actualizada);
      toast.update(toastId, {
        render: `Orden ${numeroOrden} confirmada. Comprobante contable ${data?.comprobanteContable?.numero || ''} generado.`,
        type: 'success',
        isLoading: false,
        autoClose: 6000,
      });
    } catch (error) {
      toast.update(toastId, {
        render: error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo confirmar la orden.',
        type: 'error',
        isLoading: false,
        autoClose: 8000,
      });
    } finally {
      setConfirmandoIds((prev) => {
        const next = new Set(prev);
        next.delete(ordenId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[1120px] overflow-y-auto border-border bg-background p-3 text-foreground sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalles orden de compra
            </DialogTitle>
            {mostrarConfirmar ? (
              <Button type="button" size="sm" onClick={() => void confirmarOrden()} disabled={confirmando}>
                {confirmando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Confirmar orden
              </Button>
            ) : null}
          </div>
          <DialogDescription className="sr-only">
            Detalle de la orden de compra, ítems y acción de confirmación contable.
          </DialogDescription>
        </DialogHeader>

        {!orden ? (
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">No hay orden seleccionada.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid min-w-0 gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Número OC</p>
                <p className="font-mono text-sm font-semibold text-foreground">{orden.numeroOrden}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <Badge variant="outline" className={`mt-1 ${estadoOrdenBadgeClass(orden.estado)}`} title={orden.estado}>
                  {labelEstadoOrdenCompra(orden.estado, estadosOrden)}
                </Badge>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="break-words text-sm text-foreground">{orden.proveedor?.nombre}</p>
                <p className="break-words text-xs text-muted-foreground">NIT {orden.proveedor?.nit}</p>
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
                  {cargandoDetalle ? 'Cargando…' : formatCreadaOrdenCompra(orden)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actualizada</p>
                <p className="text-sm text-foreground">
                  {cargandoDetalle ? 'Cargando…' : formatActualizadaOrdenCompra(orden)}
                </p>
              </div>
            </div>

            {orden.comprobanteContable?.numero ? (
              <div className="rounded-md border border-success/30 bg-success/5 p-3">
                <p className="text-xs text-muted-foreground">Comprobante contable (orden de compra)</p>
                <p className="break-all font-mono text-sm font-semibold text-foreground">
                  {orden.comprobanteContable.tipo ? `${orden.comprobanteContable.tipo} · ` : ''}
                  {orden.comprobanteContable.numero}
                </p>
                {orden.comprobanteContable.usuario ? (
                  <p className="text-xs text-muted-foreground">
                    Ejecutado por: {textoUsuarioAuditoria({ usuario: orden.comprobanteContable.usuario })}
                  </p>
                ) : null}
                {orden.comprobanteContable.confirmadoEn ? (
                  <p className="text-xs text-muted-foreground">
                    Confirmado: {new Date(orden.comprobanteContable.confirmadoEn).toLocaleString('es-CO')}
                  </p>
                ) : null}
              </div>
            ) : null}

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
                  Total: <span className="tabular-nums">{moneyCo(resumen.total)}</span>
                </p>
              </div>
              <div className="space-y-3 md:hidden">
                {(orden.items ?? []).map((it, idx) => {
                  const desglose = desgloseLinea(it);
                  return (
                    <article key={`${it.sku}-${it.bodega}-${idx}`} className="min-w-0 rounded-md border border-border bg-card p-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-foreground">{it.nombreProducto || '—'}</p>
                          {it.descripcion ? <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">{it.descripcion}</p> : null}
                        </div>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{it.sku}</span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="col-span-2 min-w-0">
                          <dt className="text-muted-foreground">Proveedor</dt>
                          <dd className="break-words text-foreground">{orden.proveedor?.nombre || 'Proveedor no identificado'}{orden.proveedor?.nit ? ` · NIT ${orden.proveedor.nit}` : ''}</dd>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <dt className="text-muted-foreground">Bodega</dt>
                          <dd className="break-words text-foreground">{it.bodega}</dd>
                        </div>
                        <div><dt className="text-muted-foreground">Cant. ordenada</dt><dd className="tabular-nums text-foreground">{Number(it.cantidadOrdenada ?? 0)}</dd></div>
                        <div><dt className="text-muted-foreground">Cant. recibida</dt><dd className="tabular-nums text-foreground">{Number((it as { cantidadRecibida?: number }).cantidadRecibida ?? 0)}</dd></div>
                        <div><dt className="text-muted-foreground">Precio</dt><dd className="tabular-nums text-foreground">{moneyCo(Number(it.costoUnitario ?? 0))}</dd></div>
                        <div><dt className="text-muted-foreground">Descuento</dt><dd className="tabular-nums text-foreground">{textoDescuentoLinea(it)}</dd></div>
                        <div><dt className="text-muted-foreground">Impuesto</dt><dd className="tabular-nums text-foreground">{desglose.tarifa}% · {moneyCo(desglose.impuesto)}</dd></div>
                        <div><dt className="text-muted-foreground">Total línea</dt><dd className="font-semibold tabular-nums text-foreground">{moneyCo(desglose.totalLinea)}</dd></div>
                      </dl>
                    </article>
                  );
                })}
                {(orden.items ?? []).length === 0 ? (
                  <div className="rounded-md border border-border py-6 text-center text-sm text-muted-foreground">Sin ítems.</div>
                ) : null}
              </div>
              <div className="hidden overflow-x-auto rounded-md border border-border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-right">Cant. ord.</TableHead>
                      <TableHead className="text-right">Cant. rec.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Desc. (COP)</TableHead>
                      <TableHead className="text-right">Imp. %</TableHead>
                      <TableHead className="text-right">IVA (COP)</TableHead>
                      <TableHead className="text-right">Total linea</TableHead>
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
                        <TableCell><span className="block text-sm">{orden.proveedor?.nombre || 'Proveedor no identificado'}</span>{orden.proveedor?.nit ? <span className="block text-xs text-muted-foreground">NIT {orden.proveedor.nit}</span> : null}</TableCell>
                        <TableCell className="text-sm text-foreground">{it.bodega}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(it.cantidadOrdenada ?? 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number((it as { cantidadRecibida?: number }).cantidadRecibida ?? 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{moneyCo(Number(it.costoUnitario ?? 0))}</TableCell>
                        <TableCell className="text-right tabular-nums">{textoDescuentoLinea(it)}</TableCell>
                        <TableCell className="text-right tabular-nums">{desgloseLinea(it).tarifa}%</TableCell>
                        <TableCell className="text-right tabular-nums">{moneyCo(desgloseLinea(it).impuesto)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{moneyCo(desgloseLinea(it).totalLinea)}</TableCell>
                      </TableRow>
                    ))}
                    {(orden.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="py-6 text-center text-sm text-muted-foreground">
                          Sin ítems.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              <div className="ml-auto w-full rounded-md border border-border bg-card p-3 text-sm sm:max-w-sm">
                <div className="flex justify-between gap-4 py-1 text-muted-foreground">
                  <span>Subtotal bruto</span>
                  <span className="tabular-nums text-foreground">{moneyCo(resumen.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 py-1 text-muted-foreground">
                  <span>Descuento</span>
                  <span className="tabular-nums text-foreground">- {moneyCo(resumen.descuento)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border py-1 text-muted-foreground">
                  <span>Base gravable</span>
                  <span className="tabular-nums text-foreground">{moneyCo(resumen.base)}</span>
                </div>
                <div className="flex justify-between gap-4 py-1 text-muted-foreground">
                  <span>IVA según tarifa</span>
                  <span className="tabular-nums text-foreground">+ {moneyCo(resumen.iva)}</span>
                </div>
                <div className="mt-1 flex justify-between gap-4 border-t border-border pt-2 font-semibold text-foreground">
                  <span>Total orden</span>
                  <span className="tabular-nums">{moneyCo(resumen.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
