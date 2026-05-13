import React from 'react';
import { PackageSearch, Plus, Save, SlidersHorizontal } from 'lucide-react';
import type { InventarioOrdenCompra, InventarioTipoMovimiento, MotivoMovimiento, StockActualItem } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MovimientoForm = {
  tipoMovimientoConfigId: string;
  tipo: 'ENTRADA' | 'SALIDA';
  ordenCompraId: string;
  ordenCompraItemIndex: string;
  sku: string;
  bodega: string;
  cantidad: string;
  costoUnitario: string;
  motivo: MotivoMovimiento;
  documentoTipo: string;
  documentoNumero: string;
};

type InventarioMovimientosTabProps = {
  movimientoForm?: MovimientoForm;
  setMovimientoForm?: React.Dispatch<React.SetStateAction<MovimientoForm>>;
  tiposMovimientoActivos?: InventarioTipoMovimiento[];
  ordenesCompra?: InventarioOrdenCompra[];
  stockActual?: StockActualItem[];
  onOrdenCompraLineChange?: (ordenCompraId: string, itemIndex: string) => void;
  motivos?: MotivoMovimiento[];
  saving?: boolean;
  renderSkuSelect?: (value: string, onChange: (value: string) => void) => React.ReactElement;
  renderBodegaSelect?: (value: string, onChange: (value: string) => void) => React.ReactElement;
  abrirModalTiposMovimiento?: () => void;
  abrirModalSkuCatalogo?: () => void;
  abrirModalSku?: () => void;
  registrarMovimiento?: () => Promise<void>;
};

const movimientoFallback: MovimientoForm = {
  tipoMovimientoConfigId: '',
  tipo: 'ENTRADA',
  ordenCompraId: '',
  ordenCompraItemIndex: '',
  sku: '',
  bodega: '',
  cantidad: '',
  costoUnitario: '',
  motivo: 'OTRO',
  documentoTipo: '',
  documentoNumero: '',
};

const noop = (): void => {};

const formatQty = (value: number): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);

export default function InventarioMovimientosTab({
  movimientoForm,
  setMovimientoForm,
  tiposMovimientoActivos,
  ordenesCompra,
  stockActual,
  onOrdenCompraLineChange,
  motivos,
  saving,
  renderSkuSelect,
  renderBodegaSelect,
  abrirModalTiposMovimiento,
  abrirModalSkuCatalogo,
  abrirModalSku,
  registrarMovimiento,
}: InventarioMovimientosTabProps): React.ReactElement {
  const form = movimientoForm ?? movimientoFallback;
  const updateForm = setMovimientoForm ?? noop;
  const tipos = tiposMovimientoActivos ?? [];
  const ordenesDisponibles = ordenesCompra ?? [];
  const saldosKardex = stockActual ?? [];
  const motivosList = motivos ?? [];
  const ordenSeleccionada = ordenesDisponibles.find((oc) => oc._id === form.ordenCompraId);
  const esEntradaCompra = form.tipo === 'ENTRADA' && form.motivo === 'COMPRA';
  const ordenTienePendiente = (oc: InventarioOrdenCompra): boolean =>
    (oc.items || []).some((item) => Number(item.cantidadOrdenada || 0) - Number(item.cantidadRecibida || 0) > 0);
  const lineasOrdenCompra = (ordenSeleccionada?.items || [])
    .map((item, index) => ({
      item,
      index,
      pendiente: Math.max(0, Number(item.cantidadOrdenada || 0) - Number(item.cantidadRecibida || 0)),
    }));
  const lineasVisibles = lineasOrdenCompra.some((line) => line.pendiente > 0)
    ? lineasOrdenCompra.filter((line) => line.pendiente > 0)
    : lineasOrdenCompra;
  const totalOrdenadoSeleccionado = lineasOrdenCompra.reduce((acc, line) => acc + Number(line.item.cantidadOrdenada || 0), 0);
  const totalRecibidoSeleccionado = lineasOrdenCompra.reduce((acc, line) => acc + Number((line.item as any).cantidadRecibida || 0), 0);
  const totalPendienteSeleccionado = lineasOrdenCompra.reduce((acc, line) => acc + line.pendiente, 0);
  const ordenConfirmada = Boolean(ordenSeleccionada && ordenSeleccionada.estado !== 'ABIERTA');
  const lineaSeleccionada = lineasOrdenCompra.find((line) => String(line.index) === form.ordenCompraItemIndex);
  const saldoKardexLinea = lineaSeleccionada
    ? saldosKardex.find((saldo) =>
      String(saldo.sku || '').trim().toUpperCase() === String(lineaSeleccionada.item.sku || '').trim().toUpperCase() &&
      String(saldo.bodega || '').trim() === String(lineaSeleccionada.item.bodega || '').trim()
    )
    : null;
  const renderSku = renderSkuSelect ?? ((value, onChange) => (
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
  ));
  const renderBodega = renderBodegaSelect ?? ((value, onChange) => (
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
  ));
  const handleRegistrar = registrarMovimiento ?? (async () => undefined);

  React.useEffect(() => {
    if (!esEntradaCompra || !form.ordenCompraId) return;

    if (!ordenSeleccionada || lineasVisibles.length === 0) return;

    const lineaActualTienePendiente = lineasVisibles.some((line) => String(line.index) === form.ordenCompraItemIndex);
    if (!lineaActualTienePendiente) {
      onOrdenCompraLineChange?.(ordenSeleccionada._id, String(lineasVisibles[0].index));
    }
  }, [
    esEntradaCompra,
    form.ordenCompraId,
    form.ordenCompraItemIndex,
    lineasVisibles,
    onOrdenCompraLineChange,
    ordenSeleccionada,
    updateForm,
  ]);

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Registrar movimiento</CardTitle>
              <CardDescription>Entradas y salidas manuales con documento soporte obligatorio.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={abrirModalSkuCatalogo ?? noop}>
                <PackageSearch className="mr-2 h-4 w-4" />
                Ver SKU
              </Button>
              <Button type="button" variant="outline" onClick={abrirModalTiposMovimiento ?? noop}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Parametrizar tipo
              </Button>
              <Button type="button" variant="outline" onClick={abrirModalSku ?? noop}>
                <Plus className="mr-2 h-4 w-4" />
                Crear SKU
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipoMovimientoConfigId} onValueChange={(value) => {
              const selected = tipos.find((tipo) => tipo._id === value);
              updateForm((prev) => ({
                ...prev,
                tipoMovimientoConfigId: value,
                tipo: selected?.naturaleza || prev.tipo,
                ...(selected?.naturaleza === 'SALIDA' ? { ordenCompraId: '', ordenCompraItemIndex: '' } : {}),
              }));
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo._id} value={tipo._id}>
                    {tipo.nombre} ({tipo.naturaleza})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {esEntradaCompra ? (
            <div className="space-y-2">
              <Label>Comprobante de entrada</Label>
              <Select
                value={form.ordenCompraId || undefined}
                onValueChange={(value) => {
                  const oc = ordenesDisponibles.find((orden) => orden._id === value);
                  const firstPendingIndex = oc?.items?.findIndex((item) => Number(item.cantidadOrdenada || 0) - Number(item.cantidadRecibida || 0) > 0);
                  const fallbackIndex = firstPendingIndex !== undefined && firstPendingIndex >= 0 ? firstPendingIndex : 0;
                  onOrdenCompraLineChange?.(value, oc?.items?.length ? String(fallbackIndex) : '');
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona OC" /></SelectTrigger>
                <SelectContent>
                  {ordenesDisponibles.length === 0 ? (
                    <SelectItem value="__empty_ordenes" disabled>
                      No hay comprobantes disponibles
                    </SelectItem>
                  ) : ordenesDisponibles.map((oc) => {
                    const tienePendiente = ordenTienePendiente(oc);
                    return (
                      <SelectItem key={oc._id} value={oc._id}>
                        {oc.numeroOrden} | {oc.proveedor?.nombre || 'Proveedor'} | {tienePendiente ? oc.estado : 'sin pendiente'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {esEntradaCompra && ordenSeleccionada ? (
            <div className="rounded-md border border-primary/25 bg-background/45 p-3 text-xs md:col-span-2 xl:col-span-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{ordenSeleccionada.numeroOrden}</span>
                <Badge variant={ordenConfirmada ? 'default' : 'secondary'}>
                  {ordenConfirmada ? 'Confirmada' : 'No confirmada'}
                </Badge>
                <Badge variant="outline">{ordenSeleccionada.estado}</Badge>
                {totalPendienteSeleccionado > 0 ? (
                  <Badge variant="outline">Pendiente {formatQty(totalPendienteSeleccionado)}</Badge>
                ) : (
                  <Badge variant="destructive">Sin pendiente</Badge>
                )}
                {totalPendienteSeleccionado <= 0 ? (
                  <span className="text-muted-foreground">Ya fue contabilizado en kardex.</span>
                ) : null}
              </div>
              <div className="grid gap-2 md:grid-cols-5">
                <div>
                  <span className="text-muted-foreground">Proveedor</span>
                  <p className="font-medium">{ordenSeleccionada.proveedor?.nombre || 'Proveedor'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">NIT</span>
                  <p className="font-medium">{ordenSeleccionada.proveedor?.nit || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ordenado</span>
                  <p className="font-medium">{formatQty(totalOrdenadoSeleccionado)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Recibido</span>
                  <p className="font-medium">{formatQty(totalRecibidoSeleccionado)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">En kardex</span>
                  <p className="font-medium">{formatQty(Number(saldoKardexLinea?.cantidadDisponible || 0))}</p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{esEntradaCompra ? 'Linea / SKU' : 'SKU'}</Label>
            {esEntradaCompra && form.ordenCompraId ? (
              <Select
                value={form.ordenCompraItemIndex || undefined}
                onValueChange={(value) => onOrdenCompraLineChange?.(form.ordenCompraId, value)}
              >
                <SelectTrigger><SelectValue placeholder="Linea de la OC" /></SelectTrigger>
                <SelectContent>
                  {lineasVisibles.map(({ item, index, pendiente }) => (
                    <SelectItem key={`${ordenSeleccionada?._id}-${index}`} value={String(index)}>
                      {item.sku} | {item.nombreProducto || item.descripcion || 'Producto'} | {pendiente > 0 ? `Pend. ${pendiente}` : `Rec. ${Number((item as any).cantidadRecibida || 0)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : renderSku(form.sku, (value) => updateForm((prev) => ({ ...prev, sku: value })))}
          </div>
          <div className="space-y-2">
            <Label>Bodega</Label>
            {renderBodega(form.bodega, (value) => updateForm((prev) => ({ ...prev, bodega: value })))}
          </div>
          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input type="number" min="0" value={form.cantidad} onChange={(event) => updateForm((prev) => ({ ...prev, cantidad: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Costo unitario</Label>
            <Input type="number" min="0" value={form.costoUnitario} onChange={(event) => updateForm((prev) => ({ ...prev, costoUnitario: event.target.value }))} disabled={form.tipo === 'SALIDA'} />
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select
              value={form.motivo}
              onValueChange={(value) => updateForm((prev) => ({
                ...prev,
                motivo: value as MotivoMovimiento,
                ...(value !== 'COMPRA' ? { ordenCompraId: '', ordenCompraItemIndex: '' } : {}),
              }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {motivosList.map((motivo) => <SelectItem key={motivo} value={motivo}>{motivo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Button onClick={() => void handleRegistrar()} disabled={saving || (esEntradaCompra && Boolean(ordenSeleccionada) && totalPendienteSeleccionado <= 0)}>
              <Save className="mr-2 h-4 w-4" />
              Registrar en kardex
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

