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
  const [confirmando, setConfirmando] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const orden = ordenLocal ?? ordenProp;
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
    if (!ordenId || !mostrarConfirmar) {
      if (!ordenId) toast.error('No se pudo identificar la orden de compra.');
      return;
    }
    setConfirmando(true);
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
      setOrdenLocal(actualizada);
      onOrdenActualizada?.(actualizada);
      toast.success(
        `Orden ${orden.numeroOrden} confirmada. Comprobante contable ${data?.comprobanteContable?.numero || ''} generado.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo confirmar la orden.');
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1120px,calc(100vw-2rem))] max-w-none border-border bg-background text-foreground">
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
            <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="font-mono text-sm font-semibold text-foreground">
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
                        <TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                          Sin ítems.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              <div className="ml-auto w-full max-w-sm rounded-md border border-border bg-card p-3 text-sm">
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
