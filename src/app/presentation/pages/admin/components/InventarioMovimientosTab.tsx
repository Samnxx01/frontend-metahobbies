import React from 'react';
import { Eye, PackageSearch, Plus, RefreshCw, Save, Settings2, SlidersHorizontal } from 'lucide-react';
import type {
  ComprobanteEntradaAjuste,
  InventarioMotivoMovimiento,
  InventarioOrdenCompra,
  InventarioTipoMovimiento,
  MotivoMovimiento,
  StockActualItem,
} from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MovimientoForm = {
  tipoMovimientoConfigId: string;
  tipo: 'ENTRADA' | 'SALIDA';
  ordenCompraId: string;
  ordenCompraItemIndex: string;
  recepcionCompraId: string;
  recepcionLineaKey: string;
  sku: string;
  bodega: string;
  bodegaDestino: string;
  cantidad: string;
  costoUnitario: string;
  motivo: MotivoMovimiento;
  motivoPersonalizado: string;
  documentoTipo: string;
  documentoNumero: string;
};

type InventarioMovimientosTabProps = {
  movimientoForm?: MovimientoForm;
  setMovimientoForm?: React.Dispatch<React.SetStateAction<MovimientoForm>>;
  tiposMovimientoActivos?: InventarioTipoMovimiento[];
  ordenesCompra?: InventarioOrdenCompra[];
  comprobantesEntrada?: ComprobanteEntradaAjuste[];
  stockActual?: StockActualItem[];
  onOrdenCompraLineChange?: (ordenCompraId: string, itemIndex: string) => void;
  onComprobanteSalidaLineChange?: (recepcionCompraId: string, lineaKey: string) => void;
  onComprobanteEntradaLineChange?: (recepcionCompraId: string, lineaKey: string) => void;
  onVerComprobante?: (recepcionId: string) => void;
  onRecargarComprobantes?: () => Promise<void>;
  motivos?: InventarioMotivoMovimiento[];
  saving?: boolean;
  renderSkuSelect?: (value: string, onChange: (value: string) => void, options?: { bodegaFiltro?: string }) => React.ReactElement;
  renderBodegaSelect?: (value: string, onChange: (value: string) => void) => React.ReactElement;
  abrirModalTiposMovimiento?: () => void;
  abrirModalCausalesMotivo?: () => void;
  abrirModalSkuCatalogo?: () => void;
  abrirModalSku?: () => void;
  registrarMovimiento?: () => Promise<void>;
};

const movimientoFallback: MovimientoForm = {
  tipoMovimientoConfigId: '',
  tipo: 'ENTRADA',
  ordenCompraId: '',
  ordenCompraItemIndex: '',
  recepcionCompraId: '',
  recepcionLineaKey: '',
  sku: '',
  bodega: '',
  bodegaDestino: '',
  cantidad: '',
  costoUnitario: '',
  motivo: 'OTRO',
  motivoPersonalizado: '',
  documentoTipo: '',
  documentoNumero: '',
};

const noop = (): void => {};

const formatQty = (value: number): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);

const lineaKeyDeItem = (item: { lineaKey?: string; sku: string; bodega: string }): string =>
  item.lineaKey || `${item.sku}::${item.bodega}`;

const esTrasladoBodega = (codigo?: string): boolean =>
  String(codigo || '').trim().toUpperCase() === 'TRASLADO_BODEGA';

const esEntradaCompraTipo = (codigo?: string): boolean =>
  String(codigo || '').trim().toUpperCase() === 'ENTRADA_COMPRA';

export default function InventarioMovimientosTab({
  movimientoForm,
  setMovimientoForm,
  tiposMovimientoActivos,
  ordenesCompra,
  comprobantesEntrada,
  stockActual,
  onOrdenCompraLineChange,
  onComprobanteSalidaLineChange,
  onComprobanteEntradaLineChange,
  onVerComprobante,
  onRecargarComprobantes,
  motivos,
  saving,
  renderSkuSelect,
  renderBodegaSelect,
  abrirModalTiposMovimiento,
  abrirModalCausalesMotivo,
  abrirModalSkuCatalogo,
  abrirModalSku,
  registrarMovimiento,
}: InventarioMovimientosTabProps): React.ReactElement {
  const form = movimientoForm ?? movimientoFallback;
  const updateForm = setMovimientoForm ?? noop;
  const tipos = tiposMovimientoActivos ?? [];
  const ordenesDisponibles = ordenesCompra ?? [];
  const comprobantes = comprobantesEntrada ?? [];
  const saldosKardex = stockActual ?? [];
  const motivosList = motivos ?? [];

  const tipoSeleccionado = tipos.find((t) => t._id === form.tipoMovimientoConfigId);
  const esTraslado = esTrasladoBodega(tipoSeleccionado?.codigo);
  const esEntradaCompra = form.tipo === 'ENTRADA' && esEntradaCompraTipo(tipoSeleccionado?.codigo);
  const esSalidaConComprobante = form.tipo === 'SALIDA' && !esTraslado;
  const esEntradaCompraConComprobante = esEntradaCompra;
  const requiereMotivoPersonalizado = !esTraslado && form.motivo === 'OTRO';

  const ordenSeleccionada = ordenesDisponibles.find((oc) => oc._id === form.ordenCompraId);
  const comprobanteSeleccionado = comprobantes.find((c) => c.recepcionId === form.recepcionCompraId);

  const lineasComprobante = (comprobanteSeleccionado?.items || []).map((item) => ({
    item,
    key: lineaKeyDeItem(item),
    disponible: Number(item.disponibleKardex || 0),
    puedeSalida: item.puedeSalida === true,
  }));

  const lineasParaSalida = lineasComprobante.filter((l) => l.puedeSalida);
  const lineaComprobanteSel = lineasComprobante.find((l) => l.key === form.recepcionLineaKey);
  const lineasParaEntrada = lineasComprobante.filter((l) =>
    String(l.item.estadoKardex || 'NO_CONFIRMADO').toUpperCase() !== 'CONFIRMADO'
  );

  const skusEnBodegaOrigen = React.useMemo(() => {
    if (!esTraslado || !form.bodega.trim()) return [];
    const bodegaNorm = form.bodega.trim();
    const map = new Map<string, StockActualItem>();
    for (const saldo of saldosKardex) {
      if (String(saldo.bodega || '').trim() !== bodegaNorm) continue;
      if (Number(saldo.cantidadDisponible || 0) <= 0) continue;
      map.set(String(saldo.sku || '').trim().toUpperCase(), saldo);
    }
    return [...map.values()];
  }, [esTraslado, form.bodega, saldosKardex]);

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
  const totalRecibidoSeleccionado = lineasOrdenCompra.reduce((acc, line) => acc + Number((line.item as { cantidadRecibida?: number }).cantidadRecibida || 0), 0);
  const totalPendienteSeleccionado = lineasOrdenCompra.reduce((acc, line) => acc + line.pendiente, 0);
  const ordenConfirmada = Boolean(
    ordenSeleccionada && ['CONFIRMADO', 'RECIBIDA_PARCIAL', 'RECIBIDA_TOTAL'].includes(ordenSeleccionada.estado),
  );
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

  const limpiarVinculosCompra = (): Partial<MovimientoForm> => ({
    ordenCompraId: '',
    ordenCompraItemIndex: '',
    recepcionCompraId: '',
    recepcionLineaKey: '',
  });

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
  ]);

  React.useEffect(() => {
    if (!esSalidaConComprobante || !form.recepcionCompraId) return;
    if (!comprobanteSeleccionado || lineasParaSalida.length === 0) return;
    const lineaValida = lineasParaSalida.some((l) => l.key === form.recepcionLineaKey);
    if (!lineaValida) {
      onComprobanteSalidaLineChange?.(comprobanteSeleccionado.recepcionId, lineasParaSalida[0].key);
    }
  }, [
    comprobanteSeleccionado,
    esSalidaConComprobante,
    form.recepcionCompraId,
    form.recepcionLineaKey,
    lineasParaSalida,
    onComprobanteSalidaLineChange,
  ]);

  React.useEffect(() => {
    if (!esEntradaCompraConComprobante || !form.recepcionCompraId) return;
    if (!comprobanteSeleccionado || lineasParaEntrada.length === 0) return;
    const lineaValida = lineasParaEntrada.some((l) => l.key === form.recepcionLineaKey);
    if (!lineaValida) {
      onComprobanteEntradaLineChange?.(comprobanteSeleccionado.recepcionId, lineasParaEntrada[0].key);
    }
  }, [
    comprobanteSeleccionado,
    esEntradaCompraConComprobante,
    form.recepcionCompraId,
    form.recepcionLineaKey,
    lineasParaEntrada,
    onComprobanteEntradaLineChange,
  ]);

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Registrar movimiento</CardTitle>
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
              <Button type="button" variant="outline" onClick={abrirModalCausalesMotivo ?? noop}>
                <Settings2 className="mr-2 h-4 w-4" />
                Parametrizar motivo
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
              const traslado = esTrasladoBodega(selected?.codigo);
              updateForm((prev) => ({
                ...prev,
                tipoMovimientoConfigId: value,
                tipo: selected?.naturaleza || prev.tipo,
                ...limpiarVinculosCompra(),
                sku: '',
                bodega: '',
                bodegaDestino: '',
                cantidad: '',
                costoUnitario: '',
                documentoTipo: traslado ? 'TRASLADO_BODEGA' : prev.documentoTipo,
                documentoNumero: traslado ? '' : prev.documentoNumero,
                motivo: traslado ? 'OTRO' : (selected?.naturaleza === 'SALIDA' ? prev.motivo : 'COMPRA'),
                motivoPersonalizado: traslado || selected?.naturaleza !== 'SALIDA' ? '' : prev.motivoPersonalizado,
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

          {esEntradaCompraConComprobante ? (
            <div className="space-y-2 md:col-span-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1 space-y-2">
                  <Label>Comprobante de entrada (para compra)</Label>
                  <Select
                    value={form.recepcionCompraId || undefined}
                    onValueChange={(value) => {
                      const comp = comprobantes.find((c) => c.recepcionId === value);
                      const first = comp?.items?.find((item) =>
                        String(item.estadoKardex || 'NO_CONFIRMADO').toUpperCase() !== 'CONFIRMADO'
                      );
                      const firstKey = first ? lineaKeyDeItem(first) : '';
                      onComprobanteEntradaLineChange?.(value, firstKey);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecciona comprobante" /></SelectTrigger>
                    <SelectContent>
                      {comprobantes.length === 0 ? (
                        <SelectItem value="__empty_comp_entrada" disabled>
                          Sin comprobantes confirmados
                        </SelectItem>
                      ) : comprobantes.map((comp) => (
                        <SelectItem key={comp.recepcionId} value={comp.recepcionId}>
                          {comp.documentoSoporte?.numero || comp.numeroRecepcion}
                          {' '}| Confirmado
                          {' '}| {comp.items.some((item) => String(item.estadoKardex || '').toUpperCase() !== 'CONFIRMADO') ? 'Pendiente kardex' : 'Kardex generado'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="icon" title="Actualizar lista" onClick={() => void onRecargarComprobantes?.()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!form.recepcionCompraId}
                  onClick={() => { if (form.recepcionCompraId) onVerComprobante?.(form.recepcionCompraId); }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver comprobante
                </Button>
              </div>
              {comprobantes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Confirma primero el comprobante de entrada para poder generar kardex.
                </p>
              ) : null}
            </div>
          ) : null}

          {esSalidaConComprobante ? (
            <div className="space-y-2 md:col-span-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1 space-y-2">
                  <Label>Comprobante de entrada</Label>
                  <Select
                    value={form.recepcionCompraId || undefined}
                    onValueChange={(value) => {
                      const comp = comprobantes.find((c) => c.recepcionId === value);
                      const firstSalida = comp?.items?.find((i) => i.puedeSalida);
                      const firstKey = firstSalida ? lineaKeyDeItem(firstSalida) : '';
                      onComprobanteSalidaLineChange?.(value, firstKey);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecciona comprobante" /></SelectTrigger>
                    <SelectContent>
                      {comprobantes.length === 0 ? (
                        <SelectItem value="__empty_comp" disabled>
                          Sin comprobantes confirmados
                        </SelectItem>
                      ) : comprobantes.map((comp) => (
                        <SelectItem key={comp.recepcionId} value={comp.recepcionId}>
                          {comp.documentoSoporte?.numero || comp.numeroRecepcion}
                          {' '}| Confirmado
                          {' '}| {comp.tieneLineasSalida ? 'Con stock' : 'Sin stock kardex'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="icon" title="Actualizar lista" onClick={() => void onRecargarComprobantes?.()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!form.recepcionCompraId}
                  onClick={() => { if (form.recepcionCompraId) onVerComprobante?.(form.recepcionCompraId); }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver comprobante
                </Button>
              </div>
              {comprobantes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Cree y confirme un comprobante en Orden-Compra antes de generar movimientos.
                </p>
              ) : null}
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
              </div>
              <div className="grid gap-2 md:grid-cols-5">
                <div>
                  <span className="text-muted-foreground">Proveedor</span>
                  <p className="font-medium">{ordenSeleccionada.proveedor?.nombre || 'Proveedor'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">En kardex (línea)</span>
                  <p className="font-medium">{formatQty(Number(saldoKardexLinea?.cantidadDisponible || 0))}</p>
                </div>
              </div>
            </div>
          ) : null}

          {esTraslado ? (
            <>
              <div className="space-y-2">
                <Label>Bodega origen</Label>
                {renderBodega(form.bodega, (value) => updateForm((prev) => ({
                  ...prev,
                  bodega: value,
                  sku: '',
                  cantidad: '',
                  costoUnitario: '',
                })))}
              </div>
              <div className="space-y-2">
                <Label>Bodega destino</Label>
                {renderBodega(form.bodegaDestino, (value) => updateForm((prev) => ({ ...prev, bodegaDestino: value })))}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>SKU (stock en origen)</Label>
                <Select
                  value={form.sku || undefined}
                  onValueChange={(value) => {
                    const saldo = skusEnBodegaOrigen.find((s) => String(s.sku).toUpperCase() === value.toUpperCase());
                    updateForm((prev) => ({
                      ...prev,
                      sku: value,
                      cantidad: saldo ? String(saldo.cantidadDisponible) : '',
                      costoUnitario: saldo ? String(saldo.costoPromedioUnitario || 0) : '',
                    }));
                  }}
                  disabled={!form.bodega.trim()}
                >
                  <SelectTrigger><SelectValue placeholder={form.bodega ? 'Selecciona SKU' : 'Primero bodega origen'} /></SelectTrigger>
                  <SelectContent>
                    {skusEnBodegaOrigen.map((saldo) => (
                      <SelectItem key={`${saldo.sku}-${saldo.bodega}`} value={saldo.sku}>
                        {saldo.sku} | Disp. {formatQty(Number(saldo.cantidadDisponible || 0))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>{esEntradaCompra ? 'Línea / SKU' : esSalidaConComprobante ? 'SKU (comprobante)' : 'SKU'}</Label>
                {esEntradaCompraConComprobante && form.recepcionCompraId ? (
                  <Select
                    value={form.recepcionLineaKey || undefined}
                    onValueChange={(value) => onComprobanteEntradaLineChange?.(form.recepcionCompraId, value)}
                    disabled={lineasParaEntrada.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder={lineasParaEntrada.length ? 'SKU del comprobante' : 'Sin líneas'} /></SelectTrigger>
                    <SelectContent>
                      {lineasParaEntrada.length === 0 ? (
                        <SelectItem value="__sin_lineas_entrada" disabled>
                          Sin líneas en el comprobante
                        </SelectItem>
                      ) : lineasParaEntrada.map(({ item, key }) => (
                        <SelectItem key={key} value={key}>
                          {item.sku} | {item.bodega} | Cant. {formatQty(Number(item.cantidadRecibida || 0))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : esEntradaCompra && form.ordenCompraId ? (
                  <Select
                    value={form.ordenCompraItemIndex || undefined}
                    onValueChange={(value) => onOrdenCompraLineChange?.(form.ordenCompraId, value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Línea de la OC" /></SelectTrigger>
                    <SelectContent>
                      {lineasVisibles.map(({ item, index, pendiente }) => (
                        <SelectItem key={`${ordenSeleccionada?._id}-${index}`} value={String(index)}>
                          {item.sku} | {pendiente > 0 ? `Pend. ${pendiente}` : `Rec. ${Number((item as { cantidadRecibida?: number }).cantidadRecibida || 0)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : esSalidaConComprobante && form.recepcionCompraId ? (
                  <Select
                    value={form.recepcionLineaKey || undefined}
                    onValueChange={(value) => onComprobanteSalidaLineChange?.(form.recepcionCompraId, value)}
                    disabled={lineasParaSalida.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder={lineasParaSalida.length ? 'Línea del comprobante' : 'Sin líneas con stock'} /></SelectTrigger>
                    <SelectContent>
                      {lineasParaSalida.length === 0 ? (
                        <SelectItem value="__sin_lineas" disabled>
                          Registre kardex o revise stock en bodega
                        </SelectItem>
                      ) : lineasParaSalida.map(({ item, key, disponible }) => (
                        <SelectItem key={key} value={key}>
                          {item.sku} | {item.bodega} | Disp. {formatQty(disponible)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : renderSku(form.sku, (value) => updateForm((prev) => ({ ...prev, sku: value })))}
              </div>
              <div className="space-y-2">
                <Label>Bodega</Label>
                {((esSalidaConComprobante || esEntradaCompraConComprobante) && form.recepcionLineaKey) ? (
                  <Input value={form.bodega} readOnly disabled className="bg-muted" />
                ) : renderBodega(form.bodega, (value) => updateForm((prev) => ({ ...prev, bodega: value })))}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min="0"
              max={esSalidaConComprobante && lineaComprobanteSel ? lineaComprobanteSel.disponible : undefined}
              value={form.cantidad}
              onChange={(event) => updateForm((prev) => ({ ...prev, cantidad: event.target.value }))}
              disabled={esEntradaCompraConComprobante && Boolean(form.recepcionLineaKey)}
            />
          </div>
          <div className="space-y-2">
            <Label>Costo unitario</Label>
            <Input
              type="number"
              min="0"
              value={form.costoUnitario}
              onChange={(event) => updateForm((prev) => ({ ...prev, costoUnitario: event.target.value }))}
              disabled={form.tipo === 'SALIDA' || esTraslado || (esEntradaCompraConComprobante && Boolean(form.recepcionLineaKey))}
            />
          </div>
          {!esTraslado ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Motivo (causal)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={abrirModalCausalesMotivo ?? noop}
                >
                  <Settings2 className="mr-1 h-3.5 w-3.5" />
                  Catálogo
                </Button>
              </div>
              <Select
                value={form.motivo}
                onValueChange={(value) => updateForm((prev) => ({
                  ...prev,
                  motivo: value as MotivoMovimiento,
                  motivoPersonalizado: value === 'OTRO' ? prev.motivoPersonalizado : '',
                  ...(value !== 'COMPRA' ? limpiarVinculosCompra() : { recepcionCompraId: '', recepcionLineaKey: '' }),
                  ...(value === 'COMPRA' ? { recepcionCompraId: '', recepcionLineaKey: '' } : {}),
                }))}
                disabled={esEntradaCompraConComprobante}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {motivosList.map((motivo) => (
                    <SelectItem key={motivo.codigo} value={motivo.codigo}>
                      {motivo.nombre} ({motivo.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {requiereMotivoPersonalizado ? (
                <Input
                  value={form.motivoPersonalizado}
                  onChange={(event) => updateForm((prev) => ({ ...prev, motivoPersonalizado: event.target.value }))}
                  placeholder="Escribe el motivo"
                />
              ) : null}
            </div>
          ) : null}

          {esTraslado ? (
            <div className="space-y-2 md:col-span-2">
              <Label>Documento soporte (opcional)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Tipo"
                  value={form.documentoTipo}
                  onChange={(e) => updateForm((prev) => ({ ...prev, documentoTipo: e.target.value }))}
                />
                <Input
                  placeholder="Número"
                  value={form.documentoNumero}
                  onChange={(e) => updateForm((prev) => ({ ...prev, documentoNumero: e.target.value }))}
                />
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2 xl:col-span-4">
            <Button
              onClick={() => void handleRegistrar()}
              disabled={
                saving
                || (esEntradaCompra && Boolean(ordenSeleccionada) && totalPendienteSeleccionado <= 0)
                || (esSalidaConComprobante && (!form.recepcionCompraId || !form.recepcionLineaKey))
              }
            >
              <Save className="mr-2 h-4 w-4" />
              {esTraslado ? 'Registrar traslado' : 'Registrar en kardex'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
