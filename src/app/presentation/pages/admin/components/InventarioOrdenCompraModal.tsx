import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, {
  type BodegaInventario,
  type InventarioOrdenCompra,
  type InventarioProveedor,
} from '@/app/services/inventarioService';
import type { BackendProducto } from '@/app/services/productosService';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { descuentoMontoLinea, totalLineaOrdenCompra } from '@/app/presentation/pages/admin/utils/ordenCompraLineaCalculo';
import {
  mensajeErrorComprasInventario,
  mensajeExitoCrearOrden,
} from '../inventario/inventarioComprasMensajes';
import { getOrdenCompraId } from '@/app/presentation/pages/admin/utils/ordenCompraIdUtils';

const moneyCo = (n: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type LineId = string;

type OcLineDraft = {
  id: LineId;
  sku: string;
  nombreProducto: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
  impuestoPorcentaje: string;
  bodega: string;
};

const newLineId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Misma formula que backend: (cantidad x precio) + impuesto % sobre bruto - descuento. */
const calcSubtotalLinea = (line: OcLineDraft): number =>
  totalLineaOrdenCompra({
    cantidadOrdenada: Number(line.cantidad) || 0,
    costoUnitario: Number(line.precioUnitario) || 0,
    descuento: Number(line.descuento) || 0,
    descuentoPorcentaje: 0,
    impuestoPorcentaje: Number(line.impuestoPorcentaje) || 0,
    impuestos: 0,
    subtotal: 0,
  });

const calcImpuestoLinea = (line: OcLineDraft): number => {
  const base = round2((Number(line.cantidad) || 0) * (Number(line.precioUnitario) || 0));
  const taxPercent = Number(line.impuestoPorcentaje) || 0;
  return taxPercent > 0 ? round2(base * (taxPercent / 100)) : 0;
};

const getProveedorId = (proveedor: InventarioProveedor): string =>
  String(proveedor._id || proveedor.iud || '').trim();

export type InventarioOrdenCompraModalProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  proveedores: InventarioProveedor[];
  bodegas: BodegaInventario[];
  productos: BackendProducto[];
  onCreated: (orden?: InventarioOrdenCompra) => void | Promise<void>;
  /** Si viene definida, el modal opera en modo edición (PUT). */
  ordenEdicion?: InventarioOrdenCompra | null;
  showTrigger?: boolean;
  triggerClassName?: string;
  /** Al pulsar «Nueva orden» desde el trigger (limpia modo edición). */
  onAntesNuevaOrden?: () => void;
  recepcionAutomatica?: boolean;
};

export default function InventarioOrdenCompraModal({
  open,
  saving,
  onOpenChange,
  proveedores,
  bodegas,
  productos,
  onCreated,
  ordenEdicion = null,
  showTrigger = false,
  triggerClassName = '',
  onAntesNuevaOrden,
  recepcionAutomatica = false,
}: InventarioOrdenCompraModalProps): React.ReactElement {
  const bodegasActivas = useMemo(() => bodegas.filter((b) => b.estado !== false), [bodegas]);
  const productosConSku = useMemo(
    () => [...productos].filter((p) => p.sku).sort((a, b) => String(a.sku).localeCompare(String(b.sku))),
    [productos]
  );

  const [numeroRemision, setNumeroRemision] = useState('');
  const [numeroFacturaElectronico, setNumeroFacturaElectronico] = useState('');
  const [concepto, setConcepto] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [lines, setLines] = useState<OcLineDraft[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [siguienteNumeroOrden, setSiguienteNumeroOrden] = useState('');

  const ordenEdicionId = getOrdenCompraId(ordenEdicion);
  const esEdicion = Boolean(ordenEdicionId);

  useEffect(() => {
    if (!open) return;
    const b0 = bodegasActivas[0]?.nombre ?? '';
    if (esEdicion && ordenEdicion) {
      const oc = ordenEdicion;
      setNumeroRemision(oc.numeroRemision?.trim() || '');
      setNumeroFacturaElectronico(oc.numeroFacturaElectronico?.trim() || '');
      setConcepto(oc.concepto?.trim() || '');
      setJustificacion('');
      const itemLines = (oc.items || []).map((it) => ({
        id: newLineId(),
        sku: String(it.sku || ''),
        nombreProducto: String(it.nombreProducto || ''),
        cantidad: String(it.cantidadOrdenada ?? 1),
        precioUnitario: String(it.costoUnitario ?? 0),
        descuento: String(
          (() => {
            const desc = Number(it.descuento || 0);
            if (desc > 0) return String(Math.round(desc));
            const base = Number(it.cantidadOrdenada || 0) * Number(it.costoUnitario || 0);
            const raw = Number(it.descuentoPorcentaje || 0);
            if (raw > 100) return String(Math.round(Math.min(raw, base)));
            if (raw > 0 && base > 0) return String(Math.round((base * raw) / 100));
            return '0';
          })()
        ),
        impuestoPorcentaje: String(
          it.impuestoPorcentaje ??
            (() => {
              const bruto = Number(it.cantidadOrdenada || 0) * Number(it.costoUnitario || 0);
              const dMonto = descuentoMontoLinea(bruto, {
                descuentoPorcentaje: it.descuentoPorcentaje,
                descuento: it.descuento,
              });
              const baseN = Math.max(0, bruto - dMonto);
              const imp = Number(it.impuestos || 0);
              return baseN > 0 && imp > 0 ? Math.round(((imp / baseN) * 100 + Number.EPSILON) * 100) / 100 : 0;
            })()
        ),
        bodega: String(it.bodega || b0),
      }));
      setLines(itemLines.length ? itemLines : [{ id: newLineId(), sku: '', nombreProducto: '', cantidad: '1', precioUnitario: '0', descuento: '0', impuestoPorcentaje: '0', bodega: b0 }]);
    } else {
      setNumeroRemision('');
      setNumeroFacturaElectronico('');
      setConcepto('');
      setJustificacion('');
      setProveedorId('');
      setLines([
        {
          id: newLineId(),
          sku: '',
          nombreProducto: '',
          cantidad: '1',
          precioUnitario: '0',
          descuento: '0',
          impuestoPorcentaje: '0',
          bodega: b0,
        },
      ]);
    }
  }, [open, bodegasActivas, esEdicion, ordenEdicion, ordenEdicionId]);

  /** Resolver proveedor al editar cuando ya cargó el catálogo (no incluir `proveedores` en el efecto anterior: borraba la selección en «nueva orden» al refrescar la lista). */
  useEffect(() => {
    if (!open || !esEdicion || !ordenEdicion) return;
    const oc = ordenEdicion;
    const nitOc = String(oc.proveedor?.nit || '').trim().replace(/\s+/g, '');
    const prov =
      proveedores.find((p) => {
        const nitP = String(p.nit || '').trim().replace(/\s+/g, '');
        return nitP === nitOc || nitP.replace(/-\d+$/, '') === nitOc.replace(/-\d+$/, '');
      }) ||
      proveedores.find((p) => p.nombre === oc.proveedor?.nombre);
    setProveedorId(prov ? getProveedorId(prov) : '');
  }, [open, esEdicion, ordenEdicion, proveedores]);

  useEffect(() => {
    if (!open || esEdicion) return;

    let activo = true;
    setSiguienteNumeroOrden('');

    inventarioService.obtenerSiguienteNumeroOrdenCompra()
      .then((data) => {
        if (activo) setSiguienteNumeroOrden(data?.numeroOrden || '');
      })
      .catch((error) => {
        console.error('Error consultando siguiente numero OC:', error);
        if (activo) setSiguienteNumeroOrden('');
      });

    return () => {
      activo = false;
    };
  }, [open, esEdicion]);

  const addLine = (): void => {
    const b0 = bodegasActivas[0]?.nombre ?? '';
    setLines((prev) => [
      ...prev,
      {
        id: newLineId(),
        sku: '',
        nombreProducto: '',
        cantidad: '1',
        precioUnitario: '0',
        descuento: '0',
        impuestoPorcentaje: '0',
        bodega: b0,
      },
    ]);
  };

  const removeLine = (id: LineId): void => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const updateLine = (id: LineId, patch: Partial<Omit<OcLineDraft, 'id'>>): void => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const onSkuChange = (lineId: LineId, sku: string): void => {
    const prod = productosConSku.find((p) => String(p.sku) === sku);
    updateLine(lineId, {
      sku,
      nombreProducto: prod?.nombre ?? '',
      precioUnitario: prod ? String(Math.max(0, Number(prod.precio) || 0)) : '0',
    });
  };

  const totalOrden = useMemo(() => lines.reduce((acc, l) => acc + calcSubtotalLinea(l), 0), [lines]);

  const guardar = async (): Promise<void> => {
    if (!proveedorId) {
      toast.error('Selecciona un proveedor.');
      return;
    }
    const prov = proveedores.find((p) => getProveedorId(p) === proveedorId);
    if (!prov) {
      toast.error('Proveedor no válido.');
      return;
    }
    const c = concepto.trim();
    const j = justificacion.trim();
    if (!esEdicion && !c) {
      toast.error('El concepto es obligatorio.');
      return;
    }
    if (esEdicion && !j) {
      toast.error('La justificación del cambio es obligatoria.');
      return;
    }
    const rem = numeroRemision.trim();
    const factura = numeroFacturaElectronico.trim();
    const tieneRem = rem.length > 0;
    const tieneFac = factura.length > 0;
    if (tieneRem && tieneFac) {
      toast.error('No puede usar número de remisión y factura electrónica en el mismo documento.');
      return;
    }
    if (!tieneRem && !tieneFac) {
      toast.error('Indica número de remisión o número de factura electrónico (uno solo).');
      return;
    }

    const items = lines
      .map((l) => {
        const sku = String(l.sku || '').trim().toUpperCase();
        const cant = Number(l.cantidad);
        const precio = Number(l.precioUnitario);
        const descuentoCop = Math.max(0, Math.round(Number(l.descuento) || 0));
        const impuestoPorcentaje = Number(l.impuestoPorcentaje) || 0;
        const bod = String(l.bodega || '').trim();
        return {
          sku,
          nombreProducto: String(l.nombreProducto || '').trim(),
          cantidadOrdenada: cant,
          costoUnitario: precio,
          descuento: descuentoCop,
          descuentoPorcentaje: 0,
          impuestoPorcentaje,
          bodega: bod,
        };
      })
      .filter((it) => it.sku && it.bodega && it.cantidadOrdenada > 0 && !Number.isNaN(it.costoUnitario) && it.costoUnitario >= 0);

    if (items.length === 0) {
      toast.error('Agrega al menos una línea con SKU, bodega, cantidad y precio válidos.');
      return;
    }

    try {
      setEnviando(true);
      let ordenResultado: InventarioOrdenCompra | undefined;
      if (esEdicion && ordenEdicionId) {
        ordenResultado = await inventarioService.actualizarOrdenCompra(ordenEdicionId, {
          justificacion: j,
          ...(tieneRem ? { numeroRemision: rem } : {}),
          ...(tieneFac ? { numeroFacturaElectronico: factura } : {}),
          proveedor: { nombre: prov.nombre.trim(), nit: prov.nit.trim() },
          items,
        });
        toast.success('Orden de compra actualizada.');
      } else {
        ordenResultado = await inventarioService.crearOrdenCompra({
          concepto: c,
          ...(tieneRem ? { numeroRemision: rem } : {}),
          ...(tieneFac ? { numeroFacturaElectronico: factura } : {}),
          proveedor: { nombre: prov.nombre.trim(), nit: prov.nit.trim() },
          items,
        });
        const estado = String(ordenResultado.estado || '').toUpperCase();
        toast.success(
          mensajeExitoCrearOrden(ordenResultado.numeroOrden, estado, recepcionAutomatica),
          { autoClose: 9000 },
        );
      }
      onOpenChange(false);
      await onCreated(ordenResultado);
    } catch (error) {
      console.error('Error creando orden de compra:', error);
      toast.error(mensajeErrorComprasInventario(error, 'No se pudo guardar la orden de compra.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClassName}
          onClick={() => {
            onAntesNuevaOrden?.();
          }}
          disabled={saving || enviando}
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Nueva orden de compra
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[min(1120px,calc(100vw-2rem))] max-w-none overflow-visible border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {esEdicion ? 'Editar orden de compra' : 'Nueva orden de compra'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Remisión o factura electrónica (uno solo). El concepto queda en el documento.
              {esEdicion
                ? ' Solo editable en Verificación; el consecutivo OC no cambia.'
                : ' El número OC lo genera el servidor al crear; la fecha de creación también.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Número OC: </span>
            <span className="font-mono font-semibold text-foreground">
              {(ordenEdicion?.numeroOrden ?? siguienteNumeroOrden) || '(consultando consecutivo...)'}
            </span>
            {!esEdicion && siguienteNumeroOrden ? (
              <span className="ml-2 text-xs text-muted-foreground">se confirma al guardar</span>
            ) : esEdicion ? (
              <span className="ml-2 text-xs text-muted-foreground">consecutivo inmutable</span>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Número de remisión</Label>
              <Input
                value={numeroRemision}
                onChange={(e) => setNumeroRemision(e.target.value)}
                placeholder="REM-123"
                className="border-input bg-background"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">Solo si no usas factura electrónica.</p>
            </div>
            <div className="space-y-2">
              <Label>Número factura electrónico</Label>
              <Input
                value={numeroFacturaElectronico}
                onChange={(e) => setNumeroFacturaElectronico(e.target.value)}
                placeholder="Ej. CUFE / número fiscal"
                className="border-input bg-background"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">Solo si no usas remisión.</p>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Proveedor *</Label>
              <Select value={proveedorId || undefined} onValueChange={setProveedorId}>
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder={proveedores.length ? 'Selecciona proveedor' : 'Sin proveedores'} />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-border bg-popover">
                  {proveedores.map((p) => {
                    const id = getProveedorId(p);
                    return id ? (
                      <SelectItem key={id} value={id}>
                        {p.nombre} · NIT {p.nit}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`grid gap-4 ${esEdicion ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
            <div className="space-y-2">
              <Label>Concepto {esEdicion ? '' : '*'}</Label>
              <Textarea
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej. Compra de insumos para producción Q2"
                rows={3}
                readOnly={esEdicion}
                className={`border-input bg-background resize-y min-h-[72px] ${esEdicion ? 'cursor-not-allowed bg-muted/40 text-muted-foreground' : ''}`}
              />
              {esEdicion ? (
                <p className="text-[11px] text-muted-foreground">
                  El concepto queda en el documento original y no puede modificarse al editar.
                </p>
              ) : null}
            </div>
            {esEdicion ? (
              <div className="space-y-2">
                <Label>Justificación de este cambio *</Label>
                <Textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Describe por qué modificas esta orden (queda guardado en el documento)."
                  rows={3}
                  className="border-input bg-background resize-y min-h-[72px]"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-base font-medium">Detalle de ítems</Label>
              <Button type="button" size="sm" variant="outline" onClick={addLine} disabled={saving || enviando}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar línea
              </Button>
            </div>
            <div className="w-full rounded-md border border-border">
              <Table className="w-full table-fixed [&_td]:px-2 [&_th]:px-2">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[17%]">SKU</TableHead>
                    <TableHead className="w-[16%]">Nombre producto</TableHead>
                    <TableHead className="w-[8%] text-right">Cant.</TableHead>
                    <TableHead className="w-[10%] text-right">Precio</TableHead>
                    <TableHead className="w-[9%] text-right">Desc. (COP)</TableHead>
                    <TableHead className="w-[9%] text-right">Imp. %</TableHead>
                    <TableHead className="w-[10%] text-right">Subtotal</TableHead>
                    <TableHead className="w-[16%]">Bodega</TableHead>
                    <TableHead className="w-[5%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="align-top">
                        <Select value={line.sku || undefined} onValueChange={(v) => onSkuChange(line.id, v)}>
                          <SelectTrigger className="h-9 border-input bg-background px-2">
                            <SelectValue placeholder="SKU" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 border-border bg-popover">
                            {productosConSku.map((p) => (
                              <SelectItem key={p.iud} value={String(p.sku)}>
                                {p.sku}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="mt-1 h-8 border-input bg-background px-2 text-xs"
                          value={line.sku}
                          onChange={(e) => updateLine(line.id, { sku: e.target.value.toUpperCase() })}
                          placeholder="O escribe SKU"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={line.nombreProducto}
                          onChange={(e) => updateLine(line.id, { nombreProducto: e.target.value })}
                          className="border-input bg-background px-2"
                          placeholder="Nombre"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background px-2 text-right"
                          value={line.cantidad}
                          onChange={(e) => updateLine(line.id, { cantidad: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background px-2 text-right"
                          value={line.precioUnitario}
                          onChange={(e) => updateLine(line.id, { precioUnitario: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step={1}
                          className="border-input bg-background px-2 text-right"
                          value={line.descuento}
                          onChange={(e) => updateLine(line.id, { descuento: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="border-input bg-background px-2 text-right"
                          value={line.impuestoPorcentaje}
                          onChange={(e) => updateLine(line.id, { impuestoPorcentaje: e.target.value })}
                          placeholder="%"
                        />
                        <p className="mt-1 text-right text-[10px] text-muted-foreground">
                          {Number(line.impuestoPorcentaje) > 0
                            ? `+ ${moneyCo(calcImpuestoLinea(line))}`
                            : '—'}
                        </p>
                      </TableCell>
                      <TableCell className="align-top text-right text-sm font-medium tabular-nums">
                        {moneyCo(calcSubtotalLinea(line))}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select value={line.bodega || undefined} onValueChange={(v) => updateLine(line.id, { bodega: v })}>
                          <SelectTrigger className="h-9 border-input bg-background px-2">
                            <SelectValue placeholder="Bodega" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 border-border bg-popover">
                            {bodegasActivas.map((b) => (
                              <SelectItem key={b._id} value={b.nombre}>
                                {b.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLine(line.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-right text-sm font-semibold text-foreground">
              Total orden: <span className="tabular-nums">{moneyCo(totalOrden)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Subtotal por línea = (cantidad × precio) + impuesto % sobre el bruto − descuento en pesos (entero, máx. el bruto de la línea).
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || enviando}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void guardar()} disabled={saving || enviando}>
              <Save className="mr-2 h-4 w-4" />
              {esEdicion ? 'Guardar cambios' : 'Guardar orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
