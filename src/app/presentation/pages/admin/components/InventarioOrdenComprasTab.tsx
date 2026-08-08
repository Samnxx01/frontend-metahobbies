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
import { AlertTriangle, FileText, Pencil, Percent, Settings2, ShoppingCart, Trash2 } from 'lucide-react';
import { getGovernedPath, isGovernedPathConfigured } from '@/app/services/governedNavigation';
import {
  GovernedButton,
  INVENTORY_PURCHASE_ACTION_IDS,
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
import { codigosEstadoPermitenComprobanteEntrada, labelEstadoOrdenCompra, puedeEliminarOrdenCompra } from '@/app/presentation/pages/admin/utils/estadoOrdenCompraUi';
import { getOrdenCompraId } from '@/app/presentation/pages/admin/utils/ordenCompraIdUtils';
import InventarioComprobanteEntradaModal from './InventarioComprobanteEntradaModal';
import InventarioComprobanteEntradaParamModal from './InventarioComprobanteEntradaParamModal';
import InventarioProveedorModal, { type InventarioProveedorDraft } from './InventarioProveedorModal';
import ReglasContablesModal from './ReglasContablesModal';
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
  onProveedorActualizado?: (proveedor: InventarioProveedor) => void;
  onProveedorEliminado?: (id: string) => void;
  /** Opcional si el panel se monta sin `Inventario` (ruta mal resuelta); el listado se refresca con GET local. */
  refreshOrdenesCompra?: () => Promise<void>;
  /** Callbacks optimistas: actualizan el estado del padre sin hacer refetch. */
  onOrdenCreada?: (orden: InventarioOrdenCompra) => void;
  onOrdenEliminada?: (id: string) => void;
  onOrdenActualizadaEnPadre?: (orden: InventarioOrdenCompra) => void;
  /** Refresca solo stock y kardex (sin ordenes) después de un comprobante entrada. */
  refreshStockYKardex?: () => Promise<void>;
  /** Si falta, se calcula con `totalLineaOrdenCompra` (misma regla que `Inventario.tsx`). */
  sumSubtotalOrdenCompra?: (oc: InventarioOrdenCompra) => number;
  /** SuperAdmin de rama: habilita editar/eliminar OC fuera de VERIFICACION. */
  esTenantSuperAdmin?: boolean;
  /** Config inventario (recepcion automatica al guardar OC). */
  config?: InventarioConfig | null;
  nombreCorporativo?: string;
  /** Cambia a la pestaña "Configuracion TRM" (donde vive la parametrización completa de reglas contables). */
  onIrAParametrizacionReglas?: () => void;
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
  onProveedorActualizado,
  onProveedorEliminado,
  refreshOrdenesCompra,
  onOrdenCreada,
  onOrdenEliminada,
  onOrdenActualizadaEnPadre,
  refreshStockYKardex,
  sumSubtotalOrdenCompra: sumSubtotalProp,
  esTenantSuperAdmin = false,
  config = null,
  nombreCorporativo,
  onIrAParametrizacionReglas,
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
  const [reglasContablesOpen, setReglasContablesOpen] = useState(false);
  const [estadosOrden, setEstadosOrden] = useState<EstadoOrdenCompraConfig[]>([]);
  const [localOrdenes, setLocalOrdenes] = useState<InventarioOrdenCompra[]>([]);
  const [localProveedores, setLocalProveedores] = useState<InventarioProveedor[]>([]);
  const [proveedorEdicion, setProveedorEdicion] = useState<InventarioProveedor | null>(null);
  const [proveedorEliminar, setProveedorEliminar] = useState<InventarioProveedor | null>(null);
  const [procesandoProveedor, setProcesandoProveedor] = useState(false);

  const ordenesUi = useMemo(
    () => (ordenesCompra.length > 0 ? ordenesCompra : localOrdenes),
    [ordenesCompra, localOrdenes],
  );

  const ORDENES_PAGE_SIZE = 10;
  const [paginaOrdenes, setPaginaOrdenes] = useState(1);
  const totalPaginasOrdenes = Math.max(1, Math.ceil(ordenesUi.length / ORDENES_PAGE_SIZE));
  const paginaOrdenesActual = Math.min(paginaOrdenes, totalPaginasOrdenes);
  const ordenesVisibles = useMemo(
    () => ordenesUi.slice((paginaOrdenesActual - 1) * ORDENES_PAGE_SIZE, paginaOrdenesActual * ORDENES_PAGE_SIZE),
    [ordenesUi, paginaOrdenesActual],
  );

  useEffect(() => {
    setPaginaOrdenes(1);
  }, [ordenesUi.length]);
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

  /** Actualiza optimistamente una orden en el estado local y del padre. */
  const actualizarOrdenEnEstado = (orden: InventarioOrdenCompra): void => {
    const id = getOrdenCompraId(orden);
    setLocalOrdenes((prev) => prev.map((oc) => (getOrdenCompraId(oc) === id ? orden : oc)));
    onOrdenActualizadaEnPadre?.(orden);
  };

  const proveedorId = (proveedor: InventarioProveedor): string =>
    String(proveedor._id || proveedor.iud || '');

  const guardarProveedor = async (draft: InventarioProveedorDraft): Promise<void> => {
    if (!proveedorEdicion) {
      await guardarProveedorCompra(draft);
      return;
    }
    const id = proveedorId(proveedorEdicion);
    if (!id) {
      toast.error('El proveedor no tiene un ID valido.');
      return;
    }
    try {
      setProcesandoProveedor(true);
      const actualizado = await inventarioService.actualizarProveedorCompra(id, {
        nombre: draft.nombre.trim(),
        nit: draft.nit.trim(),
        correo: draft.correo.trim(),
        telefono: draft.telefono.trim(),
        direccion: draft.direccion.trim(),
        aplicaIva: draft.aplicaIva,
        tipoProveedorId: draft.tipoProveedorId || undefined,
        paisId: draft.paisId || undefined,
        departamentoId: draft.departamentoId || undefined,
        ciudadId: draft.ciudadId || undefined,
        responsabilidadesFiscales: draft.responsabilidadesFiscales,
      });
      setLocalProveedores((prev) => prev.map((item) => proveedorId(item) === id ? actualizado : item));
      onProveedorActualizado?.(actualizado);
      setProveedorEdicion(null);
      setProveedorModalOpen(false);
      toast.success('Proveedor actualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo actualizar el proveedor.');
    } finally {
      setProcesandoProveedor(false);
    }
  };

  const confirmarEliminarProveedor = async (): Promise<void> => {
    if (!proveedorEliminar) return;
    const id = proveedorId(proveedorEliminar);
    if (!id) return;
    try {
      setProcesandoProveedor(true);
      await inventarioService.eliminarProveedorCompra(id);
      setLocalProveedores((prev) => prev.filter((item) => proveedorId(item) !== id));
      onProveedorEliminado?.(id);
      setProveedorEliminar(null);
      toast.success('Proveedor desactivado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo desactivar el proveedor.');
    } finally {
      setProcesandoProveedor(false);
    }
  };

  const eliminarOrden = async (oc: InventarioOrdenCompra): Promise<void> => {
    const estaConfirmada = String(oc.estado || '').toUpperCase() !== 'VERIFICACION';
    const tieneRecepciones = (oc.nRecepciones ?? 0) > 0;
    const requiereCasoOmiso = estaConfirmada && tieneRecepciones;
    if (requiereCasoOmiso && !esTenantSuperAdmin) {
      toast.error('No se puede eliminar: la orden está confirmada y tiene comprobantes de entrada. Solo un SuperAdmin puede forzar la eliminación.');
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
      const estaConfirmada = String(ordenEliminar.estado || '').toUpperCase() !== 'VERIFICACION';
      const tieneRecepciones = (ordenEliminar.nRecepciones ?? 0) > 0;
      const confirmarCasoOmiso = esTenantSuperAdmin && estaConfirmada && tieneRecepciones;
      const result = await inventarioService.eliminarOrdenCompra(getOrdenCompraId(ordenEliminar), {
        justificacion: motivo,
        confirmarCasoOmiso,
      });
      toast.success(
        result?.casoOmisoTenant
          ? 'Orden eliminada por caso omiso del tenant. Auditoria registrada.'
          : result?.reversionAutomatica
          ? `Orden eliminada. Se reversaron y anularon ${result.recepcionesAnuladas ?? 0} recepcion(es).`
          : 'Orden eliminada.'
      );
      const eliminadoId = getOrdenCompraId(ordenEliminar);
      setOrdenEliminar(null);
      setMotivoEliminar('');
      // Actualización inmediata — no refetch
      setLocalOrdenes((prev) => prev.filter((oc) => getOrdenCompraId(oc) !== eliminadoId));
      onOrdenEliminada?.(eliminadoId);
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
        { esTenantSuperAdmin, estadosOrden },
      ),
    [abrirEditarOrdenCompra, esTenantSuperAdmin, estadosOrden],
  );
  const eliminacionForzadaTenant = Boolean(
    ordenEliminar &&
    esTenantSuperAdmin &&
    String(ordenEliminar.estado || '').toUpperCase() !== 'VERIFICACION' &&
    (ordenEliminar.nRecepciones ?? 0) > 0
  );

  return (
    <div className="space-y-4">
      {!recepcionAutomatica ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
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
              <GovernedButton
                actionId={INVENTORY_PURCHASE_ACTION_IDS.MANAGE_ORDER_STATUSES}
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={saving || eliminando}
                onClick={() => setEstadosOrdenOpen(true)}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Estados OC
              </GovernedButton>
              <GovernedButton
                actionId={INVENTORY_PURCHASE_ACTION_IDS.CREATE_RECEIPT}
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={saving || eliminando}
                onClick={abrirComprobanteEntrada}
              >
                <FileText className="mr-2 h-4 w-4" />
                Comprobante entrada
              </GovernedButton>
              <GovernedButton
                actionId={INVENTORY_PURCHASE_ACTION_IDS.MANAGE_ACCOUNTING_RULES}
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={saving || eliminando}
                onClick={() => setReglasContablesOpen(true)}
              >
                <Percent className="mr-2 h-4 w-4" />
                Reglas contables
              </GovernedButton>
              <InventarioProveedorModal
                open={proveedorModalOpen}
                saving={saving || procesandoProveedor}
                onOpenChange={(open) => {
                  setProveedorModalOpen(open);
                  if (!open) setProveedorEdicion(null);
                }}
                onSubmit={guardarProveedor}
                showTrigger
                triggerActionId={INVENTORY_PURCHASE_ACTION_IDS.CREATE_PROVIDER}
                triggerClassName="shrink-0"
                proveedor={proveedorEdicion}
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
                ambitosReglaImpuesto={config?.compras?.ambitosReglaImpuesto}
                onCreated={(orden) => {
                  if (!orden) return;
                  const id = getOrdenCompraId(orden);
                  const esEdicion = localOrdenes.some((oc) => getOrdenCompraId(oc) === id)
                    || ordenesCompra.some((oc) => getOrdenCompraId(oc) === id);
                  if (esEdicion) {
                    actualizarOrdenEnEstado(orden);
                  } else {
                    setLocalOrdenes((prev) => [orden, ...prev]);
                    onOrdenCreada?.(orden);
                  }
                }}
                onAntesNuevaOrden={abrirNuevaOrdenCompra}
                showTrigger
                triggerActionId={INVENTORY_PURCHASE_ACTION_IDS.CREATE_ORDER}
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
                    {ordenesVisibles.map((oc) => (
                        <TableRow key={getOrdenCompraId(oc)}>
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
                              allowedIds={resolveOrdenCompraRowAllowedIds(oc, { esTenantSuperAdmin, estadosOrden })}
                              context={oc}
                              globalDisabled={saving || eliminando}
                            />
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-col gap-2 border-t border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">
                    {ordenesUi.length} orden(es) · Página {paginaOrdenesActual} de {totalPaginasOrdenes}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={paginaOrdenesActual <= 1}
                      onClick={() => setPaginaOrdenes((prev) => Math.max(1, prev - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={paginaOrdenesActual >= totalPaginasOrdenes}
                      onClick={() => setPaginaOrdenes((prev) => Math.min(totalPaginasOrdenes, prev + 1))}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
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
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-foreground">{proveedor.nombre}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <GovernedButton
                          actionId={INVENTORY_PURCHASE_ACTION_IDS.EDIT_PROVIDER}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          disabled={saving || procesandoProveedor}
                          onClick={() => {
                            setProveedorEdicion(proveedor);
                            setProveedorModalOpen(true);
                          }}
                          aria-label={`Editar proveedor ${proveedor.nombre}`}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Editar
                        </GovernedButton>
                        <GovernedButton
                          actionId={INVENTORY_PURCHASE_ACTION_IDS.DEACTIVATE_PROVIDER}
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-8 px-2"
                          disabled={saving || procesandoProveedor}
                          onClick={() => setProveedorEliminar(proveedor)}
                          aria-label={`Desactivar proveedor ${proveedor.nombre}`}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Desactivar
                        </GovernedButton>
                      </div>
                    </div>
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

      <Dialog open={Boolean(proveedorEliminar)} onOpenChange={(open) => {
        if (!open && !procesandoProveedor) setProveedorEliminar(null);
      }}>
        <DialogContent className="max-w-md border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Desactivar proveedor
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              El proveedor dejará de aparecer en el catálogo y no podrá seleccionarse en nuevas órdenes de compra.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">{proveedorEliminar?.nombre}</span>
            <span className="block text-muted-foreground">NIT {proveedorEliminar?.nit}</span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={procesandoProveedor} onClick={() => setProveedorEliminar(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={procesandoProveedor} onClick={() => void confirmarEliminarProveedor()}>
              <Trash2 className="mr-2 h-4 w-4" />
              {procesandoProveedor ? 'Desactivando...' : 'Desactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {eliminacionForzadaTenant
                ? 'Caso omiso tenant: se eliminara la orden y quedara una auditoria con observacion, fecha, hora, usuario e IP.'
                : 'Solo se eliminan ordenes en verificacion y sin comprobantes de entrada asociados.'}
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
              {eliminando
                ? 'Eliminando...'
                : eliminacionForzadaTenant
                  ? 'Confirmar caso omiso'
                  : 'Eliminar orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventarioEstadoOrdenCompraConfigModal
        open={estadosOrdenOpen}
        onOpenChange={setEstadosOrdenOpen}
        onSaved={(saved) => setEstadosOrden(saved)}
      />

      <ReglasContablesModal
        open={reglasContablesOpen}
        onOpenChange={setReglasContablesOpen}
        saving={saving}
        modoResumen
        onIrACompleta={
          onIrAParametrizacionReglas || isGovernedPathConfigured('reglasContablesCompleta')
            ? () => {
                setReglasContablesOpen(false);
                // Redirect gobernado: parametrizable en Dashboard admin → Redirects dinámicos.
                // Abre el destino en una pestaña nueva del navegador; si no está
                // configurado, cae al comportamiento local (pestaña interna de parametrización).
                if (isGovernedPathConfigured('reglasContablesCompleta')) {
                  window.open(getGovernedPath('reglasContablesCompleta'), '_blank', 'noopener');
                  return;
                }
                onIrAParametrizacionReglas?.();
              }
            : undefined
        }
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
          actualizarOrdenEnEstado(actualizada);
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
          // Actualizar la orden en lista sin refetch
          if (confirmed.orden) actualizarOrdenEnEstado(confirmed.orden);
          // Solo stock y kardex cambiaron — refrescar en background
          void refreshStockYKardex?.();
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
