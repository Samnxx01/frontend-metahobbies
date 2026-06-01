import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  ShoppingCart,
  SlidersHorizontal,
  Warehouse,
} from 'lucide-react';
import inventarioService, {
  type AjusteInventario,
  type AjustePayload,
  type BodegaInventario,
  type EstadoAjuste,
  type InventarioConfig,
  type InventarioMovimiento,
  type InventarioOrdenCompra,
  type InventarioProveedor,
  type RecepcionOrdenCompraResponse,
  type InventarioSaldo,
  type InventarioTipoMovimiento,
  type InventarioTipoUnidadMedida,
  type InventarioUnidadMedida,
  type MetodoValuacion,
  type MonedaInventarioConfig,
  type ComprobanteEntradaAjuste,
  type InventarioMotivoMovimiento,
  type MotivoMovimiento,
  type StockActualItem,
} from '@/app/services/inventarioService';
import { totalLineaOrdenCompra } from '@/app/presentation/pages/admin/utils/ordenCompraLineaCalculo';
import productosService, { type BackendProducto } from '@/app/services/productosService';
import { apiFetch } from '@/app/services/api';
import { useAuth } from '@/app/providers/AuthProvider';
import InventarioMenuTabs, { type InventarioTabValue } from './components/InventarioMenuTabs';
import { useInventarioTarjetasDinamicas } from './inventario/useInventarioTarjetasDinamicas';
import {
  FLUJO_COMPRAS_PASOS,
  mensajeErrorComprasInventario,
} from './inventario/inventarioComprasMensajes';
import InventarioAjustesTab from './components/InventarioAjustesTab';
import InventarioBodegasTab from './components/InventarioBodegasTab';
import InventarioConciliacionTab from './components/InventarioConciliacionTab';
import InventarioTrmConfiguracionTab from './components/InventarioTrmConfiguracionTab';
import InventarioMovimientosTab from './components/InventarioMovimientosTab';
import InventarioComprobanteEntradaModal, { type DocumentoSoporte } from './components/InventarioComprobanteEntradaModal';
import InventarioComprobanteEntradaVistaModal from './components/InventarioComprobanteEntradaVistaModal';
import InventarioCausalAjusteModal from './components/InventarioCausalAjusteModal';
import InventarioOrdenCompraModal from './components/InventarioOrdenCompraModal';
import InventarioOrdenComprasTab from './components/InventarioOrdenComprasTab';
import InventarioProveedorModal, { type InventarioProveedorDraft } from './components/InventarioProveedorModal';
import InventarioSkuCatalogoModal from './components/InventarioSkuCatalogoModal';
import InventarioSkuModal, { type SkuForm } from './components/InventarioSkuModal';
import { getProductoId } from './inventario/inventarioBarcodeUtils';
import InventarioStockTab from './components/InventarioStockTab';
import InventarioTipoMovimientoModal, { type TipoMovimientoDraft } from './components/InventarioTipoMovimientoModal';
import InventarioUnidadMedidaModal, { type UnidadMedidaDraft } from './components/InventarioUnidadMedidaModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

/** Valor interno del select cuando no hay bodega filtrada (Radix Select no admite value vacío). */
const BODEGA_TODAS = '__TODAS__';
const SKU_TODOS = '__TODOS_SKU__';

const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const MOTIVOS_FALLBACK: InventarioMotivoMovimiento[] = [
  { codigo: 'COMPRA', nombre: 'Compra' },
  { codigo: 'VENTA', nombre: 'Venta' },
  { codigo: 'OTRO', nombre: 'Otro' },
];
/** Nombres de departamento (DANE) — alineado con DireccionCorporativa / catálogo paisId=1 */
const DEPARTAMENTO_NOMBRES: Record<string, string> = {
  '1': 'Amazonas', '2': 'Antioquia', '3': 'Arauca', '4': 'Atlántico', '5': 'Bogotá D.C.',
  '6': 'Bolívar', '7': 'Boyacá', '8': 'Caldas', '9': 'Caquetá', '10': 'Casanare',
  '11': 'Cauca', '12': 'Cesar', '13': 'Chocó', '14': 'Córdoba', '15': 'Cundinamarca',
  '16': 'Guainía', '17': 'Guaviare', '18': 'Huila', '19': 'La Guajira', '20': 'Magdalena',
  '21': 'Meta', '22': 'Nariño', '23': 'Norte de Santander', '24': 'Putumayo', '25': 'Quindío',
  '26': 'Risaralda', '27': 'San Andrés y Providencia', '28': 'Santander', '29': 'Sucre',
  '30': 'Tolima', '31': 'Valle del Cauca', '32': 'Vaupés', '33': 'Vichada',
};

type GeoDepartamentoRow = { departamentoId: string; nombre_Departamento?: string; ciudades?: Array<{ ciudadId: string; nombre_ciudad: string }> };

type BodegaFormState = {
  nombre: string;
  descripcion: string;
  depId: string;
  ciudadId: string;
  /** Otros municipios del mismo departamento (subnodos); la ciudad del select es siempre la cabecera */
  municipiosExtra: string[];
  /** Solo relevante al editar; en creación se ignora (API asume activa) */
  estado: boolean;
};

const bodegaFormVacio = (): BodegaFormState => ({
  nombre: '',
  descripcion: '',
  depId: '',
  ciudadId: '',
  municipiosExtra: [],
  estado: true,
});

type MovimientoForm = {
  tipo: 'ENTRADA' | 'SALIDA';
  tipoMovimientoConfigId: string;
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

const movimientoInicial: MovimientoForm = {
  tipo: 'ENTRADA',
  tipoMovimientoConfigId: '',
  ordenCompraId: '',
  ordenCompraItemIndex: '',
  recepcionCompraId: '',
  recepcionLineaKey: '',
  sku: '',
  bodega: '',
  bodegaDestino: '',
  cantidad: '',
  costoUnitario: '',
  motivo: 'COMPRA',
  motivoPersonalizado: '',
  documentoTipo: 'DOCUMENTO_SOPORTE',
  documentoNumero: '',
};

const esTipoTrasladoBodega = (codigo?: string): boolean =>
  String(codigo || '').trim().toUpperCase() === 'TRASLADO_BODEGA';

const ajusteInicial: AjustePayload = {
  recepcionCompraId: '',
  sku: '',
  bodega: '',
  tipoAjusteCodigo: 'AJUSTE_POSITIVO',
  causal: 'OTRO',
  cantidad: 1,
  costoUnitarioReferencia: 0,
  observacion: '',
};

const skuFormInicial: SkuForm = {
  sku: '',
  codigoBarras: '',
  nombre: '',
  precio: '1',
  unidadMedida: 'UNIDAD',
  stockMinimo: '0',
  descripcion: '',
};

const tipoMovimientoDraftInicial: TipoMovimientoDraft = {
  codigo: '',
  nombre: '',
  descripcion: '',
  naturaleza: 'ENTRADA',
  estado: true,
};

const unidadMedidaDraftInicial: UnidadMedidaDraft = {
  codigo: '',
  nombre: '',
  tipoUnidad: '',
  descripcion: '',
  estado: true,
  esUnidadBaseInventario: true,
  unidadBaseRelacionadaId: '',
  factorConversionHaciaBase: '',
};

const formatDate = (value?: string): string => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const estadoBadge = (estado: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (estado === 'APROBADO' || estado === 'REINGRESADA') return 'default';
  if (estado === 'RECHAZADO' || estado === 'DADA_DE_BAJA') return 'destructive';
  if (estado === 'SOLICITADO' || estado === 'EN_CUARENTENA') return 'secondary';
  return 'outline';
};

export type InventarioPageProps = {
  /** Rutas dinámicas que deben abrir una pestaña concreta al montar (p. ej. wrapper `InventarioOrdenComprasTab.tsx`). */
  initialActiveTab?: InventarioTabValue;
};

export default function Inventario(props: InventarioPageProps = {}): React.ReactElement {
  const { initialActiveTab } = props;
  const { user } = useAuth();
  const { menuTabs: inventarioMenuTabs, loading: loadingInventarioTabs } = useInventarioTarjetasDinamicas(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<InventarioConfig | null>(null);
  const [bodegas, setBodegas] = useState<BodegaInventario[]>([]);
  const [stockActual, setStockActual] = useState<StockActualItem[]>([]);
  const [productosSku, setProductosSku] = useState<BackendProducto[]>([]);
  const [tiposMovimiento, setTiposMovimiento] = useState<InventarioTipoMovimiento[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<InventarioUnidadMedida[]>([]);
  const [kardex, setKardex] = useState<InventarioMovimiento[]>([]);
  const [ajustes, setAjustes] = useState<AjusteInventario[]>([]);
  const [stockConsulta, setStockConsulta] = useState<InventarioSaldo | null>(null);
  const [stockFiltro, setStockFiltro] = useState({ sku: '' });
  const [stockSkuQuery, setStockSkuQuery] = useState('');
  const [bodegaVistaStock, setBodegaVistaStock] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [bodegaForm, setBodegaForm] = useState<BodegaFormState>(bodegaFormVacio);
  const [editingBodegaId, setEditingBodegaId] = useState<string | null>(null);
  const [bodegaDeleteTarget, setBodegaDeleteTarget] = useState<BodegaInventario | null>(null);
  const [bodegaDeleteBusy, setBodegaDeleteBusy] = useState(false);
  const [bodegaDepartamentos, setBodegaDepartamentos] = useState<GeoDepartamentoRow[]>([]);
  const [bodegaCiudades, setBodegaCiudades] = useState<Array<{ ciudadId: string; nombre_ciudad: string }>>([]);
  const [movimientoForm, setMovimientoForm] = useState<MovimientoForm>(movimientoInicial);
  const [ajusteForm, setAjusteForm] = useState<AjustePayload>(ajusteInicial);
  const [ajusteFiltro, setAjusteFiltro] = useState<EstadoAjuste | ''>('');
  const [activeTab, setActiveTab] = useState<InventarioTabValue>(() => {
    const t = initialActiveTab ?? 'stock';
    if (t === 'config') return 'stock';
    return t;
  });
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuCatalogoOpen, setSkuCatalogoOpen] = useState(false);
  const [skuForm, setSkuForm] = useState<SkuForm>(skuFormInicial);
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [tipoMovimientoDraft, setTipoMovimientoDraft] = useState<TipoMovimientoDraft>(tipoMovimientoDraftInicial);
  const [unidadModalOpen, setUnidadModalOpen] = useState(false);
  const [unidadMedidaDraft, setUnidadMedidaDraft] = useState<UnidadMedidaDraft>(unidadMedidaDraftInicial);
  const [unidadDeleteTarget, setUnidadDeleteTarget] = useState<InventarioUnidadMedida | null>(null);
  const [unidadDeleteBusy, setUnidadDeleteBusy] = useState(false);
  const [tiposUnidadMedida, setTiposUnidadMedida] = useState<InventarioTipoUnidadMedida[]>([]);
  const [proveedoresCompra, setProveedoresCompra] = useState<InventarioProveedor[]>([]);
  const [proveedorModalOpen, setProveedorModalOpen] = useState(false);
  const [ordenCompraModalOpen, setOrdenCompraModalOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState<InventarioOrdenCompra | null>(null);
  const [ordenesCompra, setOrdenesCompra] = useState<InventarioOrdenCompra[]>([]);
  const [motivosMovimiento, setMotivosMovimiento] = useState<InventarioMotivoMovimiento[]>(MOTIVOS_FALLBACK);
  const [comprobantesEntradaMov, setComprobantesEntradaMov] = useState<ComprobanteEntradaAjuste[]>([]);
  const [comprobanteVistaOpen, setComprobanteVistaOpen] = useState(false);
  const [comprobanteVistaId, setComprobanteVistaId] = useState<string | null>(null);
  const [causalMotivoModalOpen, setCausalMotivoModalOpen] = useState(false);
  const [comprobanteEntradaOpen, setComprobanteEntradaOpen] = useState(false);
  const [comprobanteEntradaData, setComprobanteEntradaData] = useState<RecepcionOrdenCompraResponse | null>(null);
  const [comprobanteEntradaDoc, setComprobanteEntradaDoc] = useState<DocumentoSoporte | null>(null);

  const handleOrdenCompraModalChange = (nextOpen: boolean): void => {
    setOrdenCompraModalOpen(nextOpen);
    if (!nextOpen) setOrdenEditando(null);
  };

  const abrirNuevaOrdenCompra = (): void => {
    setOrdenEditando(null);
    setOrdenCompraModalOpen(true);
  };

  const abrirEditarOrdenCompra = (oc: InventarioOrdenCompra): void => {
    setOrdenEditando(oc);
    setOrdenCompraModalOpen(true);
  };

  const resumen = useMemo(() => {
    const valorTotal = stockActual.reduce((acc, item) => {
      const valor = Number(item.valorTotal ?? Number(item.cantidadDisponible || 0) * Number(item.costoPromedioUnitario || 0));
      return acc + valor;
    }, 0);
    const unidades = stockActual.reduce((acc, item) => acc + Number(item.cantidadDisponible || 0), 0);
    const pendientes = ajustes.filter((ajuste) => ajuste.estado === 'SOLICITADO').length;

    return {
      skus: new Set(stockActual.map((item) => item.sku)).size,
      unidades,
      valorTotal,
      pendientes,
    };
  }, [ajustes, stockActual]);

  const bodegaOptions = useMemo(
    () => bodegas.filter((b) => b.estado).map((bodega) => bodega.nombre),
    [bodegas]
  );

  const skuOptions = useMemo(
    () => productosSku
      .filter((producto) => producto.sku)
      .sort((a, b) => String(a.sku).localeCompare(String(b.sku))),
    [productosSku]
  );

  const skuOptionsFiltradasStock = useMemo(() => {
    const q = String(stockSkuQuery || '').trim().toUpperCase();
    if (!q) return skuOptions;
    return skuOptions.filter((producto) => {
      const sku = String(producto.sku || '').trim().toUpperCase();
      const nombre = String((producto as any).nombre || '').trim().toUpperCase();
      return sku.includes(q) || nombre.includes(q);
    });
  }, [skuOptions, stockSkuQuery]);
  const tenantScope = user?.auth?.tenantScope || {};
  const nombreCorporativoImpresion = useMemo(() => {
    const currentUser = user as Record<string, any> | null;
    return String(
      currentUser?.corporativo?.razon_social
      || currentUser?.tenantCorporativo?.razon_social
      || currentUser?.perfil?.corporativo?.razon_social
      || currentUser?.perfil?.razon_social
      || currentUser?.empresa
      || currentUser?.nombreEmpresa
      || 'Mabs by Gabs'
    ).trim();
  }, [user]);
  const puedeGestionarSku = Boolean(
    user?.tenantSuperAdminId
    || user?.tenantGlobalId
    || tenantScope?.tenantSuperAdminId
    || tenantScope?.tenantGlobalId
  );
  /** Sesión con tenantSuperAdmin: puede editar/eliminar órdenes aunque no estén ABIERTA (alineado al backend). */
  const esUsuarioTenantSuperAdmin = Boolean(
    String(user?.tenantSuperAdminId || tenantScope?.tenantSuperAdminId || '').trim()
  );

  const tiposMovimientoActivos = useMemo(
    () => tiposMovimiento.filter((tipo) => tipo.estado),
    [tiposMovimiento]
  );

  const sumSubtotalOrdenCompra = (oc: InventarioOrdenCompra): number =>
    (oc.items || []).reduce((acc, it) => acc + totalLineaOrdenCompra(it), 0);

  const calcularCostoUnitarioOrdenCompra = (
    item: InventarioOrdenCompra['items'][number]
  ): number => {
    const cantidadOrdenada = Number(item.cantidadOrdenada || 0);
    const lineTotal = totalLineaOrdenCompra(item);
    if (cantidadOrdenada > 0 && lineTotal > 0) {
      return Math.round(((lineTotal / cantidadOrdenada) + Number.EPSILON) * 100) / 100;
    }

    return Math.round((Number(item.costoUnitario || 0) + Number.EPSILON) * 100) / 100;
  };

  const recargarComprobantesEntrada = async (): Promise<void> => {
    try {
      const data = await inventarioService.listarComprobantesEntradaMovimientos(200);
      setComprobantesEntradaMov(data);
      toast.success('Lista de comprobantes actualizada.');
    } catch (error) {
      console.error('Error recargando comprobantes:', error);
      toast.error('No se pudieron cargar los comprobantes de entrada.');
    }
  };

  const seleccionarLineaComprobanteSalida = (recepcionCompraId: string, lineaKey: string): void => {
    const comprobante = comprobantesEntradaMov.find((c) => c.recepcionId === recepcionCompraId);
    const linea = comprobante?.items.find((item) => (item.lineaKey || `${item.sku}::${item.bodega}`) === lineaKey);
    const doc = comprobante?.documentoSoporte;
    if (!comprobante || !linea) {
      setMovimientoForm((prev) => ({
        ...prev,
        recepcionCompraId,
        recepcionLineaKey: lineaKey,
        sku: '',
        bodega: '',
        cantidad: '',
        costoUnitario: '',
        documentoTipo: doc?.tipo || 'RECEPCION_OC',
        documentoNumero: doc?.numero || comprobante?.numeroRecepcion || '',
      }));
      return;
    }
    const disponible = Number(linea.disponibleKardex || 0);
    setMovimientoForm((prev) => ({
      ...prev,
      recepcionCompraId,
      recepcionLineaKey: lineaKey,
      sku: linea.sku,
      bodega: linea.bodega,
      cantidad: disponible > 0 ? String(disponible) : '',
      costoUnitario: String(linea.costoPromedioKardex ?? linea.costoUnitario ?? ''),
      documentoTipo: doc?.tipo || 'RECEPCION_OC',
      documentoNumero: doc?.numero || comprobante.numeroRecepcion,
    }));
  };

  const seleccionarLineaComprobanteEntradaCompra = (recepcionCompraId: string, lineaKey: string): void => {
    const comprobante = comprobantesEntradaMov.find((c) => c.recepcionId === recepcionCompraId);
    const linea = comprobante?.items.find((item) => (item.lineaKey || `${item.sku}::${item.bodega}`) === lineaKey);
    const doc = comprobante?.documentoSoporte;
    if (!comprobante || !linea) {
      setMovimientoForm((prev) => ({
        ...prev,
        ordenCompraId: '',
        ordenCompraItemIndex: '',
        recepcionCompraId,
        recepcionLineaKey: lineaKey,
        sku: '',
        bodega: '',
        cantidad: '',
        costoUnitario: '',
        motivo: 'COMPRA',
        tipo: 'ENTRADA',
        documentoTipo: doc?.tipo || 'RECEPCION_OC',
        documentoNumero: doc?.numero || comprobante?.numeroRecepcion || '',
      }));
      return;
    }
    setMovimientoForm((prev) => ({
      ...prev,
      ordenCompraId: '',
      ordenCompraItemIndex: '',
      recepcionCompraId,
      recepcionLineaKey: lineaKey,
      tipo: 'ENTRADA',
      sku: linea.sku,
      bodega: linea.bodega,
      cantidad: String(Number(linea.cantidadRecibida || 0) || ''),
      costoUnitario: String(linea.costoUnitario ?? ''),
      motivo: 'COMPRA',
      documentoTipo: doc?.tipo || 'RECEPCION_OC',
      documentoNumero: doc?.numero || comprobante.numeroRecepcion,
    }));
  };

  const seleccionarLineaOrdenCompraMovimiento = (ordenCompraId: string, itemIndexText: string): void => {
    const orden = ordenesCompra.find((oc) => oc._id === ordenCompraId);
    const itemIndex = Number(itemIndexText);
    const item = orden?.items?.[itemIndex];
    const documentoNumero = orden?.numeroRemision?.trim() || orden?.numeroFacturaElectronico?.trim() || orden?.numeroOrden || '';
    if (!orden || !item || !Number.isInteger(itemIndex)) {
      setMovimientoForm((prev) => ({
        ...prev,
        ordenCompraId,
        ordenCompraItemIndex: itemIndexText,
        sku: '',
        bodega: '',
        cantidad: '',
        costoUnitario: '',
        motivo: 'COMPRA',
        documentoTipo: 'RECEPCION_OC',
        documentoNumero,
      }));
      return;
    }
    const pendiente = Math.max(0, Number(item.cantidadOrdenada || 0) - Number(item.cantidadRecibida || 0));
    const cantidadReferencia = pendiente > 0
      ? pendiente
      : Number((item as any).cantidadRecibida || 0) || Number(item.cantidadOrdenada || 0);
    const costoUnitarioCalculado = calcularCostoUnitarioOrdenCompra(item);
    setMovimientoForm((prev) => ({
      ...prev,
      ordenCompraId,
      ordenCompraItemIndex: itemIndexText,
      tipo: 'ENTRADA',
      sku: item.sku,
      bodega: item.bodega,
      cantidad: cantidadReferencia > 0 ? String(cantidadReferencia) : '',
      costoUnitario: String(costoUnitarioCalculado),
      motivo: 'COMPRA',
      documentoTipo: 'RECEPCION_OC',
      documentoNumero,
    }));
  };

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [configResp, bodegasResp, stockResp, ajustesResp, productosResp, tiposResp, unidadesResp, tiposUnidadResp, proveedoresResp, ordenesResp, causalesResp, comprobantesEntradaResp] = await Promise.all([
        inventarioService.obtenerConfig(),
        inventarioService.listarBodegas(),
        inventarioService.stockActual(),
        inventarioService.listarAjustes({ estado: ajusteFiltro }),
        productosService.listarProductosAdmin({ tipo: 'FISICO', estadoCatalogo: 'ACTIVO' }),
        inventarioService.listarTiposMovimientoAdmin(),
        inventarioService.listarUnidadesMedidaAdmin(),
        inventarioService.listarTiposUnidadMedida(),
        inventarioService.listarProveedoresCompra(),
        inventarioService.listarOrdenesCompra({ limit: 50 }),
        inventarioService.listarCausalesAjuste(),
        inventarioService.listarComprobantesEntradaMovimientos(200),
      ]);
      setConfig(configResp);
      setBodegas(bodegasResp);
      setStockActual(stockResp);
      setAjustes(ajustesResp);
      setProductosSku(productosResp.filter((producto) => Boolean(producto.sku)));
      setTiposMovimiento(tiposResp);
      setUnidadesMedida(unidadesResp);
      setTiposUnidadMedida(tiposUnidadResp);
      setProveedoresCompra(proveedoresResp);
      setOrdenesCompra(ordenesResp);
      aplicarMotivosDesdeCausales(causalesResp || []);
      setComprobantesEntradaMov(comprobantesEntradaResp || []);
      if (!movimientoForm.tipoMovimientoConfigId) {
        const first = tiposResp.find((tipo) => tipo.estado);
        if (first) {
          setMovimientoForm((prev) => ({
            ...prev,
            tipo: first.naturaleza,
            tipoMovimientoConfigId: first._id,
          }));
        }
      }
      if (!unidadesResp.some((unidad) => unidad.estado && unidad.codigo === skuForm.unidadMedida)) {
        const firstUnidad = unidadesResp.find((unidad) => unidad.estado);
        if (firstUnidad) {
          setSkuForm((prev) => ({ ...prev, unidadMedida: firstUnidad.codigo }));
        }
      }
    } catch (error) {
      console.error('Error cargando inventario:', error);
      toast.error('No se pudo cargar el módulo de inventario.');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrdenesCompra = async (): Promise<void> => {
    const [ordenes, stock, kardexActualizado] = await Promise.all([
      inventarioService.listarOrdenesCompra({ limit: 50 }),
      inventarioService.stockActual(),
      inventarioService.listarKardex({ limit: 50 }),
    ]);
    setOrdenesCompra(ordenes);
    setStockActual(stock);
    setKardex(kardexActualizado);
  };

  useEffect(() => {
    void loadData();
  }, []);

  /** Al entrar en «Orden/compras» vuelve a pedir catálogo (GET) por si el montaje inicial falló o cambió el tenant. */
  useEffect(() => {
    if (activeTab !== 'orden-compras' || loading) return;
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const [proveedoresResp, ordenesResp] = await Promise.all([
          inventarioService.listarProveedoresCompra(),
          inventarioService.listarOrdenesCompra({ limit: 50 }),
        ]);
        if (cancelled) return;
        setProveedoresCompra(proveedoresResp);
        setOrdenesCompra(ordenesResp);
      } catch (error) {
        if (cancelled) return;
        console.error('Error cargando catalogo de compras:', error);
        toast.error(
          error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo cargar proveedores y ordenes de compra.'
        );
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, loading]);

  /** Pestaña TRM solo con contexto JWT Global o SuperAdmin; si no aplica, evita quedar en TRM sin trigger. */
  /** Si el menú dinámico (GET tarjetas) no incluye la pestaña activa, ir a la primera visible. */
  useEffect(() => {
    if (!inventarioMenuTabs.length) return;
    if (inventarioMenuTabs.some((t) => t.value === activeTab)) return;
    setActiveTab(inventarioMenuTabs[0].value);
  }, [activeTab, inventarioMenuTabs]);

  useEffect(() => {
    const loadGeo = async (): Promise<void> => {
      try {
        const location = await apiFetch('/api/perfil/seguridad/listar/paises/departamentos/ciudades?paisId=1', { method: 'GET' });
        setBodegaDepartamentos((location?.departamentos || []) as GeoDepartamentoRow[]);
      } catch (error) {
        console.error('Error cargando departamentos:', error);
        toast.error('No se pudo cargar el catálogo de departamentos y ciudades.');
      }
    };
    void loadGeo();
  }, []);

  useEffect(() => {
    if (!bodegaForm.depId) {
      setBodegaCiudades([]);
      return;
    }
    const dep = bodegaDepartamentos.find((d) => String(d.departamentoId) === String(bodegaForm.depId));
    setBodegaCiudades(dep?.ciudades ?? []);
  }, [bodegaForm.depId, bodegaDepartamentos]);

  const refreshAjustes = async (estado: EstadoAjuste | '' = ajusteFiltro): Promise<void> => {
    const data = await inventarioService.listarAjustes({ estado });
    setAjustes(data);
  };

  const refreshKardex = async (filtro?: { sku?: string }): Promise<void> => {
    const sku = (filtro?.sku ?? stockFiltro.sku).trim();
    const bodega = bodegaVistaStock.trim();
    const data = await inventarioService.listarKardex({
      sku: sku || undefined,
      bodega: bodega || undefined,
      limit: 100,
    });
    setKardex(data);
  };

  const buildResumenStockConsulta = (filas: StockActualItem[]): InventarioSaldo | null => {
    if (!filas.length) return null;
    const unidades = filas.reduce((acc, item) => acc + Number(item.cantidadDisponible || 0), 0);
    const valor = filas.reduce(
      (acc, item) => acc + Number(item.valorTotal ?? Number(item.cantidadDisponible || 0) * Number(item.costoPromedioUnitario || 0)),
      0,
    );
    return {
      sku: stockFiltro.sku.trim() || filas[0]?.sku || '',
      bodega: bodegaVistaStock.trim() || 'TODAS',
      cantidadDisponible: unidades,
      costoPromedioUnitario: unidades > 0 ? valor / unidades : 0,
    };
  };

  const aplicarFiltroStock = async (filtro?: { sku?: string }): Promise<void> => {
    const sku = (filtro?.sku ?? stockFiltro.sku).trim();
    const bodega = bodegaVistaStock.trim();

    try {
      const [stockFiltrado, kardexData] = await Promise.all([
        inventarioService.stockActual({
          bodega: bodega || undefined,
          sku: sku || undefined,
        }),
        inventarioService.listarKardex({
          sku: sku || undefined,
          bodega: bodega || undefined,
          limit: 100,
        }),
      ]);
      setStockActual(stockFiltrado);
      setStockConsulta(sku ? buildResumenStockConsulta(stockFiltrado) : null);
      setKardex(kardexData);
    } catch (error) {
      console.error('Error consultando stock:', error);
      toast.error('No se pudo consultar el stock.');
    }
  };

  const consultarStock = async (): Promise<void> => {
    await aplicarFiltroStock({ sku: stockFiltro.sku.trim() });
  };

  const handleBodegaVistaStockChange = (bodega: string): void => {
    setBodegaVistaStock(bodega);
    void aplicarFiltroStock({ sku: stockFiltro.sku });
  };

  const actualizarMetodo = async (metodoValuacion: MetodoValuacion, anioFiscal?: number): Promise<void> => {
    try {
      setSaving(true);
      const data = await inventarioService.guardarMetodoValuacion(metodoValuacion, { anioFiscal });
      setConfig(data);
      toast.success('Método de valuación actualizado.');
    } catch (error) {
      console.error('Error actualizando método:', error);
      toast.error('No se pudo actualizar el método de valuación.');
    } finally {
      setSaving(false);
    }
  };

  const cerrarPeriodo = async (): Promise<void> => {
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      toast.error('Usa formato YYYY-MM para cerrar un periodo.');
      return;
    }

    try {
      setSaving(true);
      const periodosCerrados = await inventarioService.cerrarPeriodo(periodo);
      setConfig((prev) => prev ? { ...prev, periodosCerrados } : prev);
      setPeriodo('');
      toast.success('Periodo contable cerrado.');
    } catch (error) {
      console.error('Error cerrando periodo:', error);
      toast.error('No se pudo cerrar el periodo.');
    } finally {
      setSaving(false);
    }
  };

  const guardarMonedaInventario = async (payload: MonedaInventarioConfig): Promise<void> => {
    try {
      setSaving(true);
      const data = await inventarioService.actualizarMonedaInventario(payload);
      setConfig(data);
      toast.success('Moneda de inventario actualizada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la moneda de inventario.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const iniciarEdicionBodega = (doc: BodegaInventario): void => {
    setEditingBodegaId(doc._id);
    const principalId = doc.ciudadId || '';
    const extras = (doc.municipiosSubnodo ?? [])
      .map((m) => m.ciudadId)
      .filter((id) => String(id) !== String(principalId));
    setBodegaForm({
      nombre: doc.nombre,
      descripcion: doc.descripcion || '',
      depId: doc.departamentoId || '',
      ciudadId: principalId,
      municipiosExtra: extras,
      estado: doc.estado !== false,
    });
  };

  const cancelarEdicionBodega = (): void => {
    setEditingBodegaId(null);
    setBodegaForm(bodegaFormVacio());
  };

  const guardarBodegaForm = async (): Promise<void> => {
    if (!bodegaForm.nombre.trim()) {
      toast.error('El nombre de la bodega es obligatorio.');
      return;
    }
    if (!bodegaForm.depId || !bodegaForm.ciudadId) {
      toast.error('Selecciona departamento y ciudad de la bodega.');
      return;
    }

    const municipiosPayload = (() => {
      const ids = [...new Set([bodegaForm.ciudadId, ...bodegaForm.municipiosExtra])];
      return ids.map((id) => {
        const row = bodegaCiudades.find((c) => String(c.ciudadId) === String(id));
        return { ciudadId: String(id), nombre: row?.nombre_ciudad ?? String(id) };
      });
    })();

    try {
      setSaving(true);
      if (editingBodegaId) {
        const updated = await inventarioService.actualizarBodega(editingBodegaId, {
          nombre: bodegaForm.nombre.trim(),
          descripcion: bodegaForm.descripcion,
          departamentoId: bodegaForm.depId,
          ciudadId: bodegaForm.ciudadId,
          municipiosSubnodo: municipiosPayload,
          estado: bodegaForm.estado,
        });
        setBodegas((prev) =>
          [...prev.filter((b) => b._id !== editingBodegaId), updated].sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        cancelarEdicionBodega();
        toast.success('Bodega actualizada.');
      } else {
        const created = await inventarioService.crearBodega({
          nombre: bodegaForm.nombre,
          descripcion: bodegaForm.descripcion,
          departamentoId: bodegaForm.depId,
          ciudadId: bodegaForm.ciudadId,
          municipiosSubnodo: municipiosPayload,
        });
        setBodegas((prev) => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setBodegaForm(bodegaFormVacio());
        toast.success('Bodega creada.');
      }
    } catch (error) {
      console.error('Error guardando bodega:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo guardar la bodega.');
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminarBodega = async (): Promise<void> => {
    if (!bodegaDeleteTarget) return;
    try {
      setBodegaDeleteBusy(true);
      await inventarioService.eliminarBodega(bodegaDeleteTarget._id);
      setBodegas((prev) => prev.filter((b) => b._id !== bodegaDeleteTarget._id));
      if (editingBodegaId === bodegaDeleteTarget._id) cancelarEdicionBodega();
      setBodegaDeleteTarget(null);
      toast.success('Bodega eliminada.');
    } catch (error) {
      console.error('Error eliminando bodega:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar la bodega.');
    } finally {
      setBodegaDeleteBusy(false);
    }
  };

  const guardarProveedorCompra = async (draft: InventarioProveedorDraft): Promise<void> => {
    if (!draft.nombre.trim() || !draft.nit.trim()) {
      toast.error('Nombre y NIT son obligatorios.');
      return;
    }
    try {
      setSaving(true);
      const created = await inventarioService.crearProveedorCompra({
        nombre: draft.nombre.trim(),
        nit: draft.nit.trim(),
        correo: draft.correo.trim() || undefined,
        telefono: draft.telefono.trim() || undefined,
        direccion: draft.direccion.trim() || undefined,
        tipoProveedorId: draft.tipoProveedorId || undefined,
        paisId: draft.paisId || undefined,
        departamentoId: draft.departamentoId || undefined,
        ciudadId: draft.ciudadId || undefined,
      });
      setProveedoresCompra((prev) => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setProveedorModalOpen(false);
      toast.success('Proveedor registrado.');
    } catch (error) {
      console.error('Error creando proveedor:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo registrar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const registrarMovimiento = async (): Promise<void> => {
    const cantidad = Number(movimientoForm.cantidad);
    const costoUnitario = Number(movimientoForm.costoUnitario || 0);
    const tipoSeleccionado = tiposMovimientoActivos.find((tipo) => tipo._id === movimientoForm.tipoMovimientoConfigId);
    const esTraslado = esTipoTrasladoBodega(tipoSeleccionado?.codigo);
    const esSalidaConComprobante = tipoSeleccionado?.naturaleza === 'SALIDA' && !esTraslado;
    const esEntradaCompraPorTipo = tipoSeleccionado?.naturaleza === 'ENTRADA'
      && String(tipoSeleccionado?.codigo || '').trim().toUpperCase() === 'ENTRADA_COMPRA';
    const motivoRegistro = movimientoForm.motivo === 'OTRO'
      ? movimientoForm.motivoPersonalizado.trim().toUpperCase()
      : movimientoForm.motivo;
    if (!movimientoForm.sku.trim() || !movimientoForm.bodega.trim() || !cantidad || cantidad <= 0) {
      toast.error('SKU, bodega y cantidad mayor a 0 son obligatorios.');
      return;
    }
    if (!tipoSeleccionado) {
      toast.error('Selecciona un tipo de movimiento.');
      return;
    }
    if (tipoSeleccionado.naturaleza === 'ENTRADA' && costoUnitario < 0) {
      toast.error('El costo unitario no puede ser negativo.');
      return;
    }
    if (esTraslado) {
      if (!movimientoForm.bodega.trim() || !movimientoForm.bodegaDestino.trim()) {
        toast.error('Selecciona bodega origen y bodega destino.');
        return;
      }
      if (movimientoForm.bodega.trim() === movimientoForm.bodegaDestino.trim()) {
        toast.error('La bodega destino debe ser distinta a la origen.');
        return;
      }
    } else if (!movimientoForm.documentoTipo.trim() || !movimientoForm.documentoNumero.trim()) {
      toast.error('El documento soporte es obligatorio.');
      return;
    }
    if (esSalidaConComprobante && !movimientoForm.recepcionCompraId) {
      toast.error('Selecciona el comprobante de entrada asociado.');
      return;
    }
    if (esSalidaConComprobante && movimientoForm.recepcionCompraId && !movimientoForm.recepcionLineaKey) {
      toast.error('Selecciona el SKU / línea del comprobante.');
      return;
    }
    if (!esTraslado && movimientoForm.motivo === 'OTRO' && !movimientoForm.motivoPersonalizado.trim()) {
      toast.error('Escribe el motivo del movimiento.');
      return;
    }
    if (tipoSeleccionado.naturaleza === 'ENTRADA' && movimientoForm.motivo === 'COMPRA' && movimientoForm.ordenCompraId) {
      const orden = ordenesCompra.find((oc) => oc._id === movimientoForm.ordenCompraId);
      const itemIndex = Number(movimientoForm.ordenCompraItemIndex);
      const item = orden?.items?.[itemIndex];
      const pendiente = item ? Math.max(0, Number(item.cantidadOrdenada || 0) - Number(item.cantidadRecibida || 0)) : 0;
      if (!orden || !item || !Number.isInteger(itemIndex)) {
        toast.error('Selecciona la linea de la orden de compra.');
        return;
      }
      if (
        movimientoForm.sku.trim().toUpperCase() !== String(item.sku || '').trim().toUpperCase() ||
        movimientoForm.bodega.trim() !== String(item.bodega || '').trim()
      ) {
        toast.error('El SKU y la bodega deben corresponder a la linea seleccionada de la OC.');
        return;
      }
      if (pendiente <= 0) {
        toast.error(
          mensajeErrorComprasInventario(new Error('No hay cantidades pendientes por recibir en esta orden.')),
          { autoClose: 9000 },
        );
        return;
      }
      if (cantidad > pendiente) {
        toast.error(
          mensajeErrorComprasInventario(
            new Error(`Cantidad recibida para ${movimientoForm.sku.trim()} excede el pendiente (${pendiente}).`),
          ),
          { autoClose: 9000 },
        );
        return;
      }
    }

    try {
      setSaving(true);
      if (esEntradaCompraPorTipo && movimientoForm.recepcionCompraId) {
        // Subproceso manual: el comprobante (recepción) ya existe en borrador; aquí se confirma para aplicar kardex+contable.
        const data = await inventarioService.confirmarRecepcionOrdenCompra(movimientoForm.recepcionCompraId, { estado: true });
        setComprobanteEntradaData(data);
        setComprobanteEntradaDoc({
          tipo: movimientoForm.documentoTipo.trim(),
          numero: movimientoForm.documentoNumero.trim(),
        });
        setComprobanteEntradaOpen(true);
        setMovimientoForm((prev) => ({
          ...movimientoInicial,
          tipo: tipoSeleccionado.naturaleza,
          tipoMovimientoConfigId: prev.tipoMovimientoConfigId,
          bodega: prev.bodega,
        }));
        const [stock, kardexActualizado, comprobantesActualizados] = await Promise.all([
          inventarioService.stockActual(),
          inventarioService.listarKardex({ limit: 100 }),
          inventarioService.listarComprobantesEntradaMovimientos(200),
        ]);
        setStockActual(stock);
        setKardex(kardexActualizado);
        setComprobantesEntradaMov(comprobantesActualizados);
        toast.success('Comprobante confirmado. Kardex y contabilidad actualizados.');
        return;
      }

      if (tipoSeleccionado.naturaleza === 'ENTRADA' && movimientoForm.motivo === 'COMPRA' && movimientoForm.ordenCompraId) {
        const itemIndex = Number(movimientoForm.ordenCompraItemIndex);
        const data = await inventarioService.registrarRecepcionOrdenCompra(movimientoForm.ordenCompraId, {
          confirmar: true,
          aplicarKardex: true,
          numeroRecepcion: movimientoForm.documentoNumero.trim(),
          documentoSoporte: {
            tipo: movimientoForm.documentoTipo.trim(),
            numero: movimientoForm.documentoNumero.trim(),
          },
          items: [{
            ordenItemIndex: itemIndex,
            sku: movimientoForm.sku.trim(),
            cantidadRecibida: cantidad,
          }],
        });
        setComprobanteEntradaData(data);
        setComprobanteEntradaDoc({
          tipo: movimientoForm.documentoTipo.trim(),
          numero: movimientoForm.documentoNumero.trim(),
        });
        setComprobanteEntradaOpen(true);
        setOrdenesCompra((prev) => prev.map((oc) => (oc._id === data.orden._id ? data.orden : oc)));
        setMovimientoForm((prev) => ({
          ...movimientoInicial,
          tipo: tipoSeleccionado.naturaleza,
          tipoMovimientoConfigId: prev.tipoMovimientoConfigId,
          bodega: prev.bodega,
        }));
        const [stock, kardexActualizado] = await Promise.all([
          inventarioService.stockActual(),
          inventarioService.listarKardex({ limit: 100 }),
        ]);
        setStockActual(stock);
        setKardex(kardexActualizado);
        toast.success(
          FLUJO_COMPRAS_PASOS.comprobanteOk(
            data.orden?.numeroOrden || 'OC',
            String(data.orden?.estado || 'actualizada'),
            true,
          ),
          { autoClose: 9000 },
        );
        return;
      }
      if (esTraslado) {
        const traslado = await inventarioService.registrarTraslado({
          sku: movimientoForm.sku.trim(),
          bodegaOrigen: movimientoForm.bodega.trim(),
          bodegaDestino: movimientoForm.bodegaDestino.trim(),
          cantidad,
          tipoMovimientoConfigId: movimientoForm.tipoMovimientoConfigId,
          motivo: motivoRegistro || movimientoForm.motivo,
          documentoRelacionado: {
            tipo: movimientoForm.documentoTipo.trim() || 'TRASLADO_BODEGA',
            numero: movimientoForm.documentoNumero.trim() || `TR-${Date.now()}`,
          },
        });
        setKardex((prev) => [traslado.entrada, traslado.salida, ...prev].slice(0, 100));
        toast.success('Traslado registrado: salida en origen y entrada en destino (kardex + contable).');
      } else {
        const payload = {
          sku: movimientoForm.sku.trim(),
          tipoMovimientoConfigId: movimientoForm.tipoMovimientoConfigId,
          bodega: movimientoForm.bodega.trim(),
          cantidad,
          costoUnitario,
          motivo: motivoRegistro,
          documentoRelacionado: {
            tipo: movimientoForm.documentoTipo.trim(),
            numero: movimientoForm.documentoNumero.trim(),
            ...(movimientoForm.recepcionCompraId
              ? { idExterno: movimientoForm.recepcionCompraId }
              : {}),
          },
        };
        const movimiento = tipoSeleccionado.naturaleza === 'ENTRADA'
          ? await inventarioService.registrarEntrada(payload)
          : await inventarioService.registrarSalida(payload);

        setKardex((prev) => [movimiento, ...prev].slice(0, 100));
        toast.success('Movimiento registrado en kardex y comprobante contable.');
      }
      setMovimientoForm((prev) => ({
        ...movimientoInicial,
        tipo: tipoSeleccionado.naturaleza,
        tipoMovimientoConfigId: prev.tipoMovimientoConfigId,
        bodega: prev.bodega,
      }));
      const [stock, comprobantesActualizados] = await Promise.all([
        inventarioService.stockActual(),
        inventarioService.listarComprobantesEntradaMovimientos(200),
      ]);
      setStockActual(stock);
      setComprobantesEntradaMov(comprobantesActualizados);
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      toast.error('No se pudo registrar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const solicitarAjuste = async (): Promise<void> => {
    if (!ajusteForm.recepcionCompraId?.trim() || !ajusteForm.sku.trim() || !ajusteForm.bodega.trim()
      || !ajusteForm.tipoAjusteCodigo?.trim() || !ajusteForm.cantidad || ajusteForm.cantidad <= 0) {
      toast.error('Comprobante, SKU, bodega, tipo de ajuste y cantidad son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      const { data: created, msg } = await inventarioService.solicitarAjuste({
        ...ajusteForm,
        sku: ajusteForm.sku.trim(),
        bodega: ajusteForm.bodega.trim(),
        cantidad: Number(ajusteForm.cantidad),
        costoUnitarioReferencia: Number(ajusteForm.costoUnitarioReferencia || 0),
      });
      setAjustes((prev) => [created, ...prev]);
      setAjusteForm(ajusteInicial);
      toast.success(msg || 'Ajuste solicitado correctamente. Queda pendiente de aprobación.');
    } catch (error) {
      console.error('Error solicitando ajuste:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo solicitar el ajuste.');
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstadoAjuste = async (ajuste: AjusteInventario, accion: 'aprobar' | 'rechazar'): Promise<void> => {
    try {
      setSaving(true);
      const resultado = accion === 'aprobar'
        ? await inventarioService.aprobarAjuste(ajuste._id)
        : await inventarioService.rechazarAjuste(ajuste._id, 'Rechazado desde panel de inventario');
      setAjustes((prev) => prev.map((item) => item._id === ajuste._id ? resultado.data : item));
      const stock = await inventarioService.stockActual();
      setStockActual(stock);
      toast.success(
        resultado.msg
        || (accion === 'aprobar' ? 'Ajuste aprobado y movimiento registrado en kardex.' : 'Ajuste rechazado correctamente.'),
      );
    } catch (error) {
      console.error('Error cambiando ajuste:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo actualizar el ajuste.');
    } finally {
      setSaving(false);
    }
  };

  const crearSku = async (): Promise<void> => {
    const sku = skuForm.sku.trim().toUpperCase();
    const nombre = skuForm.nombre.trim();
    const precio = Number(skuForm.precio);
    const stockMinimo = Number(skuForm.stockMinimo || 0);

    if (!sku || !nombre) {
      toast.error('SKU y nombre son obligatorios.');
      return;
    }
    if (!precio || precio < 1) {
      toast.error('El precio debe ser mayor a 0.');
      return;
    }

    try {
      setSaving(true);
      const created = await productosService.crearProductoAdmin({
        sku,
        codigoBarras: skuForm.codigoBarras.trim() || undefined,
        nombre,
        precio,
        moneda: 'COP',
        tipo: 'FISICO',
        unidadMedida: skuForm.unidadMedida,
        stockMinimo: Number.isNaN(stockMinimo) ? 0 : stockMinimo,
        descripcion: skuForm.descripcion.trim(),
        descripcionCorta: nombre,
        estadoCatalogo: 'ACTIVO',
      });
      const createdId = getProductoId(created);
      setProductosSku((prev) => [...prev.filter((producto) => getProductoId(producto) !== createdId), created]);
      setMovimientoForm((prev) => ({ ...prev, sku: created.sku || sku }));
      setSkuForm(skuFormInicial);
      setSkuModalOpen(false);
      toast.success('SKU creado y seleccionado.');
    } catch (error) {
      console.error('Error creando SKU:', error);
      toast.error('No se pudo crear el SKU.');
    } finally {
      setSaving(false);
    }
  };

  const aplicarMotivosDesdeCausales = (causales: Awaited<ReturnType<typeof inventarioService.listarCausalesAjuste>>): void => {
    const motivosDesdeCausales = (causales || []).map((c) => ({
      codigo: c.codigo,
      nombre: c.nombre,
    }));
    setMotivosMovimiento(motivosDesdeCausales.length ? motivosDesdeCausales : MOTIVOS_FALLBACK);
    const codigosValidos = new Set(motivosDesdeCausales.map((m) => m.codigo));
    setMovimientoForm((prev) => {
      if (!prev.motivo || codigosValidos.has(prev.motivo)) return prev;
      return { ...prev, motivo: motivosDesdeCausales[0]?.codigo || 'OTRO' };
    });
  };

  const recargarMotivosMovimiento = async (): Promise<void> => {
    const causales = await inventarioService.listarCausalesAjuste();
    aplicarMotivosDesdeCausales(causales);
  };

  const abrirModalTiposMovimiento = (): void => {
    setTipoMovimientoDraft(tipoMovimientoDraftInicial);
    setTipoModalOpen(true);
  };

  const abrirModalCausalesMotivo = (): void => {
    setCausalMotivoModalOpen(true);
  };

  const abrirModalSkuCatalogo = (): void => {
    setSkuCatalogoOpen(true);
  };

  const seleccionarSkuCatalogo = (producto: BackendProducto): void => {
    const sku = String(producto.sku || '').trim().toUpperCase();
    if (!sku) return;
    setMovimientoForm((prev) => ({ ...prev, sku }));
    setSkuCatalogoOpen(false);
    toast.success(`SKU ${sku} seleccionado.`);
  };

  const desactivarSkuCatalogo = async (producto: BackendProducto): Promise<void> => {
    const productoId = getProductoId(producto);
    if (!productoId) {
      toast.error('No se encontro el ID del SKU.');
      return;
    }
    if (!puedeGestionarSku) {
      toast.error('Tu scope no permite desactivar SKU.');
      return;
    }
    if (!window.confirm(`Deseas desactivar el SKU ${producto.sku || producto.nombre}?`)) return;
    try {
      setSaving(true);
      await productosService.desactivarProductoAdmin(productoId);
      setProductosSku((prev) => prev.filter((item) => getProductoId(item) !== productoId));
      toast.success('SKU desactivado.');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo desactivar el SKU.');
    } finally {
      setSaving(false);
    }
  };

  const eliminarSkuCatalogo = async (producto: BackendProducto): Promise<void> => {
    const productoId = getProductoId(producto);
    if (!productoId) {
      toast.error('No se encontro el ID del SKU.');
      return;
    }
    if (!puedeGestionarSku) {
      toast.error('Tu scope no permite eliminar SKU.');
      return;
    }
    if (!window.confirm(`Esta accion elimina definitivamente el SKU ${producto.sku || producto.nombre}. Deseas continuar?`)) return;
    try {
      setSaving(true);
      await productosService.eliminarProductoAdmin(productoId);
      setProductosSku((prev) => prev.filter((item) => getProductoId(item) !== productoId));
      toast.success('SKU eliminado.');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el SKU.');
    } finally {
      setSaving(false);
    }
  };

  const generarCodigoSkuCatalogo = async (producto: BackendProducto): Promise<void> => {
    const productoId = getProductoId(producto);
    if (!productoId) {
      toast.error('No se encontro el ID del SKU.');
      return;
    }
    if (!puedeGestionarSku) {
      toast.error('Tu scope no permite generar codigo de barras.');
      return;
    }
    try {
      setSaving(true);
      const actualizado = await productosService.actualizarProductoAdmin(productoId, { codigoBarras: '' });
      setProductosSku((prev) => prev.map((item) => (getProductoId(item) === productoId ? { ...item, ...actualizado } : item)));
      toast.success('Codigo de barras generado.');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo generar el codigo de barras.');
    } finally {
      setSaving(false);
    }
  };

  const editarTipoMovimiento = (tipo: InventarioTipoMovimiento): void => {
    setTipoMovimientoDraft({
      _id: tipo._id,
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      naturaleza: tipo.naturaleza,
      estado: tipo.estado,
    });
  };

  const guardarTipoMovimiento = async (): Promise<void> => {
    if (!tipoMovimientoDraft.codigo.trim() || !tipoMovimientoDraft.nombre.trim()) {
      toast.error('Codigo y nombre son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      const saved = tipoMovimientoDraft._id
        ? await inventarioService.actualizarTipoMovimiento(tipoMovimientoDraft._id, tipoMovimientoDraft)
        : await inventarioService.crearTipoMovimiento(tipoMovimientoDraft);

      setTiposMovimiento((prev) => {
        const exists = prev.some((tipo) => tipo._id === saved._id);
        const next = exists ? prev.map((tipo) => (tipo._id === saved._id ? saved : tipo)) : [...prev, saved];
        return next.sort((a, b) => a.naturaleza.localeCompare(b.naturaleza) || a.nombre.localeCompare(b.nombre));
      });
      setMovimientoForm((prev) => ({
        ...prev,
        tipo: saved.naturaleza,
        tipoMovimientoConfigId: saved._id,
      }));
      setTipoMovimientoDraft(tipoMovimientoDraftInicial);
      toast.success(tipoMovimientoDraft._id ? 'Tipo actualizado.' : 'Tipo creado.');
    } catch (error) {
      console.error('Error guardando tipo de movimiento:', error);
      toast.error('No se pudo guardar el tipo de movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const abrirModalUnidadMedida = (): void => {
    setUnidadMedidaDraft(unidadMedidaDraftInicial);
    setUnidadModalOpen(true);
  };

  const editarUnidadMedida = (unidad: InventarioUnidadMedida): void => {
    const rel = unidad.unidadBaseRelacionada;
    const relId =
      rel && typeof rel === 'object' && '_id' in rel && rel._id
        ? String(rel._id)
        : '';
    setUnidadMedidaDraft({
      _id: unidad._id,
      codigo: unidad.codigo,
      nombre: unidad.nombre,
      tipoUnidad: unidad.tipoUnidad || 'UNIDAD',
      descripcion: unidad.descripcion || '',
      estado: unidad.estado,
      esUnidadBaseInventario: unidad.esUnidadBaseInventario !== false,
      unidadBaseRelacionadaId: relId,
      factorConversionHaciaBase:
        unidad.factorConversionHaciaBase != null && Number.isFinite(Number(unidad.factorConversionHaciaBase))
          ? String(unidad.factorConversionHaciaBase)
          : '',
    });
  };

  const guardarUnidadMedida = async (): Promise<void> => {
    if (!unidadMedidaDraft.codigo.trim() || !unidadMedidaDraft.nombre.trim()) {
      toast.error('Codigo y nombre son obligatorios.');
      return;
    }
    if (!unidadMedidaDraft.tipoUnidad) {
      toast.error('Seleccione el tipo de unidad.');
      return;
    }
    if (!unidadMedidaDraft.esUnidadBaseInventario) {
      if (!unidadMedidaDraft.unidadBaseRelacionadaId.trim()) {
        toast.error('Seleccione la unidad base relacionada.');
        return;
      }
      const factorNum = Number(String(unidadMedidaDraft.factorConversionHaciaBase).replace(',', '.'));
      if (!Number.isFinite(factorNum) || factorNum <= 0) {
        toast.error('Indique un factor de conversión válido mayor que 0.');
        return;
      }
    }

    const payload: Partial<Omit<InventarioUnidadMedida, '_id'>> & {
      unidadBaseRelacionadaId?: string;
    } = {
      codigo: unidadMedidaDraft.codigo.trim(),
      nombre: unidadMedidaDraft.nombre.trim(),
      descripcion: unidadMedidaDraft.descripcion.trim(),
      tipoUnidad: unidadMedidaDraft.tipoUnidad,
      estado: unidadMedidaDraft.estado,
      esUnidadBaseInventario: unidadMedidaDraft.esUnidadBaseInventario,
    };
    if (!unidadMedidaDraft.esUnidadBaseInventario) {
      payload.unidadBaseRelacionadaId = unidadMedidaDraft.unidadBaseRelacionadaId.trim();
      payload.factorConversionHaciaBase = Number(String(unidadMedidaDraft.factorConversionHaciaBase).replace(',', '.'));
    }

    try {
      setSaving(true);
      const saved = unidadMedidaDraft._id
        ? await inventarioService.actualizarUnidadMedida(unidadMedidaDraft._id, payload)
        : await inventarioService.crearUnidadMedida(payload as Omit<InventarioUnidadMedida, '_id'>);

      setUnidadesMedida((prev) => {
        const exists = prev.some((unidad) => unidad._id === saved._id);
        const next = exists ? prev.map((unidad) => (unidad._id === saved._id ? saved : unidad)) : [...prev, saved];
        return next.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      if (saved.estado) {
        setSkuForm((prev) => ({ ...prev, unidadMedida: saved.codigo }));
      }
      setUnidadMedidaDraft(unidadMedidaDraftInicial);
      toast.success(unidadMedidaDraft._id ? 'Unidad actualizada.' : 'Unidad creada.');
    } catch (error) {
      console.error('Error guardando unidad de medida:', error);
      toast.error('No se pudo guardar la unidad de medida.');
    } finally {
      setSaving(false);
    }
  };

  const crearTipoUnidadMedida = async (payload: {
    codigo?: string;
    nombre: string;
    descripcion?: string;
  }): Promise<InventarioTipoUnidadMedida> => {
    const saved = await inventarioService.crearTipoUnidadMedida(payload);
    setTiposUnidadMedida((prev) => {
      const exists = prev.some((tipo) => tipo._id === saved._id || tipo.codigo === saved.codigo);
      const next = exists ? prev.map((tipo) => (tipo._id === saved._id || tipo.codigo === saved.codigo ? saved : tipo)) : [...prev, saved];
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
    setUnidadMedidaDraft((prev) => ({ ...prev, tipoUnidad: saved.codigo }));
    return saved;
  };

  const inactivarUnidadMedida = async (unidad: InventarioUnidadMedida): Promise<void> => {
    if (!unidad.estado) return;
    try {
      setSaving(true);
      const updated = await inventarioService.actualizarUnidadMedida(unidad._id, { estado: false });
      setUnidadesMedida((prev) => {
        const next = prev
          .map((u) => (u._id === updated._id ? { ...u, ...updated } : u))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setSkuForm((p) => {
          if (p.unidadMedida !== unidad.codigo) return p;
          const first = next.find((x) => x.estado);
          return { ...p, unidadMedida: first?.codigo ?? 'UNIDAD' };
        });
        return next;
      });
      setUnidadMedidaDraft((d) => (d._id === unidad._id ? { ...d, estado: false } : d));
      toast.success('Unidad inactivada.');
    } catch (error) {
      console.error('Error inactivando unidad de medida:', error);
      const msg =
        error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo inactivar la unidad.';
      toast.error(msg);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminarUnidadMedida = async (): Promise<void> => {
    if (!unidadDeleteTarget) return;
    try {
      setUnidadDeleteBusy(true);
      await inventarioService.eliminarUnidadMedida(unidadDeleteTarget._id);
      setUnidadesMedida((prev) => {
        const next = prev.filter((u) => u._id !== unidadDeleteTarget._id);
        setSkuForm((p) => {
          if (p.unidadMedida !== unidadDeleteTarget.codigo) return p;
          const first = next.find((x) => x.estado);
          return { ...p, unidadMedida: first?.codigo ?? 'UNIDAD' };
        });
        return next;
      });
      setUnidadMedidaDraft((d) => (d._id === unidadDeleteTarget._id ? unidadMedidaDraftInicial : d));
      setUnidadDeleteTarget(null);
      toast.success('Unidad eliminada.');
    } catch (error) {
      console.error('Error eliminando unidad de medida:', error);
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar la unidad.');
    } finally {
      setUnidadDeleteBusy(false);
    }
  };

  const getTipoMovimientoLabel = (mov: InventarioMovimiento): string => {
    const config = mov.tipoMovimientoConfigId;
    if (typeof config === 'object' && config?.nombre) return config.nombre;
    return mov.tipoMovimiento;
  };

  const renderBodegaSelect = (value: string, onChange: (value: string) => void): React.ReactElement => (
    <Select
      value={value || BODEGA_TODAS}
      onValueChange={(next) => onChange(next === BODEGA_TODAS ? '' : next)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecciona bodega" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={BODEGA_TODAS}>Todas las bodegas</SelectItem>
        {bodegaOptions.map((nombre) => (
          <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderBodegaVistaStockSelect = (): React.ReactElement => (
    <Select
      value={bodegaVistaStock || BODEGA_TODAS}
      onValueChange={(next) => {
        const bodega = next === BODEGA_TODAS ? '' : next;
        handleBodegaVistaStockChange(bodega);
      }}
    >
      <SelectTrigger className="border-input bg-background">
        <SelectValue placeholder={bodegaOptions.length ? 'Selecciona bodega' : 'Sin bodegas activas'} />
      </SelectTrigger>
      <SelectContent className="max-h-72 border-border bg-popover">
        <SelectItem value={BODEGA_TODAS}>Todas las bodegas</SelectItem>
        {bodegaOptions.map((nombre) => (
          <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderSkuSelect = (value: string, onChange: (value: string) => void): React.ReactElement => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecciona SKU" />
      </SelectTrigger>
      <SelectContent>
        {skuOptions.map((producto) => (
          <SelectItem key={getProductoId(producto) || producto.sku} value={producto.sku || ''}>
            {producto.sku} | {producto.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderSkuStockSelect = (): React.ReactElement => (
    <div className="space-y-2">
      <Input
        value={stockSkuQuery}
        onChange={(e) => setStockSkuQuery(e.target.value)}
        placeholder="Buscar SKU o nombre..."
      />
      <Select
        value={stockFiltro.sku || '__SIN_SKU__'}
        onValueChange={(next) => {
          const sku = next === '__SIN_SKU__' ? '' : next;
          setStockFiltro((prev) => ({ ...prev, sku }));
        }}
      >
        <SelectTrigger className="border-input bg-background">
          <SelectValue placeholder={skuOptions.length ? 'Selecciona SKU' : 'Sin SKUs'} />
        </SelectTrigger>
        <SelectContent className="max-h-72 border-border bg-popover">
          <SelectItem value="__SIN_SKU__">Todos</SelectItem>
          {skuOptionsFiltradasStock.map((producto) => (
            <SelectItem key={getProductoId(producto) || producto.sku} value={producto.sku || ''}>
              {producto.sku} | {producto.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">ERP Inventario</p>
          <h1 className="text-2xl font-bold tracking-normal text-foreground md:text-3xl">Inventario y kardex</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Gestiona stock, movimientos inmutables, bodegas, cierres contables y ajustes con documento soporte.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <div className="min-w-[200px] space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Vista por bodega</p>
            {renderBodegaVistaStockSelect()}
          </div>
          <Button variant="outline" onClick={() => void loadData()} disabled={saving} className="shrink-0">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SKUs con saldo</CardDescription>
            <CardTitle className="text-2xl">{resumen.skus}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unidades disponibles</CardDescription>
            <CardTitle className="text-2xl">{resumen.unidades.toLocaleString('es-CO')}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor inventario</CardDescription>
            <CardTitle className="text-2xl">{MONEY.format(resumen.valorTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ajustes pendientes</CardDescription>
            <CardTitle className="text-2xl">{resumen.pendientes}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Alert variant="info">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Kardex inmutable</AlertTitle>
        <AlertDescription>
          Los movimientos no se editan ni se eliminan. Las correcciones deben registrarse con reversas o ajustes aprobados.
        </AlertDescription>
      </Alert>

      {!loadingInventarioTabs && inventarioMenuTabs.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sin pestañas parametrizadas</AlertTitle>
          <AlertDescription>
            Autoriza o parametriza formularios de inventario para construir este menú dinámicamente.
          </AlertDescription>
        </Alert>
      ) : null}

      {inventarioMenuTabs.length > 0 ? (
        <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as InventarioTabValue)}
        className="space-y-4"
      >
        <InventarioMenuTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={user}
          tabs={inventarioMenuTabs}
        />

        <TabsContent value="stock" className="space-y-4">
          <InventarioStockTab
            stockFiltro={stockFiltro}
            stockConsulta={stockConsulta}
            stockActual={stockActual}
            kardex={kardex}
            money={MONEY}
            renderSkuStockSelect={renderSkuStockSelect}
            consultarStock={consultarStock}
            formatDate={formatDate}
            getTipoMovimientoLabel={getTipoMovimientoLabel}
            etiquetaVista={bodegaVistaStock.trim() || 'Todas las bodegas'}
          />
        </TabsContent>

        <TabsContent value="movimientos">
          <InventarioMovimientosTab
            movimientoForm={movimientoForm}
            setMovimientoForm={setMovimientoForm}
            ordenesCompra={ordenesCompra}
            comprobantesEntrada={comprobantesEntradaMov}
            stockActual={stockActual}
            onOrdenCompraLineChange={seleccionarLineaOrdenCompraMovimiento}
            onComprobanteSalidaLineChange={seleccionarLineaComprobanteSalida}
            onComprobanteEntradaLineChange={seleccionarLineaComprobanteEntradaCompra}
            onVerComprobante={(recepcionId) => {
              setComprobanteVistaId(recepcionId);
              setComprobanteVistaOpen(true);
            }}
            onRecargarComprobantes={recargarComprobantesEntrada}
            tiposMovimientoActivos={tiposMovimientoActivos}
            motivos={motivosMovimiento}
            metodoValuacion={config?.metodoValuacion}
            saving={saving}
            renderSkuSelect={renderSkuSelect}
            renderBodegaSelect={renderBodegaSelect}
            abrirModalTiposMovimiento={abrirModalTiposMovimiento}
            abrirModalCausalesMotivo={abrirModalCausalesMotivo}
            abrirModalSkuCatalogo={abrirModalSkuCatalogo}
            abrirModalSku={() => setSkuModalOpen(true)}
            registrarMovimiento={registrarMovimiento}
          />
        </TabsContent>

        <TabsContent value="orden-compras" className="space-y-4">
          <InventarioOrdenComprasTab
            proveedorModalOpen={proveedorModalOpen}
            ordenCompraModalOpen={ordenCompraModalOpen}
            saving={saving}
            proveedoresCompra={proveedoresCompra}
            ordenesCompra={ordenesCompra}
            bodegas={bodegas}
            productosSku={productosSku}
            money={MONEY}
            ordenEdicion={ordenEditando}
            setProveedorModalOpen={setProveedorModalOpen}
            onOrdenCompraModalChange={handleOrdenCompraModalChange}
            abrirNuevaOrdenCompra={abrirNuevaOrdenCompra}
            abrirEditarOrdenCompra={abrirEditarOrdenCompra}
            guardarProveedorCompra={guardarProveedorCompra}
            refreshOrdenesCompra={refreshOrdenesCompra}
            sumSubtotalOrdenCompra={sumSubtotalOrdenCompra}
            esTenantSuperAdmin={esUsuarioTenantSuperAdmin}
            config={config}
            nombreCorporativo={nombreCorporativoImpresion}
          />
        </TabsContent>

        <TabsContent value="ajustes" className="space-y-4">
          <InventarioAjustesTab
            ajusteForm={ajusteForm}
            setAjusteForm={setAjusteForm}
            ajusteFiltro={ajusteFiltro}
            setAjusteFiltro={setAjusteFiltro}
            ajustes={ajustes}
            saving={saving}
            solicitarAjuste={solicitarAjuste}
            refreshAjustes={refreshAjustes}
            cambiarEstadoAjuste={cambiarEstadoAjuste}
            estadoBadge={estadoBadge}
          />
        </TabsContent>

        <TabsContent value="conciliacion" className="space-y-4">
          <InventarioConciliacionTab />
        </TabsContent>

        <TabsContent value="bodegas" className="space-y-4">
          <InventarioBodegasTab
            bodegaForm={bodegaForm}
            setBodegaForm={setBodegaForm}
            editingBodegaId={editingBodegaId}
            saving={saving}
            bodegas={bodegas}
            bodegaDepartamentos={bodegaDepartamentos}
            bodegaCiudades={bodegaCiudades}
            departamentoNombres={DEPARTAMENTO_NOMBRES}
            bodegaDeleteTarget={bodegaDeleteTarget}
            bodegaDeleteBusy={bodegaDeleteBusy}
            setBodegaDeleteTarget={setBodegaDeleteTarget}
            cancelarEdicionBodega={cancelarEdicionBodega}
            guardarBodegaForm={guardarBodegaForm}
            iniciarEdicionBodega={iniciarEdicionBodega}
            confirmarEliminarBodega={confirmarEliminarBodega}
          />
        </TabsContent>

        <TabsContent value="trm" className="space-y-4">
          <InventarioTrmConfiguracionTab
            config={config}
            saving={saving}
            onGuardarMonedaInventario={guardarMonedaInventario}
          />
        </TabsContent>
      </Tabs>
      ) : null}

      <InventarioCausalAjusteModal
        open={causalMotivoModalOpen}
        onOpenChange={setCausalMotivoModalOpen}
        saving={saving}
        title="Catálogo de motivos (causales)"
        description="Parametrice los motivos que aparecen en el select al registrar movimientos en kardex. Solo las causales activas se listan en el formulario."
        onCausalesActualizadas={() => {
          void recargarMotivosMovimiento().then(() => {
            toast.success('Catálogo de motivos actualizado.');
          });
        }}
      />

      <InventarioTipoMovimientoModal
        open={tipoModalOpen}
        saving={saving}
        tipos={tiposMovimiento}
        draft={tipoMovimientoDraft}
        onOpenChange={setTipoModalOpen}
        onDraftChange={setTipoMovimientoDraft}
        onSubmit={() => void guardarTipoMovimiento()}
        onEdit={editarTipoMovimiento}
        onReset={() => setTipoMovimientoDraft(tipoMovimientoDraftInicial)}
      />

      <InventarioSkuModal
        open={skuModalOpen}
        saving={saving}
        form={skuForm}
        unidadesMedida={unidadesMedida}
        onOpenChange={setSkuModalOpen}
        onFormChange={setSkuForm}
        onOpenUnidadMedida={abrirModalUnidadMedida}
        onSubmit={() => void crearSku()}
      />

      <InventarioSkuCatalogoModal
        open={skuCatalogoOpen}
        saving={saving}
        productos={skuOptions}
        puedeGestionarSku={puedeGestionarSku}
        onOpenChange={setSkuCatalogoOpen}
        onSelectSku={seleccionarSkuCatalogo}
        onDesactivarSku={desactivarSkuCatalogo}
        onEliminarSku={eliminarSkuCatalogo}
        onGenerarCodigoBarras={generarCodigoSkuCatalogo}
      />

      <InventarioUnidadMedidaModal
        open={unidadModalOpen}
        saving={saving}
        unidades={unidadesMedida}
        tiposUnidad={tiposUnidadMedida}
        draft={unidadMedidaDraft}
        onOpenChange={setUnidadModalOpen}
        onDraftChange={setUnidadMedidaDraft}
        onCreateTipoUnidad={crearTipoUnidadMedida}
        onSubmit={() => void guardarUnidadMedida()}
        onEdit={editarUnidadMedida}
        onReset={() => setUnidadMedidaDraft(unidadMedidaDraftInicial)}
        onInactivate={inactivarUnidadMedida}
        onDelete={setUnidadDeleteTarget}
      />

      <AlertDialog open={Boolean(unidadDeleteTarget)} onOpenChange={(open) => !open && setUnidadDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar unidad de medida</AlertDialogTitle>
            <AlertDialogDescription>
              {unidadDeleteTarget
                ? `Se eliminara la unidad ${unidadDeleteTarget.nombre} (${unidadDeleteTarget.codigo}). Esta accion no se puede deshacer.`
                : 'Esta accion no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unidadDeleteBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={unidadDeleteBusy}
              onClick={(event) => {
                event.preventDefault();
                void confirmarEliminarUnidadMedida();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unidadDeleteBusy ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InventarioComprobanteEntradaVistaModal
        open={comprobanteVistaOpen}
        recepcionId={comprobanteVistaId}
        onOpenChange={(open) => {
          setComprobanteVistaOpen(open);
          if (!open) setComprobanteVistaId(null);
        }}
      />

      <InventarioComprobanteEntradaModal
        open={comprobanteEntradaOpen}
        data={comprobanteEntradaData}
        documentoSoporte={comprobanteEntradaDoc}
        nombreCorporativo={nombreCorporativoImpresion}
        recepcionAutomatica={config?.compras?.recepcionAutomatica === true}
        onOpenChange={(open) => {
          setComprobanteEntradaOpen(open);
          if (!open) {
            setComprobanteEntradaData(null);
            setComprobanteEntradaDoc(null);
          }
        }}
      />

    </div>
  );
}
