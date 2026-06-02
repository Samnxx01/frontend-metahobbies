import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import carritoService, { type PedidoAprobado } from '@/app/services/carritoService';
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
import { ChevronDown, ChevronRight, Loader2, MapPin, Package, RefreshCw, Search, User, Warehouse } from 'lucide-react';

const formatCOP = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const formatFecha = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

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
        toast.success(result.msg || 'Kardex actualizado correctamente.');
        await cargar();
      } else {
        toast.error(result.msg || 'No se pudo reaplicar el kardex.');
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
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            Pedidos aprobados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ventas del carrito con pago confirmado (Wompi) e inventario descontado.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit text-sm px-3 py-1">
          {total} pedido{total === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por referencia, cliente, ciudad, producto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
          />
        </div>
        <Button onClick={onBuscar} disabled={loading}>
          Buscar
        </Button>
        <Button variant="outline" onClick={() => void cargar()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Referencia</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Factura a</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-right">Cant. total</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Cargando pedidos…
                </TableCell>
              </TableRow>
            ) : pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
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
                        <div>{pedido.ventaReferencia || '—'}</div>
                        {pedido.referenciaPago && (
                          <div className="text-muted-foreground mt-0.5">{pedido.referenciaPago}</div>
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
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCOP(pedido.resumenMargen?.margenTotal ?? 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPorcentaje(pedido.resumenMargen?.margenPorcentaje)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCOP(pedido.total)}
                      </TableCell>
                    </TableRow>
                    {abierto && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={8} className="p-0">
                          <div className="px-6 py-4 space-y-3">
                            <div className="flex flex-wrap gap-4 text-sm rounded-md border bg-background/80 px-4 py-3">
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
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {formatCOP(pedido.resumenMargen?.margenTotal ?? 0)}{' '}
                                  ({formatPorcentaje(pedido.resumenMargen?.margenPorcentaje)})
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
                                  <TableHead className="text-right">Costo kardex</TableHead>
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
                                      {formatCOP(item.costoUnitarioSku)}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                      <div>{formatCOP(item.margenTotal)}</div>
                                      <div className="text-xs text-muted-foreground">
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
                              </p>
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
    </div>
  );
}
