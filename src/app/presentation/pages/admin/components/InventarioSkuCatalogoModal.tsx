import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Package,
  Pencil,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import type { BackendProducto } from '@/app/services/productosService';
import {
  BarcodePreview,
  getProductoId,
  imprimirCodigoBarrasSku,
} from '@/app/presentation/pages/admin/inventario/inventarioBarcodeUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export type InventarioSkuCatalogoModalProps = {
  open: boolean;
  saving?: boolean;
  productos: BackendProducto[];
  puedeGestionarSku?: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSku: (producto: BackendProducto) => void;
  onEditSku?: (producto: BackendProducto) => void;
  onDesactivarSku: (producto: BackendProducto) => Promise<void>;
  onEliminarSku: (producto: BackendProducto) => Promise<void>;
  onGenerarCodigoBarras: (producto: BackendProducto) => Promise<void>;
};

export default function InventarioSkuCatalogoModal({
  open,
  saving = false,
  productos,
  puedeGestionarSku = false,
  onOpenChange,
  onSelectSku,
  onEditSku,
  onDesactivarSku,
  onEliminarSku,
  onGenerarCodigoBarras,
}: InventarioSkuCatalogoModalProps): React.ReactElement {
  const [filtro, setFiltro] = useState('');
  const [barcodePreview, setBarcodePreview] = useState<BackendProducto | null>(null);

  useEffect(() => {
    if (open) {
      setFiltro('');
      setBarcodePreview(null);
    }
  }, [open]);

  const productosFiltrados = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    if (!query) return productos;
    const queryDigits = query.replace(/\D/g, '');
    return productos.filter((producto) => {
      const sku = String(producto.sku || '').toLowerCase();
      const nombre = String(producto.nombre || '').toLowerCase();
      const codigoBarras = String(producto.codigoBarras || '').toLowerCase();
      return sku.includes(query)
        || nombre.includes(query)
        || codigoBarras.includes(query)
        || (!!queryDigits && codigoBarras.includes(queryDigits));
    });
  }, [filtro, productos]);

  const seleccionar = (producto: BackendProducto): void => {
    onSelectSku(producto);
    setBarcodePreview(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Visualizador de SKU creados
            </DialogTitle>
            <DialogDescription>
              Escanea un codigo de barras o busca manualmente por SKU, codigo o nombre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={filtro}
                  onChange={(event) => setFiltro(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || productosFiltrados.length !== 1) return;
                    seleccionar(productosFiltrados[0]);
                  }}
                  className="pl-9"
                  placeholder="Escanea codigo de barras o escribe nombre/SKU"
                />
              </div>
              <Badge variant="secondary" className="h-9 justify-center rounded-md px-3">
                {productosFiltrados.length} de {productos.length}
              </Badge>
            </div>

            <div className="max-h-[58vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Codigo de barras</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.map((producto) => (
                    <TableRow key={getProductoId(producto) || producto.sku || producto.nombre}>
                      <TableCell className="font-mono text-xs font-semibold">{producto.sku || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Barcode className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="space-y-2">
                            {producto.codigoBarras ? (
                              <button
                                type="button"
                                className="rounded border border-transparent p-1 text-left transition hover:border-primary/40 hover:bg-background/70"
                                title="Ver e imprimir codigo"
                                onClick={() => setBarcodePreview(producto)}
                              >
                                <BarcodePreview codigo={producto.codigoBarras} />
                              </button>
                            ) : (
                              <BarcodePreview codigo={producto.codigoBarras} />
                            )}
                            {!producto.codigoBarras && puedeGestionarSku && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={saving}
                                onClick={() => void onGenerarCodigoBarras(producto)}
                              >
                                Generar codigo
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{producto.nombre}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{producto.descripcion || producto.descripcionCorta || 'Sin descripcion'}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{producto.unidadMedida || 'UNIDAD'}</Badge></TableCell>
                      <TableCell>{MONEY.format(Number(producto.precio || 0))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button type="button" size="sm" onClick={() => seleccionar(producto)}>
                            Seleccionar
                          </Button>
                          {puedeGestionarSku && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={saving}
                                title="Desactivar SKU"
                                onClick={() => void onDesactivarSku(producto)}
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                disabled={saving}
                                title="Eliminar SKU"
                                onClick={() => void onEliminarSku(producto)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {onEditSku && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  disabled={saving}
                                  title="Editar SKU"
                                  onClick={() => onEditSku(producto)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {productosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No se encontraron SKU con ese filtro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(barcodePreview)} onOpenChange={(nextOpen) => !nextOpen && setBarcodePreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Codigo de barras del SKU
            </DialogTitle>
            <DialogDescription>
              Visualiza la etiqueta antes de imprimirla.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-white p-5 text-center text-slate-950">
              <p className="text-sm font-semibold">{barcodePreview?.sku || 'SKU'}</p>
              <p className="mb-3 text-xs uppercase text-slate-500">{barcodePreview?.nombre || 'Producto'}</p>
              <div className="flex justify-center">
                <BarcodePreview codigo={barcodePreview?.codigoBarras} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBarcodePreview(null)}>
                Cerrar
              </Button>
              {barcodePreview ? (
                <>
                  <Button type="button" variant="outline" onClick={() => seleccionar(barcodePreview)}>
                    Seleccionar
                  </Button>
                  <Button type="button" onClick={() => imprimirCodigoBarrasSku(barcodePreview)}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
