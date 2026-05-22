/**
 * Panel de la pestaña «Orden/compras» embebido en `Inventario.tsx` (./Inventario.tsx).
 * Rutas dinámicas deben usar la página `../InventarioOrdenComprasTab.tsx` (fuera de /components/),
 * que monta el módulo completo con `initialActiveTab="orden-compras"` y ejecuta `loadData`.
 *
 * Datos: props desde el padre (GET en `loadData` y refetch al entrar en la pestaña). Si las listas
 * llegan vacías (p. ej. ruta que monta solo este panel), se hace GET aquí:
 * - `GET /api/inventario/compras/ordenes?limit=` → `listarOrdenesCompra`
 * - `GET /api/inventario/compras/proveedores` → `listarProveedoresCompra`
 *
 * Otros GET de órdenes (servicio `inventarioService`): `siguiente-numero`, `ordenes/:id`, `ordenes/:id/conciliacion`.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, Settings2, ShoppingCart, Trash2 } from 'lucide-react';
import {
  ParameterizedActionBar,
  buildOrdenCompraRowActionCatalog,
  resolveOrdenCompraRowAllowedIds,
} from '@/app/presentation/actions';
import { toast } from 'react-toastify';
import inventarioService, {
  type BodegaInventario,
  type EstadoOrdenCompraConfig,
  type InventarioConfig,
  type InventarioProveedor,
} from '@/app/services/inventarioService';
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
import InventarioEstadoOrdenCompraConfigModal from './InventarioEstadoOrdenCompraConfigModal';
import { codigosEstadoPermitenComprobanteEntrada, labelEstadoOrdenCompra } from '@/app/presentation/pages/admin/utils/estadoOrdenCompraUi';
import InventarioComprobanteEntradaModal from './InventarioComprobanteEntradaModal';
import InventarioComprobanteEntradaParamModal from './InventarioComprobanteEntradaParamModal';
import InventarioProveedorModal, { type InventarioProveedorDraft } from './InventarioProveedorModal';
import { totalLineaOrdenCompra } from '@/app/presentation/pages/admin/utils/ordenCompraLineaCalculo';
import { ordenCompraTienePendienteRecepcion } from './InventarioComprobanteEntradaParamModal';

const DEFAULT_MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const sumSubtotalOrdenCompraDefault = (oc: InventarioOrdenCompra): number =>
  (oc.items || []).reduce((acc, it) => acc + totalLineaOrdenCompra(it), 0);

type InventarioOrdenComprasTabProps = {
  proveedorModalOpen: boolean;
  ordenCompraModalOpen: boolean;
  saving: boolean;
  proveedoresCompra: InventarioProveedor[];
  ordenesCompra: InventarioOrdenCompra[];
  bodegas: BodegaInventario[];
  productosSku: BackendProducto[];
  /** Si falta (panel sin padre), se usa formato COP por defecto. */
  money?: Intl.NumberFormat;
  ordenEdicion: InventarioOrdenCompra | null;
  setProveedorModalOpen: (open: boolean) => void;
  onOrdenCompraModalChange: (open: boolean) => void;
  abrirNuevaOrdenCompra: () => void;
  abrirEditarOrdenCompra: (oc: InventarioOrdenCompra) => void;
  guardarProveedorCompra: (draft: InventarioProveedorDraft) => Promise<void>;
  /** Opcional si el panel se monta sin `Inventario` (ruta mal resuelta); el listado se refresca con GET local. */
  refreshOrdenesCompra?: () => Promise<void>;
  /** Si falta, se calcula con `totalLineaOrdenCompra` (misma regla que `Inventario.tsx`). */
  sumSubtotalOrdenCompra?: (oc: InventarioOrdenCompra) => number;
  /** SuperAdmin de rama: habilita editar/eliminar OC aunque no estén ABIERTA. */
  esTenantSuperAdmin?: boolean;
  /** Config inventario (recepcion automatica al guardar OC). */
  config?: InventarioConfig | null;
  nombreCorporativo?: string;
};

export default function InventarioOrdenComprasTab({
  proveedorModalOpen,
  ordenCompraModalOpen,
  saving,
  proveedoresCompra = [],
  ordenesCompra = [],
  bodegas = [],
  productosSku = [],
  money,
  ordenEdicion,
  setProveedorModalOpen,
  onOrdenCompraModalChange,
  abrirNuevaOrdenCompra,
  abrirEditarOrdenCompra,
  guardarProveedorCompra,
  refreshOrdenesCompra,
  sumSubtotalOrdenCompra: sumSubtotalProp,
  esTenantSuperAdmin = false,
  config = null,
  nombreCorporativo,
}: InventarioOrdenComprasTabProps): React.ReactElement {
  const moneyFmt = money ?? DEFAULT_MONEY;
  const sumSubtotalOrdenCompra = sumSubtotalProp ?? sumSubtotalOrdenCompraDefault;
  const recepcionAutomatica = config?.compras?.recepcionAutomatica === true;

  const [ordenEliminar, setOrdenEliminar] = useState<InventarioOrdenCompra | null>(null);
  const [motivoEliminar, setMotivoEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [ordenDetalles, setOrdenDetalles] = useState<InventarioOrdenCompra | null>(null);
  const [detallesOpen, setDetallesOpen] = useState(false);
  const [comprobanteOpen, setComprobanteOpen] = useState(false);
  const [comprobanteData, setComprobanteData] = useState<RecepcionOrdenCompraResponse | null>(null);
  const [comprobanteParamOpen, setComprobanteParamOpen] = useState(false);
  const [comprobanteDoc, setComprobanteDoc] = useState<{ tipo: string; numero: string } | null>(null);
  const [estadosOrdenOpen, setEstadosOrdenOpen] = useState(false);
  const [estadosOrden, setEstadosOrden] = useState<EstadoOrdenCompraConfig[]>([]);
  const [localOrdenes, setLocalOrdenes] = useState<InventarioOrdenCompra[]>([]);
  const [localProveedores, setLocalProveedores] = useState<InventarioProveedor[]>([]);

  const ordenesUi = useMemo(
    () => (ordenesCompra.length > 0 ? ordenesCompra : localOrdenes),
    [ordenesCompra, localOrdenes],
  );
  const proveedoresUi = useMemo(
    () => (proveedoresCompra.length > 0 ? proveedoresCompra : localProveedores),
    [proveedoresCompra, localProveedores],
  );

  const estadosPermitenComprobanteEntrada = useMemo(
    () => codigosEstadoPermitenComprobanteEntrada(estadosOrden),
    [estadosOrden],
  );

  const ordenesConPendiente = useMemo(
    () => ordenesUi.filter(
      (oc) => ordenCompraTienePendienteRecepcion(oc) && estadosPermitenComprobanteEntrada.has(oc.estado),
    ),
    [ordenesUi, estadosPermitenComprobanteEntrada],
  );

  const abrirComprobanteEntrada = (): void => {
    if (!ordenesConPendiente.length) {
      toast.info(
        recepcionAutomatica
          ? 'No hay órdenes con mercancía pendiente. Las OC en RECIBIDA_TOTAL ya ingresaron al inventario al guardarse.'
          : 'No hay órdenes CONFIRMADAS con pendiente. Cree una OC, confírmela en Detalles y luego use Comprobante entrada.',
        { autoClose: 9000 },
      );
      return;
    }
    setComprobanteParamOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    inventarioService.listarEstadosOrdenCompra()
      .then((data) => {
        if (!cancelled) setEstadosOrden(data);
      })
      .catch((error) => {
        console.error('Error cargando estados OC:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const needOrdenes = ordenesCompra.length === 0;
    const needProv = proveedoresCompra.length === 0;
    if (!needOrdenes && !needProv) return;

    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const [o, p] = await Promise.all([
          needOrdenes ? inventarioService.listarOrdenesCompra({ limit: 50 }) : Promise.resolve(null),
          needProv ? inventarioService.listarProveedoresCompra() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (needOrdenes && o) setLocalOrdenes(o);
        if (needProv && p) setLocalProveedores(p);
      } catch (error) {
        if (cancelled) return;
        console.error('Error cargando catalogo de compras (panel):', error);
        toast.error(
          error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo cargar ordenes o proveedores.'
        );
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [ordenesCompra.length, proveedoresCompra.length]);

  const sincronizarListadoOrdenesTrasMutacion = async (): Promise<void> => {
    await refreshOrdenesCompra?.();
    try {
      setLocalOrdenes(await inventarioService.listarOrdenesCompra({ limit: 50 }));
    } catch (error) {
      console.error('Error refrescando ordenes de compra:', error);
    }
  };

  const eliminarOrden = async (oc: InventarioOrdenCompra): Promise<void> => {
    if (oc.estado === 'CERRADA') {
      toast.error('No se pueden eliminar ordenes cerradas.');
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
      const result = await inventarioService.eliminarOrdenCompra(ordenEliminar._id, { justificacion: motivo });
      toast.success(
        result?.reversionAutomatica
          ? `Orden eliminada. Se reversaron y anularon ${result.recepcionesAnuladas ?? 0} recepcion(es).`
          : 'Orden eliminada.'
      );
      setOrdenEliminar(null);
      setMotivoEliminar('');
      await sincronizarListadoOrdenesTrasMutacion();
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar.');
    } finally {
      setEliminando(false);
    }
  };

  const ordenCompraRowActionCatalog = useMemo(
    () =>
      buildOrdenCompraRowActionCatalog(
        {
          onVer: (oc) => {
            setOrdenDetalles(oc);
            setDetallesOpen(true);
          },
          onEditar: abrirEditarOrdenCompra,
          onEliminar: (oc) => void eliminarOrden(oc),
        },
        { esTenantSuperAdmin },
      ),
    [abrirEditarOrdenCompra, esTenantSuperAdmin],
  );

  return (
    <div className="space-y-4">
      {!recepcionAutomatica ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-medium">Flujo en 3 pasos (recepción manual)</p>
            <ol className="list-decimal space-y-0.5 pl-4 text-muted-foreground">
              <li>
                <span className="text-foreground">Nueva orden de compra</span> → queda en{' '}
                <span className="font-medium text-foreground">VERIFICACION</span>.
              </li>
              <li>
                <span className="text-foreground">Detalles → Confirmar orden</span> →{' '}
                <span className="font-medium text-foreground">CONFIRMADO</span> y comprobante contable.
              </li>
              <li>
                <span className="text-foreground">Comprobante entrada</span> → mercancía y kardex físico.
              </li>
            </ol>
          </div>
        </div>
      ) : null}
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
                size="sm"
                className="shrink-0"
                disabled={saving || eliminando}
                onClick={() => setEstadosOrdenOpen(true)}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Estados OC
              </Button>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                disabled={saving || eliminando}
                onClick={abrirComprobanteEntrada}
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
                proveedores={proveedoresUi}
                bodegas={bodegas}
                productos={productosSku}
                ordenEdicion={ordenEdicion}
                recepcionAutomatica={recepcionAutomatica}
                onCreated={sincronizarListadoOrdenesTrasMutacion}
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
            {ordenesUi.length === 0 ? (
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
                    {ordenesUi.map((oc) => (
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
                          <TableCell className="text-right tabular-nums">{moneyFmt.format(sumSubtotalOrdenCompra(oc))}</TableCell>
                          <TableCell>
                            <Badge variant="outline" title={oc.estado}>
                              {labelEstadoOrdenCompra(oc.estado, estadosOrden)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <ParameterizedActionBar
                              catalog={ordenCompraRowActionCatalog}
                              allowedIds={resolveOrdenCompraRowAllowedIds(oc, { esTenantSuperAdmin })}
                              context={oc}
                              globalDisabled={saving || eliminando}
                            />
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Proveedores registrados</p>
            {proveedoresUi.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no hay proveedores. Pulsa «Nuevo proveedor» para dar de alta el primero.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-auto rounded-md border border-border bg-muted/30 p-3">
                {proveedoresUi.map((proveedor) => (
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
              Si la orden tiene recepciones, el sistema intentara reversar kardex y ledger, anular los comprobantes relacionados y luego eliminar la orden.
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

      <InventarioEstadoOrdenCompraConfigModal
        open={estadosOrdenOpen}
        onOpenChange={setEstadosOrdenOpen}
        onSaved={(saved) => setEstadosOrden(saved)}
      />

      <InventarioOrdenCompraDetallesModal
        open={detallesOpen}
        orden={ordenDetalles}
        estadosOrden={estadosOrden}
        onOpenChange={(open) => {
          setDetallesOpen(open);
          if (!open) setOrdenDetalles(null);
        }}
        onOrdenActualizada={(actualizada) => {
          setOrdenDetalles(actualizada);
          void sincronizarListadoOrdenesTrasMutacion();
        }}
      />

      <InventarioComprobanteEntradaModal
        open={comprobanteOpen}
        data={comprobanteData}
        documentoSoporte={comprobanteDoc}
        nombreCorporativo={nombreCorporativo}
        recepcionAutomatica={recepcionAutomatica}
        onConfirmed={(confirmed) => {
          setComprobanteData(confirmed);
          setComprobanteDoc({
            tipo: confirmed.recepcion?.documentoSoporte?.tipo || comprobanteDoc?.tipo || '',
            numero: confirmed.recepcion?.documentoSoporte?.numero || comprobanteDoc?.numero || '',
          });
          void sincronizarListadoOrdenesTrasMutacion();
        }}
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
        ordenesCompra={ordenesUi}
        recepcionAutomatica={config?.compras?.recepcionAutomatica === true}
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
