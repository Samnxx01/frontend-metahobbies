import React, { useState } from 'react';
import { AlertTriangle, Eye, FileText, Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import inventarioService, { type BodegaInventario, type InventarioProveedor } from '@/app/services/inventarioService';
import type { BackendProducto } from '@/app/services/productosService';
import type { InventarioOrdenCompra } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { RecepcionOrdenCompraResponse } from '@/app/services/inventarioService';
import InventarioOrdenCompraModal from './InventarioOrdenCompraModal';
import InventarioOrdenCompraDetallesModal from './InventarioOrdenCompraDetallesModal';
import InventarioComprobanteEntradaModal from './InventarioComprobanteEntradaModal';
import InventarioComprobanteEntradaParamModal from './InventarioComprobanteEntradaParamModal';
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
  ordenEdicion: InventarioOrdenCompra | null;
  setProveedorModalOpen: (open: boolean) => void;
  onOrdenCompraModalChange: (open: boolean) => void;
  abrirNuevaOrdenCompra: () => void;
  abrirEditarOrdenCompra: (oc: InventarioOrdenCompra) => void;
  guardarProveedorCompra: (draft: InventarioProveedorDraft) => Promise<void>;
  refreshOrdenesCompra: () => Promise<void>;
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
  ordenEdicion,
  setProveedorModalOpen,
  onOrdenCompraModalChange,
  abrirNuevaOrdenCompra,
  abrirEditarOrdenCompra,
  guardarProveedorCompra,
  refreshOrdenesCompra,
  sumSubtotalOrdenCompra,
}: InventarioOrdenComprasTabProps): React.ReactElement {
  const [ordenEliminar, setOrdenEliminar] = useState<InventarioOrdenCompra | null>(null);
  const [motivoEliminar, setMotivoEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [ordenDetalles, setOrdenDetalles] = useState<InventarioOrdenCompra | null>(null);
  const [detallesOpen, setDetallesOpen] = useState(false);
  const [comprobanteOpen, setComprobanteOpen] = useState(false);
  const [comprobanteData, setComprobanteData] = useState<RecepcionOrdenCompraResponse | null>(null);
  const [comprobanteParamOpen, setComprobanteParamOpen] = useState(false);
  const [comprobanteDoc, setComprobanteDoc] = useState<{ tipo: string; numero: string } | null>(null);

  const eliminarOrden = async (oc: InventarioOrdenCompra): Promise<void> => {
    if (oc.estado !== 'ABIERTA') {
      toast.error('Solo se pueden eliminar órdenes en estado ABIERTA.');
      return;
    }
    setOrdenEliminar(oc);
    setMotivoEliminar('');
  };

  const cerrarEliminarOrden = (): void => {
    if (eliminando) return;
    setOrdenEliminar(null);
    setMotivoEliminar('');
  };

  const confirmarEliminarOrden = async (): Promise<void> => {
    if (!ordenEliminar) return;
    const motivo = motivoEliminar.trim();
    if (!motivo) {
      toast.error('La justificación para eliminar es obligatoria.');
      return;
    }
    try {
      setEliminando(true);
      await inventarioService.eliminarOrdenCompra(ordenEliminar._id, { justificacion: motivo });
      toast.success('Orden eliminada.');
      setOrdenEliminar(null);
      setMotivoEliminar('');
      await refreshOrdenesCompra();
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar.');
    } finally {
      setEliminando(false);
    }
  };

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
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                disabled={saving || eliminando}
                onClick={() => setComprobanteParamOpen(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Comprobante entrada
              </Button>
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
                onOpenChange={onOrdenCompraModalChange}
                proveedores={proveedoresCompra}
                bodegas={bodegas}
                productos={productosSku}
                ordenEdicion={ordenEdicion}
                onCreated={refreshOrdenesCompra}
                onAntesNuevaOrden={abrirNuevaOrdenCompra}
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
                      <TableHead>Factura electrónica</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[140px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenesCompra.map((oc) => {
                      const editable = oc.estado === 'ABIERTA';
                      return (
                        <TableRow key={oc._id}>
                          <TableCell className="font-medium text-foreground">{oc.numeroOrden}</TableCell>
                          <TableCell>{oc.numeroRemision || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm" title={oc.numeroFacturaElectronico || ''}>
                            {oc.numeroFacturaElectronico?.trim() || '—'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground">{oc.proveedor?.nombre}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">NIT {oc.proveedor?.nit}</span>
                          </TableCell>
                          <TableCell className="text-right">{oc.items?.length ?? 0}</TableCell>
                          <TableCell className="text-right tabular-nums">{money.format(sumSubtotalOrdenCompra(oc))}</TableCell>
                          <TableCell><Badge variant="outline">{oc.estado}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={saving || eliminando}
                                title="Ver detalles"
                                onClick={() => {
                                  setOrdenDetalles(oc);
                                  setDetallesOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!editable || saving || eliminando}
                                title="Editar"
                                onClick={() => abrirEditarOrdenCompra(oc)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                disabled={!editable || saving}
                                title="Eliminar"
                                onClick={() => void eliminarOrden(oc)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
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
                  <div key={proveedor._id || proveedor.iud || proveedor.nit} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm">
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

      <Dialog open={Boolean(ordenEliminar)} onOpenChange={(open) => {
        if (!open) cerrarEliminarOrden();
      }}>
        <DialogContent className="max-w-md border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar orden de compra
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta accion no se puede deshacer. Registra el motivo para conservar la trazabilidad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Orden: </span>
              <span className="font-mono font-semibold text-foreground">{ordenEliminar?.numeroOrden}</span>
            </div>
            <div className="space-y-2">
              <Label>Motivo de eliminacion *</Label>
              <Textarea
                value={motivoEliminar}
                onChange={(event) => setMotivoEliminar(event.target.value)}
                placeholder="Describe por que eliminas esta orden."
                rows={4}
                className="border-input bg-background"
                disabled={eliminando}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={cerrarEliminarOrden} disabled={eliminando}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmarEliminarOrden()}
              disabled={eliminando || !motivoEliminar.trim()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {eliminando ? 'Eliminando...' : 'Eliminar orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventarioOrdenCompraDetallesModal
        open={detallesOpen}
        orden={ordenDetalles}
        onOpenChange={(open) => {
          setDetallesOpen(open);
          if (!open) setOrdenDetalles(null);
        }}
      />

      <InventarioComprobanteEntradaModal
        open={comprobanteOpen}
        data={comprobanteData}
        documentoSoporte={comprobanteDoc}
        onOpenChange={(open) => {
          setComprobanteOpen(open);
          if (!open) {
            setComprobanteData(null);
            setComprobanteDoc(null);
          }
        }}
      />

      <InventarioComprobanteEntradaParamModal
        open={comprobanteParamOpen}
        saving={saving || eliminando}
        ordenesCompra={ordenesCompra}
        onOpenChange={setComprobanteParamOpen}
        onPreview={({ data, documentoSoporte }) => {
          setComprobanteData(data);
          setComprobanteDoc(documentoSoporte);
          setComprobanteOpen(true);
          setComprobanteParamOpen(false);
        }}
      />
    </div>
  );
}
