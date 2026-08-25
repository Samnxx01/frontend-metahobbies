import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import carritoService, { type AuditoriaProductoCheck, type PedidoAprobado, type VentaReferenciaAdmin } from '@/app/services/carritoService';
import { formatearFechaHoraColombia } from '@/app/utils/fechaColombia';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronRight, CircleHelp, ClipboardList, Download, Eye, Loader2, MapPin, Package, Plus, ReceiptText, RefreshCw, Search, User, UserRoundCog, Warehouse } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import VentaManualModal from './components/VentaManualModal';
import TercerosCrudModal from './components/TercerosCrudModal';

interface PedidosHelpButtonProps {
  id: string;
  title: string;
  description: string;
  items: string[];
  align?: 'start' | 'center' | 'end';
}

function PedidosHelpButton({ id, title, description, items, align = 'end' }: PedidosHelpButtonProps): React.ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 px-2.5" aria-label={`Ayuda: ${title}`}>
          <CircleHelp className="h-4 w-4" />
          <span className="hidden sm:inline">Ayuda</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-80 max-w-[calc(100vw-2rem)] bg-card text-card-foreground">
        <PopoverHeader>
          <PopoverTitle className="text-sm">{title}</PopoverTitle>
          <PopoverDescription asChild>
            <div className="space-y-3 pt-1 text-xs leading-relaxed text-muted-foreground">
              <p>{description}</p>
              <ul className="list-disc space-y-1.5 pl-4">
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

const formatCOP = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const formatFecha = (value: string | null | undefined): string =>
  value ? formatearFechaHoraColombia(value) : '—';

const formatPorcentaje = (value: number | null | undefined): string =>
  value == null ? '—' : `${value.toFixed(2)} %`;

export default function PedidosAprobadosCarrito(): React.ReactElement {
  const [pedidos, setPedidos] = useState<PedidoAprobado[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [qAplicada, setQAplicada] = useState('');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [reaplicandoId, setReaplicandoId] = useState<string | null>(null);
  const [facturaLoadingId, setFacturaLoadingId] = useState<string | null>(null);
  const [facturaPreview, setFacturaPreview] = useState<{ url: string; nombre: string } | null>(null);
  const [auditoriaOpen, setAuditoriaOpen] = useState(false);
  const [auditorias, setAuditorias] = useState<AuditoriaProductoCheck[]>([]);
  const [auditoriaTotal, setAuditoriaTotal] = useState(0);
  const [auditoriaLoading, setAuditoriaLoading] = useState(false);
  const [auditoriaFiltros, setAuditoriaFiltros] = useState({ q: '', estado: '', fechaDesde: '', fechaHasta: '' });
  const [ventasOpen, setVentasOpen] = useState(false);
  const [ventas, setVentas] = useState<VentaReferenciaAdmin[]>([]);
  const [ventasTotal, setVentasTotal] = useState(0);
  const [ventasLoading, setVentasLoading] = useState(false);
  const [ventasFiltros, setVentasFiltros] = useState({ q: '', estado: '' });
  const [ventaManualOpen, setVentaManualOpen] = useState(false);
  const [tercerosOpen, setTercerosOpen] = useState(false);

  const cargarVentasReferencias = async (
    filtros: { q: string; estado: string } = ventasFiltros,
  ): Promise<void> => {
    try {
      setVentasLoading(true);
      const resp = await carritoService.listarVentasReferencias({ ...filtros, limit: 200 });
      setVentas(resp.data);
      setVentasTotal(resp.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las ventas referenciadas.');
    } finally {
      setVentasLoading(false);
    }
  };

  const cargarAuditorias = async ({ silencioso = false }: { silencioso?: boolean } = {}): Promise<void> => {
    try {
      if (!silencioso) setAuditoriaLoading(true);
      const resp = await carritoService.listarAuditoriasProducto({ ...auditoriaFiltros, limit: 200 });
      setAuditorias(resp.data);
      setAuditoriaTotal(resp.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las auditorías.');
    } finally { if (!silencioso) setAuditoriaLoading(false); }
  };

  useEffect(() => {
    if (!auditoriaOpen) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void cargarAuditorias({ silencioso: true });
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [auditoriaOpen, auditoriaFiltros]);

  const obtenerFacturaPdf = async (pedido: PedidoAprobado): Promise<{ blob: Blob; fileName: string }> => {
    if (!pedido.transactionId) throw new Error('El pedido no tiene ID de transacción para generar la factura.');
    await carritoService.emitirComprobantePedidoPdf({
      transactionId: pedido.transactionId,
      facturaId: pedido.invoiceNumber || undefined,
      ventaReferencia: pedido.ventaReferencia || undefined,
      referenciaPago: pedido.referenciaPago || undefined,
      carritoId: pedido.carritoId || undefined,
      snapshot: {
        estado: pedido.pagoEstado,
        facturaId: pedido.invoiceNumber,
        ventaReferencia: pedido.ventaReferencia,
        transactionId: pedido.transactionId,
        referenciaPago: pedido.referenciaPago,
        monto: pedido.total,
        total: pedido.total,
        moneda: pedido.moneda,
        email: pedido.facturacion.email,
        fecha: pedido.emitidaEn || pedido.fechaPedido,
        datosFacturacion: pedido.facturacion,
        items: pedido.items.map((item) => ({
          name: item.nombre,
          quantity: item.cantidad,
          price: item.precioVentaCobrado,
        })),
      },
    });
    return carritoService.descargarComprobantePedidoPdf(pedido.transactionId);
  };

  const visualizarFactura = async (pedido: PedidoAprobado): Promise<void> => {
    setFacturaLoadingId(pedido.id);
    try {
      const { blob, fileName } = await obtenerFacturaPdf(pedido);
      if (facturaPreview) URL.revokeObjectURL(facturaPreview.url);
      setFacturaPreview({ url: URL.createObjectURL(blob), nombre: fileName });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo visualizar la factura');
    } finally {
      setFacturaLoadingId(null);
    }
  };

  const descargarFactura = async (pedido: PedidoAprobado): Promise<void> => {
    setFacturaLoadingId(pedido.id);
    try {
      const { blob, fileName } = await obtenerFacturaPdf(pedido);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = fileName;
      enlace.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo descargar la factura');
    } finally {
      setFacturaLoadingId(null);
    }
  };

  const cargar = useCallback(async (q = qAplicada): Promise<void> => {
    setLoading(true);
    try {
      const resp = await carritoService.listarPedidosAprobados({ limit: 100, q: q || undefined });
      setPedidos(resp.data);
      setTotal(resp.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos');
      setPedidos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [qAplicada]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const toggleExpand = (id: string): void => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reaplicarKardex = async (pedidoId: string): Promise<void> => {
    setReaplicandoId(pedidoId);
    try {
      const result = await carritoService.reaplicarKardexPedido(pedidoId);
      if (result?.ok) {
        const esPendiente = String(result.msg || '').toLowerCase().includes('kardex pendiente')
          || String(result.msg || '').toLowerCase().includes('kardex no aplicado');
        if (esPendiente) {
          toast.warning(result.msg || 'Kardex pendiente.');
        } else {
          toast.success(result.msg || 'Kardex actualizado correctamente.');
        }
        await cargar();
      } else {
        const detalle = (result as { kardexDetalleError?: { causa?: string } })?.kardexDetalleError?.causa;
        toast.error(detalle || result.msg || 'No se pudo reaplicar el kardex.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error reaplicando kardex');
    } finally {
      setReaplicandoId(null);
    }
  };

  const onBuscar = (): void => {
    setQAplicada(busqueda.trim());
    void cargar(busqueda.trim());
  };

  return (
    <div className="container mx-auto max-w-7xl px-3 py-5 text-foreground sm:px-4 sm:py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            Pedidos aprobados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Facturas confirmadas (colección invoice) con detalle del carrito, pago Wompi e inventario.
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <PedidosHelpButton
            id="ayuda-pedidos-aprobados"
            title="Pedidos aprobados"
            description="Consulta facturas confirmadas y verifica su relación con el pago, el cliente y el inventario."
            items={['Busca por factura, venta, carrito, cliente, ciudad o producto.', 'Abre una fila para revisar precios, margen y kardex.', 'Visualiza o descarga el comprobante desde las acciones de factura.']}
          />
          <Badge variant="secondary" className="w-fit px-3 py-1 text-sm">
            {total} pedido{total === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_auto_auto_auto_auto_auto_auto] xl:items-center">
        <div className="relative min-w-0 xl:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por FAC, venta, carrito, cliente, ciudad, producto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
          />
        </div>
        <Button className="w-full sm:w-auto" type="button" onClick={() => setVentaManualOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Factura manual
        </Button>
        <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => { setAuditoriaOpen(true); void cargarAuditorias(); }}>
          <ClipboardList className="mr-2 h-4 w-4" /> Auditoría de pagos
        </Button>
        <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => { setVentasOpen(true); void cargarVentasReferencias(); }}>
          <ReceiptText className="mr-2 h-4 w-4" /> Ventas referenciadas
        </Button>
        <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => setTercerosOpen(true)}>
          <UserRoundCog className="mr-2 h-4 w-4" /> Terceros
        </Button>
        <Button className="w-full sm:w-auto" onClick={onBuscar} disabled={loading}>
          Buscar
        </Button>
        <Button className="w-full sm:w-auto" variant="outline" onClick={() => void cargar()} disabled={loading} aria-label="Actualizar pedidos" title="Actualizar pedidos">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Factura</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Factura a</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-right">Cant. total</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Factura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Cargando pedidos…
                </TableCell>
              </TableRow>
            ) : pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                  No hay pedidos aprobados{qAplicada ? ` para "${qAplicada}"` : ''}.
                </TableCell>
              </TableRow>
            ) : (
              pedidos.map((pedido) => {
                const abierto = expandidos.has(pedido.id);
                return (
                  <React.Fragment key={pedido.id}>
                    <TableRow className="hover:bg-muted/40">
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleExpand(pedido.id)}
                          aria-label={abierto ? 'Ocultar detalle' : 'Ver detalle'}
                        >
                          {abierto ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="font-semibold text-primary">
                          {pedido.invoiceNumber || '—'}
                        </div>
                        {pedido.invoiceEstado && (
                          <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0">
                            {pedido.invoiceEstado}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div>{pedido.ventaReferencia || '—'}</div>
                        {pedido.referenciaPago && (
                          <div className="text-muted-foreground mt-0.5">{pedido.referenciaPago}</div>
                        )}
                        {pedido.transactionId && (
                          <div className="text-muted-foreground mt-0.5 truncate max-w-[140px]" title={pedido.transactionId}>
                            TX: {pedido.transactionId.slice(0, 12)}…
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatFecha(pedido.fechaPedido)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{pedido.facturacion.nombre}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {pedido.facturacion.tipoDocumento}{' '}
                              {pedido.facturacion.numeroDocumento}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {pedido.facturacion.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{pedido.facturacion.ciudad || '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              {pedido.facturacion.departamento}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {pedido.cantidadTotalUnidades}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="font-semibold text-foreground">
                          {formatCOP(pedido.resumenMargen?.margenTotal ?? 0)}
                        </div>
                        <div className="text-xs font-medium text-foreground">
                          {formatPorcentaje(pedido.resumenMargen?.margenPorcentaje)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCOP(pedido.total)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          title="Visualizar factura"
                          disabled={facturaLoadingId === pedido.id || !pedido.transactionId}
                          onClick={() => void visualizarFactura(pedido)}
                        >
                          {facturaLoadingId === pedido.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Eye className="h-4 w-4" />}
                        </Button>{' '}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          title="Descargar factura"
                          disabled={facturaLoadingId === pedido.id || !pedido.transactionId}
                          onClick={() => void descargarFactura(pedido)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {abierto && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={10} className="p-0">
                          <div className="px-6 py-4 space-y-3">
                            <div className="flex flex-wrap gap-4 text-sm rounded-md border bg-background/80 px-4 py-3">
                              <div>
                                <span className="text-muted-foreground">ID factura: </span>
                                <span className="font-mono text-xs">{pedido.invoiceId || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Nº factura: </span>
                                <span className="font-medium">{pedido.invoiceNumber || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Estado invoice: </span>
                                <span className="font-medium">{pedido.invoiceEstado || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Costo (kardex): </span>
                                <span className="font-medium">
                                  {formatCOP(pedido.resumenMargen?.costoTotal ?? 0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Venta ítems: </span>
                                <span className="font-medium">
                                  {formatCOP(pedido.resumenMargen?.ventaItemsTotal ?? 0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Margen: </span>
                                <span className="font-semibold text-foreground">
                                  {formatCOP(pedido.resumenMargen?.margenTotal ?? 0)}{' '}
                                  <span className="text-foreground">
                                    ({formatPorcentaje(pedido.resumenMargen?.margenPorcentaje)})
                                  </span>
                                </span>
                              </div>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Productos, precios y kardex
                            </p>
                            <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Producto</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead className="text-right">Cant.</TableHead>
                                  <TableHead className="text-right">Precio SKU</TableHead>
                                  <TableHead className="text-right">Precio relación</TableHead>
                                  <TableHead className="text-right">Precio cobrado</TableHead>
                                  <TableHead className="text-right">Costo salida Kardex</TableHead>
                                  <TableHead className="text-right">Margen</TableHead>
                                  <TableHead className="text-right">Stock kardex</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pedido.items.map((item, idx) => (
                                  <TableRow key={`${pedido.id}-${idx}`}>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell className="font-mono text-xs whitespace-nowrap">
                                      {item.skuOrigen || item.sku || '—'}
                                    </TableCell>
                                    <TableCell className="text-right">{item.cantidad}</TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                      {formatCOP(item.precioSkuOrigen)}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                      {formatCOP(item.precioVentaRelacion)}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                      {formatCOP(item.precioVentaCobrado)}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                      <div>{formatCOP(item.costoUnitarioMovimiento || item.costoUnitarioSku)}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {item.costoFuente === 'INVENTARIO_MOVIMIENTOS'
                                          ? `${item.movimientosKardex} movimiento(s)`
                                          : 'Saldo actual (respaldo)'}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                      <div className="font-semibold text-foreground">
                                        {formatCOP(item.margenTotal)}
                                      </div>
                                      <div className="text-xs font-medium text-foreground">
                                        {formatCOP(item.margenUnitario)} / ud ·{' '}
                                        {formatPorcentaje(item.margenPorcentaje)}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {item.stockActualKardex != null
                                        ? item.stockActualKardex.toLocaleString('es-CO')
                                        : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCOP(item.subtotal)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-xs text-muted-foreground">
                                Dirección: {pedido.facturacion.direccion || '—'} · Tel:{' '}
                                {pedido.facturacion.telefono || '—'}
                                {(pedido.kardexSalidasRegistradas ?? 0) > 0 ? (
                                  <> · Kardex: {pedido.kardexSalidasRegistradas} salida(s) registrada(s)</>
                                ) : null}
                              </p>
                              {pedido.puedeReaplicarKardex ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={reaplicandoId === pedido.id}
                                  onClick={() => void reaplicarKardex(pedido.id)}
                                >
                                  {reaplicandoId === pedido.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <Warehouse className="h-4 w-4 mr-1" />
                                  )}
                                  Reaplicar kardex
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Kardex ya aplicado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <VentaManualModal
        open={ventaManualOpen}
        onOpenChange={setVentaManualOpen}
        onCreated={() => cargar()}
      />
      <TercerosCrudModal open={tercerosOpen} onOpenChange={setTercerosOpen} />
      <Dialog open={ventasOpen} onOpenChange={setVentasOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden bg-card p-3 text-card-foreground sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-5 lg:w-[min(1180px,calc(100vw-3rem))]">
          <DialogHeader className="shrink-0 pr-8 text-left">
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
                <ReceiptText className="h-5 w-5 shrink-0 text-primary" /> Ventas referenciadas
              </DialogTitle>
              <PedidosHelpButton
                id="ayuda-ventas-referenciadas"
                title="Ventas referenciadas"
                description="Relaciona cada venta con su referencia de pago y el estado reportado por la pasarela."
                items={['Busca por venta, referencia o transacción.', 'Consulta el cliente, estado de venta, estado del pago y monto.', 'La tabla se desplaza horizontalmente en pantallas pequeñas.']}
              />
            </div>
          </DialogHeader>
          <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
            <Input
              className="w-full min-w-0"
              value={ventasFiltros.q}
              onChange={(event) => setVentasFiltros((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Venta, referencia de pago, transacciÃ³n..."
              onKeyDown={(event) => event.key === 'Enter' && void cargarVentasReferencias()}
            />
            <select
              className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-card-foreground"
              value={ventasFiltros.estado}
              onChange={(event) => {
                const next = { ...ventasFiltros, estado: event.target.value };
                setVentasFiltros(next);
                void cargarVentasReferencias(next);
              }}
            >
              <option value="">Todos los estados</option>
              {['PENDIENTE', 'CONFIRMADO', 'CANCELADO'].map((estado) => <option key={estado}>{estado}</option>)}
            </select>
            <Button className="h-10 w-full md:w-auto" type="button" onClick={() => void cargarVentasReferencias()} disabled={ventasLoading}>
              {ventasLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Consultar
            </Button>
          </div>
          <p className="shrink-0 text-sm text-muted-foreground">{ventasTotal} registro(s) encontrados</p>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-md border border-border bg-card">
            <Table className="min-w-[980px]">
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <TableRow>
                  <TableHead>Fecha</TableHead><TableHead>Venta</TableHead><TableHead>Referencia pago</TableHead>
                  <TableHead>TransacciÃ³n</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead><TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventasLoading ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                ) : ventas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No hay ventas referenciadas para los filtros seleccionados.</TableCell></TableRow>
                ) : ventas.map((venta) => {
                  const clienteNombre = venta.terceroId?.nombreCompleto || venta.terceroId?.razonSocial || venta.terceroId?.nombre || venta.auditoriaPagoId?.clienteNombre || 'â€”';
                  const clienteCorreo = venta.terceroId?.correo || venta.terceroId?.email || venta.auditoriaPagoId?.emailCliente || '';
                  return (
                    <TableRow key={venta.id}>
                      <TableCell className="whitespace-nowrap">{formatFecha(venta.confirmadaEn || venta.createdAt)}</TableCell>
                      <TableCell><div className="font-medium">{venta.ventaReferencia || 'Pendiente de consecutivo'}</div><div className="font-mono text-xs text-muted-foreground">{venta.id}</div></TableCell>
                      <TableCell className="font-mono text-xs">{venta.referenciaPago || 'â€”'}</TableCell>
                      <TableCell className="max-w-40 truncate font-mono text-xs" title={venta.transactionId || ''}>{venta.transactionId || 'â€”'}</TableCell>
                      <TableCell><div>{clienteNombre}</div><div className="text-xs text-muted-foreground">{clienteCorreo}</div></TableCell>
                      <TableCell><Badge variant={venta.estado === 'CONFIRMADO' ? 'default' : 'outline'}>{venta.estado}</Badge></TableCell>
                      <TableCell><Badge variant={venta.estadoPago === 'APPROVED' ? 'default' : 'outline'}>{venta.estadoPago || 'â€”'}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-right">{formatCOP(Number(venta.monto || 0))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={auditoriaOpen} onOpenChange={setAuditoriaOpen}>
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden bg-card p-4 text-card-foreground sm:w-[95vw] sm:p-6">
          <DialogHeader className="pr-8">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
                <ClipboardList className="h-5 w-5 shrink-0 text-primary" /> Auditoría de pagos de productos
              </DialogTitle>
              <PedidosHelpButton
                id="ayuda-auditoria-pagos-productos"
                title="Auditoría de pagos"
                description="Revisa las validaciones de las transacciones de productos y su estado de procesamiento."
                items={['Combina texto, estado y fechas para limitar los resultados.', 'Procesado indica si el pago aprobado ya fue aplicado al pedido.', 'Limpiar restablece los campos y Filtrar ejecuta la consulta.']}
              />
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              className="sm:col-span-2 lg:col-span-2" value={auditoriaFiltros.q}
              onChange={(e) => setAuditoriaFiltros((prev) => ({ ...prev, q: e.target.value }))}
              placeholder="Referencia, transacción, correo, documento..."
            />
            <select
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-card-foreground"
              value={auditoriaFiltros.estado}
              onChange={(e) => setAuditoriaFiltros((prev) => ({ ...prev, estado: e.target.value }))}
            >
              <option value="">Todos los estados</option>
              {['CREATED', 'PENDING', 'APPROVED', 'DECLINED', 'VOIDED'].map((estado) => <option key={estado}>{estado}</option>)}
            </select>
            <Input type="date" value={auditoriaFiltros.fechaDesde} onChange={(e) => setAuditoriaFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))} />
            <Input type="date" value={auditoriaFiltros.fechaHasta} onChange={(e) => setAuditoriaFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{auditoriaTotal} registro(s) encontrados</p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button type="button" variant="outline" onClick={() => {
                setAuditoriaFiltros({ q: '', estado: '', fechaDesde: '', fechaHasta: '' });
              }}>Limpiar</Button>
              <Button type="button" onClick={() => void cargarAuditorias()} disabled={auditoriaLoading}>
                {auditoriaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Filtrar
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
            <Table className="min-w-[900px]">
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <TableRow>
                  <TableHead>Fecha</TableHead><TableHead>Referencia</TableHead><TableHead>Transacción</TableHead>
                  <TableHead>Cliente</TableHead><TableHead>Estado</TableHead><TableHead>Procesado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditoriaLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                ) : auditorias.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No hay auditorías para los filtros seleccionados.</TableCell></TableRow>
                ) : auditorias.map((audit) => (
                  <TableRow key={audit._id || audit.iud || audit.referenciaPersonalizada}>
                    <TableCell className="whitespace-nowrap">{formatFecha(audit.fechaActualizacion || audit.fechaCreacion)}</TableCell>
                    <TableCell><div className="font-medium">{audit.referenciaPersonalizada}</div><div className="text-xs text-muted-foreground">{audit.referencia || '—'}</div></TableCell>
                    <TableCell className="max-w-40 truncate font-mono text-xs" title={audit.transactionId || ''}>{audit.transactionId || '—'}</TableCell>
                    <TableCell><div>{audit.clienteNombre || '—'}</div><div className="text-xs text-muted-foreground">{audit.emailCliente}</div><div className="text-xs text-muted-foreground">{audit.clienteDocumento || ''}</div></TableCell>
                    <TableCell><Badge variant={audit.estado === 'APPROVED' ? 'default' : 'outline'}>{audit.estado}</Badge></TableCell>
                    <TableCell>{audit.procesado ? 'Sí' : 'No'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCOP(audit.monto || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(facturaPreview)}
        onOpenChange={(open) => {
          if (open || !facturaPreview) return;
          URL.revokeObjectURL(facturaPreview.url);
          setFacturaPreview(null);
        }}
      >
        <DialogContent className="flex h-[90vh] w-[95vw] max-w-5xl flex-col gap-3 overflow-hidden p-4">
          <DialogHeader className="shrink-0 pr-10">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="truncate">{facturaPreview?.nombre || 'Factura'}</DialogTitle>
              {facturaPreview ? (
                <Button asChild type="button" size="sm" variant="outline" className="shrink-0">
                  <a href={facturaPreview.url} download={facturaPreview.nombre}>
                    <Download className="h-4 w-4" />
                    Descargar
                  </a>
                </Button>
              ) : null}
            </div>
          </DialogHeader>
          {facturaPreview ? (
            <iframe
              className="min-h-0 w-full flex-1 rounded-md border bg-card"
              src={`${facturaPreview.url}#toolbar=0&navpanes=0`}
              title="Vista previa de factura"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
