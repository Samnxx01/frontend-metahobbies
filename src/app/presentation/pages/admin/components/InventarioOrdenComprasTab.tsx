import React from 'react';
import { ShoppingCart } from 'lucide-react';
import type { BodegaInventario, InventarioProveedor } from '@/app/services/inventarioService';
import type { BackendProducto } from '@/app/services/productosService';
import type { InventarioOrdenCompra } from '@/app/services/inventarioOrdenCompraService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import InventarioOrdenCompraModal from './InventarioOrdenCompraModal';
import InventarioProveedorModal, { type InventarioProveedorDraft } from './InventarioProveedorModal';

type InventarioOrdenComprasTabProps = {
  proveedorModalOpen: boolean;
  ordenCompraModalOpen: boolean;
  saving: boolean;
  proveedoresCompra: InventarioProveedor[];
  ordenesCompra: InventarioOrdenCompra[];
  bodegas: BodegaInventario[];
  productosSku: BackendProducto[];
  money: Intl.NumberFormat;
  setProveedorModalOpen: (open: boolean) => void;
  setOrdenCompraModalOpen: (open: boolean) => void;
  guardarProveedorCompra: (draft: InventarioProveedorDraft) => Promise<void>;
  refreshOrdenesCompra: () => Promise<void>;
  formatDate: (value?: string) => string;
  sumSubtotalOrdenCompra: (oc: InventarioOrdenCompra) => number;
};

export default function InventarioOrdenComprasTab({
  proveedorModalOpen,
  ordenCompraModalOpen,
  saving,
  proveedoresCompra,
  ordenesCompra,
  bodegas,
  productosSku,
  money,
  setProveedorModalOpen,
  setOrdenCompraModalOpen,
  guardarProveedorCompra,
  refreshOrdenesCompra,
  formatDate,
  sumSubtotalOrdenCompra,
}: InventarioOrdenComprasTabProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Orden/compras
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Ordenes de compra, recepciones y conciliacion. Usa el catalogo de proveedores al preparar cada OC.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <InventarioProveedorModal
                open={proveedorModalOpen}
                saving={saving}
                onOpenChange={setProveedorModalOpen}
                onSubmit={guardarProveedorCompra}
                showTrigger
                triggerClassName="shrink-0"
              />
              <InventarioOrdenCompraModal
                open={ordenCompraModalOpen}
                saving={saving}
                onOpenChange={setOrdenCompraModalOpen}
                proveedores={proveedoresCompra}
                bodegas={bodegas}
                productos={productosSku}
                onCreated={refreshOrdenesCompra}
                showTrigger
                triggerClassName="shrink-0"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Ordenes de compra recientes</p>
            {ordenesCompra.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay ordenes registradas. Usa «Nueva orden de compra» para crear la primera.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero OC</TableHead>
                      <TableHead>Remision</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesCompra.map((oc) => {
                      const fechaSrc = oc.fechaOrden ?? oc.documentoLegalCompra?.fecha;
                      const fechaStr = typeof fechaSrc === 'string' ? fechaSrc : fechaSrc ? new Date(fechaSrc).toISOString() : '';
                      return (
                        <TableRow key={oc._id}>
                          <TableCell className="font-medium text-foreground">{oc.numeroOrden}</TableCell>
                          <TableCell>{oc.numeroRemision || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(fechaStr)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground">{oc.proveedor?.nombre}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">NIT {oc.proveedor?.nit}</span>
                          </TableCell>
                          <TableCell className="text-right">{oc.items?.length ?? 0}</TableCell>
                          <TableCell className="text-right tabular-nums">{money.format(sumSubtotalOrdenCompra(oc))}</TableCell>
                          <TableCell><Badge variant="outline">{oc.estado}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Proveedores registrados</p>
            {proveedoresCompra.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no hay proveedores. Pulsa «Nuevo proveedor» para dar de alta el primero.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-auto rounded-md border border-border bg-muted/30 p-3">
                {proveedoresCompra.map((proveedor) => (
                  <div key={proveedor._id} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm">
                    <p className="font-medium text-foreground">{proveedor.nombre}</p>
                    <p className="text-xs text-muted-foreground">NIT {proveedor.nit}</p>
                    {(proveedor.tipoProveedorNombre || (proveedor.tipoProveedorId as any)?.nombre) ? (
                      <p className="mt-1 text-xs text-primary">
                        {proveedor.tipoProveedorNombre || (proveedor.tipoProveedorId as any)?.nombre}
                      </p>
                    ) : null}
                    {(proveedor.correo || proveedor.telefono) ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[proveedor.correo, proveedor.telefono].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                    {(proveedor.ciudadNombre || proveedor.departamentoNombre || proveedor.paisNombre) ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[proveedor.ciudadNombre, proveedor.departamentoNombre, proveedor.paisNombre].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                    {proveedor.direccion ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{proveedor.direccion}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

