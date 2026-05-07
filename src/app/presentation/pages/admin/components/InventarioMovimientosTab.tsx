import React from 'react';
import { Plus, Save, SlidersHorizontal } from 'lucide-react';
import type { InventarioOrdenCompra, InventarioTipoMovimiento, MotivoMovimiento } from '@/app/services/inventarioService';
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
  onOrdenCompraLineChange?: (ordenCompraId: string, itemIndex: string) => void;
  motivos?: MotivoMovimiento[];
  saving?: boolean;
  renderSkuSelect?: (value: string, onChange: (value: string) => void) => React.ReactElement;
  renderBodegaSelect?: (value: string, onChange: (value: string) => void) => React.ReactElement;
  abrirModalTiposMovimiento?: () => void;
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

export default function InventarioMovimientosTab({
  movimientoForm,
  setMovimientoForm,
  tiposMovimientoActivos,
  ordenesCompra,
  onOrdenCompraLineChange,
  motivos,
  saving,
  renderSkuSelect,
  renderBodegaSelect,
  abrirModalTiposMovimiento,
  abrirModalSku,
  registrarMovimiento,
}: InventarioMovimientosTabProps): React.ReactElement {
  const form = movimientoForm ?? movimientoFallback;
  const updateForm = setMovimientoForm ?? noop;
  const tipos = tiposMovimientoActivos ?? [];
  const ordenesPendientes = ordenesCompra ?? [];
  const motivosList = motivos ?? [];
  const ordenSeleccionada = ordenesPendientes.find((oc) => oc._id === form.ordenCompraId);
  const esEntradaCompra = form.tipo === 'ENTRADA' && form.motivo === 'COMPRA';
  const lineasPendientes = (ordenSeleccionada?.items || [])
    .map((item, index) => ({
      item,
      index,
      pendiente: Math.max(0, Number(item.cantidadOrdenada || 0) - Number(item.cantidadRecibida || 0)),
    }))
    .filter((line) => line.pendiente > 0);
  const renderSku = renderSkuSelect ?? ((value, onChange) => (
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
  ));
  const renderBodega = renderBodegaSelect ?? ((value, onChange) => (
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
  ));
  const handleRegistrar = registrarMovimiento ?? (async () => undefined);

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
          <div className="space-y-2">
            <Label>SKU</Label>
            {esEntradaCompra && form.ordenCompraId ? (
              <Select
                value={form.ordenCompraItemIndex || undefined}
                onValueChange={(value) => onOrdenCompraLineChange?.(form.ordenCompraId, value)}
              >
                <SelectTrigger><SelectValue placeholder="Linea de la OC" /></SelectTrigger>
                <SelectContent>
                  {lineasPendientes.map(({ item, index, pendiente }) => (
                    <SelectItem key={`${ordenSeleccionada?._id}-${index}`} value={String(index)}>
                      {item.sku} | {item.nombreProducto || item.descripcion || 'Producto'} | Pend. {pendiente}
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
          {esEntradaCompra ? (
            <div className="space-y-2">
              <Label>Orden de compra</Label>
              <Select
                value={form.ordenCompraId || undefined}
                onValueChange={(value) => {
                  const oc = ordenesPendientes.find((orden) => orden._id === value);
                  const firstIndex = oc?.items?.findIndex((item) => Number(item.cantidadOrdenada || 0) - Number(item.cantidadRecibida || 0) > 0);
                  onOrdenCompraLineChange?.(value, firstIndex !== undefined && firstIndex >= 0 ? String(firstIndex) : '');
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona OC" /></SelectTrigger>
                <SelectContent>
                  {ordenesPendientes.map((oc) => (
                    <SelectItem key={oc._id} value={oc._id}>
                      {oc.numeroOrden} | {oc.proveedor?.nombre || 'Proveedor'} | {oc.estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Tipo documento</Label>
            <Input value={form.documentoTipo} onChange={(event) => updateForm((prev) => ({ ...prev, documentoTipo: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Numero documento</Label>
            <Input value={form.documentoNumero} onChange={(event) => updateForm((prev) => ({ ...prev, documentoNumero: event.target.value }))} />
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Button onClick={() => void handleRegistrar()} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Registrar en kardex
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

