import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
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
  type InventarioSaldo,
  type InventarioTipoMovimiento,
  type InventarioUnidadMedida,
  type MetodoValuacion,
  type MotivoMovimiento,
  type StockActualItem,
  type TipoAjuste,
} from '@/app/services/inventarioService';
import productosService, { type BackendProducto } from '@/app/services/productosService';
import { apiFetch } from '@/app/services/api';
import InventarioMenuTabs, { type InventarioTabValue } from './components/InventarioMenuTabs';
import InventarioOrdenCompraModal from './components/InventarioOrdenCompraModal';
import InventarioProveedorModal, { type InventarioProveedorDraft } from './components/InventarioProveedorModal';
import InventarioSkuModal, { type SkuForm } from './components/InventarioSkuModal';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const MOTIVOS: MotivoMovimiento[] = ['COMPRA', 'VENTA', 'MERMA', 'DANO', 'ERROR_CONTEO', 'PERDIDA', 'OTRO'];
const CAUSALES_AJUSTE = ['MERMA', 'DANO', 'ERROR_CONTEO', 'PERDIDA', 'OTRO'];

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
  sku: string;
  bodega: string;
  cantidad: string;
  costoUnitario: string;
  motivo: MotivoMovimiento;
  documentoTipo: string;
  documentoNumero: string;
};

const movimientoInicial: MovimientoForm = {
  tipo: 'ENTRADA',
  tipoMovimientoConfigId: '',
  sku: '',
  bodega: '',
  cantidad: '',
  costoUnitario: '',
  motivo: 'COMPRA',
  documentoTipo: 'DOCUMENTO_SOPORTE',
  documentoNumero: '',
};

const ajusteInicial: AjustePayload = {
  sku: '',
  bodega: '',
  tipoAjuste: 'POSITIVO',
  causal: 'OTRO',
  cantidad: 1,
  costoUnitarioReferencia: 0,
  observacion: '',
};

const skuFormInicial: SkuForm = {
  sku: '',
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
  descripcion: '',
  estado: true,
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

export default function Inventario(): React.ReactElement {
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
  const [stockFiltro, setStockFiltro] = useState({ sku: '', bodega: '' });
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
  const [activeTab, setActiveTab] = useState<InventarioTabValue>('stock');
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuForm, setSkuForm] = useState<SkuForm>(skuFormInicial);
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [tipoMovimientoDraft, setTipoMovimientoDraft] = useState<TipoMovimientoDraft>(tipoMovimientoDraftInicial);
  const [unidadModalOpen, setUnidadModalOpen] = useState(false);
  const [unidadMedidaDraft, setUnidadMedidaDraft] = useState<UnidadMedidaDraft>(unidadMedidaDraftInicial);
  const [proveedoresCompra, setProveedoresCompra] = useState<InventarioProveedor[]>([]);
  const [proveedorModalOpen, setProveedorModalOpen] = useState(false);
  const [ordenCompraModalOpen, setOrdenCompraModalOpen] = useState(false);
  const [ordenesCompra, setOrdenesCompra] = useState<InventarioOrdenCompra[]>([]);

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

  const tiposMovimientoActivos = useMemo(
    () => tiposMovimiento.filter((tipo) => tipo.estado),
    [tiposMovimiento]
  );

  const sumSubtotalOrdenCompra = (oc: InventarioOrdenCompra): number =>
    (oc.items || []).reduce((acc, it) => {
      const s = Number(it.subtotal);
      if (!Number.isNaN(s) && s > 0) return acc + s;
      const q = Number(it.cantidadOrdenada) || 0;
      const p = Number(it.costoUnitario) || 0;
      const d = Number(it.descuento) || 0;
      const im = Number(it.impuestos) || 0;
      return acc + Math.max(0, Math.round((q * p - d + im + Number.EPSILON) * 100) / 100);
    }, 0);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [configResp, bodegasResp, stockResp, ajustesResp, productosResp, tiposResp, unidadesResp, proveedoresResp, ordenesResp] = await Promise.all([
        inventarioService.obtenerConfig(),
        inventarioService.listarBodegas(),
        inventarioService.stockActual(),
        inventarioService.listarAjustes({ estado: ajusteFiltro }),
        productosService.listarProductosAdmin({ tipo: 'FISICO', estadoCatalogo: 'ACTIVO' }),
        inventarioService.listarTiposMovimientoAdmin(),
        inventarioService.listarUnidadesMedidaAdmin(),
        inventarioService.listarProveedoresCompra(),
        inventarioService.listarOrdenesCompra({ limit: 50 }),
      ]);
      setConfig(configResp);
      setBodegas(bodegasResp);
      setStockActual(stockResp);
      setAjustes(ajustesResp);
      setProductosSku(productosResp.filter((producto) => Boolean(producto.sku)));
      setTiposMovimiento(tiposResp);
      setUnidadesMedida(unidadesResp);
      setProveedoresCompra(proveedoresResp);
      setOrdenesCompra(ordenesResp);
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
    const data = await inventarioService.listarOrdenesCompra({ limit: 50 });
    setOrdenesCompra(data);
  };

  useEffect(() => {
    void loadData();
  }, []);

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

  const refreshKardex = async (): Promise<void> => {
    const data = await inventarioService.listarKardex({
      sku: stockFiltro.sku,
      bodega: stockFiltro.bodega,
      limit: 100,
    });
    setKardex(data);
  };

  const consultarStock = async (): Promise<void> => {
    if (!stockFiltro.sku.trim() || !stockFiltro.bodega.trim()) {
      toast.error('SKU y bodega son obligatorios para consultar stock.');
      return;
    }

    try {
      const [saldo] = await Promise.all([
        inventarioService.obtenerStock({
          sku: stockFiltro.sku.trim(),
          bodega: stockFiltro.bodega.trim(),
        }),
        refreshKardex(),
      ]);
      setStockConsulta(saldo);
    } catch (error) {
      console.error('Error consultando stock:', error);
      toast.error('No se pudo consultar el stock.');
    }
  };

  const actualizarMetodo = async (metodoValuacion: MetodoValuacion): Promise<void> => {
    try {
      setSaving(true);
      const data = await inventarioService.actualizarMetodoValuacion(metodoValuacion);
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
    if (!movimientoForm.documentoTipo.trim() || !movimientoForm.documentoNumero.trim()) {
      toast.error('El documento soporte es obligatorio.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        sku: movimientoForm.sku.trim(),
        tipoMovimientoConfigId: movimientoForm.tipoMovimientoConfigId,
        bodega: movimientoForm.bodega.trim(),
        cantidad,
        costoUnitario,
        motivo: movimientoForm.motivo,
        documentoRelacionado: {
          tipo: movimientoForm.documentoTipo.trim(),
          numero: movimientoForm.documentoNumero.trim(),
        },
      };
      const movimiento = tipoSeleccionado.naturaleza === 'ENTRADA'
        ? await inventarioService.registrarEntrada(payload)
        : await inventarioService.registrarSalida(payload);

      setKardex((prev) => [movimiento, ...prev].slice(0, 100));
      setMovimientoForm((prev) => ({
        ...movimientoInicial,
        tipo: tipoSeleccionado.naturaleza,
        tipoMovimientoConfigId: prev.tipoMovimientoConfigId,
        bodega: prev.bodega,
      }));
      const stock = await inventarioService.stockActual();
      setStockActual(stock);
      toast.success('Movimiento registrado en kardex.');
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      toast.error('No se pudo registrar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const solicitarAjuste = async (): Promise<void> => {
    if (!ajusteForm.sku.trim() || !ajusteForm.bodega.trim() || !ajusteForm.cantidad || ajusteForm.cantidad <= 0) {
      toast.error('SKU, bodega y cantidad son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      const created = await inventarioService.solicitarAjuste({
        ...ajusteForm,
        sku: ajusteForm.sku.trim(),
        bodega: ajusteForm.bodega.trim(),
        cantidad: Number(ajusteForm.cantidad),
        costoUnitarioReferencia: Number(ajusteForm.costoUnitarioReferencia || 0),
      });
      setAjustes((prev) => [created, ...prev]);
      setAjusteForm(ajusteInicial);
      toast.success('Ajuste solicitado.');
    } catch (error) {
      console.error('Error solicitando ajuste:', error);
      toast.error('No se pudo solicitar el ajuste.');
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstadoAjuste = async (ajuste: AjusteInventario, accion: 'aprobar' | 'rechazar'): Promise<void> => {
    try {
      setSaving(true);
      const updated = accion === 'aprobar'
        ? await inventarioService.aprobarAjuste(ajuste._id)
        : await inventarioService.rechazarAjuste(ajuste._id, 'Rechazado desde panel de inventario');
      setAjustes((prev) => prev.map((item) => item._id === ajuste._id ? updated : item));
      const stock = await inventarioService.stockActual();
      setStockActual(stock);
      toast.success(accion === 'aprobar' ? 'Ajuste aprobado.' : 'Ajuste rechazado.');
    } catch (error) {
      console.error('Error cambiando ajuste:', error);
      toast.error('No se pudo actualizar el ajuste.');
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
      setProductosSku((prev) => [...prev.filter((producto) => producto.iud !== created.iud), created]);
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

  const abrirModalTiposMovimiento = (): void => {
    setTipoMovimientoDraft(tipoMovimientoDraftInicial);
    setTipoModalOpen(true);
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
    setUnidadMedidaDraft({
      _id: unidad._id,
      codigo: unidad.codigo,
      nombre: unidad.nombre,
      descripcion: unidad.descripcion || '',
      estado: unidad.estado,
    });
  };

  const guardarUnidadMedida = async (): Promise<void> => {
    if (!unidadMedidaDraft.codigo.trim() || !unidadMedidaDraft.nombre.trim()) {
      toast.error('Codigo y nombre son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      const saved = unidadMedidaDraft._id
        ? await inventarioService.actualizarUnidadMedida(unidadMedidaDraft._id, unidadMedidaDraft)
        : await inventarioService.crearUnidadMedida(unidadMedidaDraft);

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

  const eliminarUnidadMedida = async (unidad: InventarioUnidadMedida): Promise<void> => {
    try {
      setSaving(true);
      await inventarioService.eliminarUnidadMedida(unidad._id);
      setUnidadesMedida((prev) => {
        const next = prev.filter((u) => u._id !== unidad._id);
        setSkuForm((p) => {
          if (p.unidadMedida !== unidad.codigo) return p;
          const first = next.find((u) => u.estado);
          return { ...p, unidadMedida: first?.codigo ?? 'UNIDAD' };
        });
        return next;
      });
      setUnidadMedidaDraft((d) => (d._id === unidad._id ? unidadMedidaDraftInicial : d));
      toast.success('Unidad eliminada.');
    } catch (error) {
      console.error('Error eliminando unidad de medida:', error);
      const msg =
        error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar la unidad.';
      toast.error(msg);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const getTipoMovimientoLabel = (mov: InventarioMovimiento): string => {
    const config = mov.tipoMovimientoConfigId;
    if (typeof config === 'object' && config?.nombre) return config.nombre;
    return mov.tipoMovimiento;
  };

  const renderBodegaSelect = (value: string, onChange: (value: string) => void): React.ReactElement => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecciona bodega" />
      </SelectTrigger>
      <SelectContent>
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
          <SelectItem key={producto.iud} value={producto.sku || ''}>
            {producto.sku} | {producto.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
        <Button variant="outline" onClick={() => void loadData()} disabled={saving}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
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

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as InventarioTabValue)}
        className="space-y-4"
      >
        <InventarioMenuTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <TabsContent value="stock" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Consultar stock</CardTitle>
                <CardDescription>Busca saldo y kardex por SKU y bodega.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={stockFiltro.sku} onChange={(event) => setStockFiltro((prev) => ({ ...prev, sku: event.target.value }))} placeholder="CAM-BAS-M" />
                </div>
                <div className="space-y-2">
                  <Label>Bodega</Label>
                  {renderBodegaSelect(stockFiltro.bodega, (value) => setStockFiltro((prev) => ({ ...prev, bodega: value })))}
                </div>
                <Button className="w-full" onClick={() => void consultarStock()}>
                  <Search className="mr-2 h-4 w-4" />
                  Consultar
                </Button>
                {stockConsulta && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Disponible</p>
                    <p className="text-3xl font-bold">{Number(stockConsulta.cantidadDisponible || 0).toLocaleString('es-CO')}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Costo promedio</p>
                    <p className="font-semibold">{MONEY.format(Number(stockConsulta.costoPromedioUnitario || 0))}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Stock actual</CardTitle>
                <CardDescription>Saldos disponibles registrados por bodega.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Costo prom.</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockActual.slice(0, 20).map((item) => (
                        <TableRow key={`${item.sku}-${item.bodega}`}>
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell>{item.bodega}</TableCell>
                          <TableCell className="text-right">{Number(item.cantidadDisponible || 0).toLocaleString('es-CO')}</TableCell>
                          <TableCell className="text-right">{MONEY.format(Number(item.costoPromedioUnitario || 0))}</TableCell>
                          <TableCell className="text-right">{MONEY.format(Number(item.valorTotal ?? Number(item.cantidadDisponible || 0) * Number(item.costoPromedioUnitario || 0)))}</TableCell>
                        </TableRow>
                      ))}
                      {stockActual.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay saldos disponibles.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Kardex consultado</CardTitle>
              <CardDescription>Últimos movimientos del filtro seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kardex.map((mov) => (
                      <TableRow key={mov._id}>
                        <TableCell>{formatDate(mov.createdAt)}</TableCell>
                        <TableCell><Badge variant={mov.tipoMovimiento === 'SALIDA' ? 'secondary' : 'default'}>{getTipoMovimientoLabel(mov)}</Badge></TableCell>
                        <TableCell>{mov.sku}</TableCell>
                        <TableCell>{mov.documentoRelacionado?.tipo} {mov.documentoRelacionado?.numero}</TableCell>
                        <TableCell className="text-right">{Number(mov.cantidad || 0).toLocaleString('es-CO')}</TableCell>
                        <TableCell className="text-right">{MONEY.format(Number(mov.costoTotal || 0))}</TableCell>
                        <TableCell className="max-w-[140px] truncate font-mono text-xs">{mov.hashIntegridad}</TableCell>
                      </TableRow>
                    ))}
                    {kardex.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Consulta un SKU para ver su kardex.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimientos">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Registrar movimiento</CardTitle>
                  <CardDescription>Entradas y salidas manuales con documento soporte obligatorio.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={abrirModalTiposMovimiento}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Parametrizar tipo
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSkuModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear SKU
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={movimientoForm.tipoMovimientoConfigId} onValueChange={(value) => {
                  const selected = tiposMovimientoActivos.find((tipo) => tipo._id === value);
                  setMovimientoForm((prev) => ({
                    ...prev,
                    tipoMovimientoConfigId: value,
                    tipo: selected?.naturaleza || prev.tipo,
                  }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tiposMovimientoActivos.map((tipo) => (
                      <SelectItem key={tipo._id} value={tipo._id}>
                        {tipo.nombre} ({tipo.naturaleza})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                {renderSkuSelect(movimientoForm.sku, (value) => setMovimientoForm((prev) => ({ ...prev, sku: value })))}
              </div>
              <div className="space-y-2">
                <Label>Bodega</Label>
                {renderBodegaSelect(movimientoForm.bodega, (value) => setMovimientoForm((prev) => ({ ...prev, bodega: value })))}
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min="0" value={movimientoForm.cantidad} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, cantidad: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Costo unitario</Label>
                <Input type="number" min="0" value={movimientoForm.costoUnitario} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, costoUnitario: event.target.value }))} disabled={movimientoForm.tipo === 'SALIDA'} />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={movimientoForm.motivo} onValueChange={(value) => setMovimientoForm((prev) => ({ ...prev, motivo: value as MotivoMovimiento }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOTIVOS.map((motivo) => <SelectItem key={motivo} value={motivo}>{motivo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo documento</Label>
                <Input value={movimientoForm.documentoTipo} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, documentoTipo: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Número documento</Label>
                <Input value={movimientoForm.documentoNumero} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, documentoNumero: event.target.value }))} />
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <Button onClick={() => void registrarMovimiento()} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Registrar en kardex
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orden-compras" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Orden/compras
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Órdenes de compra, recepciones y conciliación. Usa el catálogo de proveedores al preparar cada OC.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                <p className="mb-2 text-sm font-medium text-foreground">Órdenes de compra recientes</p>
                {ordenesCompra.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay órdenes registradas. Usa «Nueva orden de compra» para crear la primera.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número OC</TableHead>
                          <TableHead>Remisión</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead className="text-right">Ítems</TableHead>
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
                              <TableCell>{oc.numeroRemision || '—'}</TableCell>
                              <TableCell className="whitespace-nowrap">{formatDate(fechaStr)}</TableCell>
                              <TableCell>
                                <span className="text-sm text-foreground">{oc.proveedor?.nombre}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">NIT {oc.proveedor?.nit}</span>
                              </TableCell>
                              <TableCell className="text-right">{oc.items?.length ?? 0}</TableCell>
                              <TableCell className="text-right tabular-nums">{MONEY.format(sumSubtotalOrdenCompra(oc))}</TableCell>
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
                  <p className="text-sm text-muted-foreground">Aún no hay proveedores. Pulsa «Nuevo proveedor» para dar de alta el primero.</p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-auto rounded-md border border-border bg-muted/30 p-3">
                    {proveedoresCompra.map((proveedor) => (
                      <div
                        key={proveedor._id}
                        className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
                      >
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
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{proveedor.direccion}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajustes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Solicitar ajuste</CardTitle>
              <CardDescription>Los ajustes quedan pendientes hasta aprobación.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={ajusteForm.sku} onChange={(event) => setAjusteForm((prev) => ({ ...prev, sku: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bodega</Label>
                {renderBodegaSelect(ajusteForm.bodega, (value) => setAjusteForm((prev) => ({ ...prev, bodega: value })))}
              </div>
              <div className="space-y-2">
                <Label>Tipo ajuste</Label>
                <Select value={ajusteForm.tipoAjuste} onValueChange={(value) => setAjusteForm((prev) => ({ ...prev, tipoAjuste: value as TipoAjuste }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POSITIVO">Positivo</SelectItem>
                    <SelectItem value="NEGATIVO">Negativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Causal</Label>
                <Select value={ajusteForm.causal} onValueChange={(value) => setAjusteForm((prev) => ({ ...prev, causal: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAUSALES_AJUSTE.map((causal) => <SelectItem key={causal} value={causal}>{causal}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min="1" value={ajusteForm.cantidad} onChange={(event) => setAjusteForm((prev) => ({ ...prev, cantidad: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Costo referencia</Label>
                <Input type="number" min="0" value={ajusteForm.costoUnitarioReferencia} onChange={(event) => setAjusteForm((prev) => ({ ...prev, costoUnitarioReferencia: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observación</Label>
                <Textarea value={ajusteForm.observacion} onChange={(event) => setAjusteForm((prev) => ({ ...prev, observacion: event.target.value }))} />
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <Button onClick={() => void solicitarAjuste()} disabled={saving}>
                  <Plus className="mr-2 h-4 w-4" />
                  Solicitar ajuste
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Ajustes registrados</CardTitle>
                  <CardDescription>Aprueba o rechaza ajustes pendientes.</CardDescription>
                </div>
                <Select value={ajusteFiltro || 'TODOS'} onValueChange={(value) => {
                  const next = value === 'TODOS' ? '' : value as EstadoAjuste;
                  setAjusteFiltro(next);
                  void refreshAjustes(next);
                }}>
                  <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="SOLICITADO">Solicitados</SelectItem>
                    <SelectItem value="APROBADO">Aprobados</SelectItem>
                    <SelectItem value="RECHAZADO">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Causal</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajustes.map((ajuste) => (
                      <TableRow key={ajuste._id}>
                        <TableCell className="font-medium">{ajuste.sku}</TableCell>
                        <TableCell>{ajuste.bodega}</TableCell>
                        <TableCell>{ajuste.tipoAjuste}</TableCell>
                        <TableCell>{ajuste.causal}</TableCell>
                        <TableCell className="text-right">{Number(ajuste.cantidad || 0).toLocaleString('es-CO')}</TableCell>
                        <TableCell><Badge variant={estadoBadge(ajuste.estado)}>{ajuste.estado}</Badge></TableCell>
                        <TableCell className="text-right">
                          {ajuste.estado === 'SOLICITADO' ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => void cambiarEstadoAjuste(ajuste, 'rechazar')} disabled={saving}>Rechazar</Button>
                              <Button size="sm" onClick={() => void cambiarEstadoAjuste(ajuste, 'aprobar')} disabled={saving}>Aprobar</Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Procesado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {ajustes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay ajustes para mostrar.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bodegas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                {editingBodegaId ? 'Editar bodega' : 'Crear bodega'}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Ubicación por departamento y ciudad (Colombia). Puedes asociar varios municipios del mismo departamento como subnodos de cobertura.
                {editingBodegaId ? ' El código interno (nombre) no se puede cambiar si ya está en uso en movimientos de inventario; desactiva la bodega si debe dejar de usarse.' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nombre</Label>
                  <Input
                    value={bodegaForm.nombre}
                    onChange={(event) => setBodegaForm((prev) => ({ ...prev, nombre: event.target.value }))}
                    placeholder="BODEGA-PRINCIPAL"
                    className="border-input bg-background"
                    disabled={!!editingBodegaId}
                    title={editingBodegaId ? 'El nombre se mantiene para no romper referencias en inventario.' : undefined}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Descripción</Label>
                  <Input
                    value={bodegaForm.descripcion}
                    onChange={(event) => setBodegaForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                    className="border-input bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select
                    value={bodegaForm.depId || undefined}
                    onValueChange={(val) => setBodegaForm((prev) => ({ ...prev, depId: val, ciudadId: '', municipiosExtra: [] }))}
                  >
                    <SelectTrigger className="border-input bg-background">
                      <SelectValue placeholder="Selecciona departamento" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground max-h-72">
                      {bodegaDepartamentos.map((d) => (
                        <SelectItem key={d.departamentoId} value={String(d.departamentoId)}>
                          {DEPARTAMENTO_NOMBRES[String(d.departamentoId)] ?? d.nombre_Departamento ?? d.departamentoId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Select
                    value={bodegaForm.ciudadId || undefined}
                    onValueChange={(val) => setBodegaForm((prev) => ({
                      ...prev,
                      ciudadId: val,
                      municipiosExtra: prev.municipiosExtra.filter((id) =>
                        bodegaCiudades.some((c) => String(c.ciudadId) === String(id))
                      ),
                    }))}
                    disabled={!bodegaForm.depId}
                  >
                    <SelectTrigger className="border-input bg-background">
                      <SelectValue placeholder={bodegaForm.depId ? 'Selecciona ciudad' : 'Primero el departamento'} />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground max-h-72">
                      {bodegaCiudades.map((c) => (
                        <SelectItem key={c.ciudadId} value={String(c.ciudadId)}>
                          {c.nombre_ciudad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {bodegaForm.depId && bodegaForm.ciudadId && bodegaCiudades.length > 0 ? (
                <div className="space-y-2 rounded-md border border-border bg-card p-3">
                  <p className="text-sm font-medium text-foreground">Municipios de cobertura (subnodos)</p>
                  <p className="text-xs text-muted-foreground">
                    Los municipios listados son los del departamento seleccionado (mismo catálogo que la ciudad). La ciudad elegida arriba es la cabecera; marca los demás en los que también opera la bodega.
                  </p>
                  <div className="max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-1">
                    {bodegaCiudades.map((c) => {
                      const isPrincipal = String(c.ciudadId) === String(bodegaForm.ciudadId);
                      const checkedExtra = bodegaForm.municipiosExtra.some((id) => String(id) === String(c.ciudadId));
                      const checked = isPrincipal || checkedExtra;
                      return (
                        <label
                          key={String(c.ciudadId)}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isPrincipal}
                            onCheckedChange={(v) => {
                              if (isPrincipal) return;
                              setBodegaForm((prev) => {
                                if (v === true) {
                                  if (prev.municipiosExtra.some((id) => String(id) === String(c.ciudadId))) return prev;
                                  return { ...prev, municipiosExtra: [...prev.municipiosExtra, String(c.ciudadId)] };
                                }
                                return {
                                  ...prev,
                                  municipiosExtra: prev.municipiosExtra.filter((id) => String(id) !== String(c.ciudadId)),
                                };
                              });
                            }}
                          />
                          <span className={`text-sm ${isPrincipal ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                            {c.nombre_ciudad}
                            {isPrincipal ? ' · cabecera' : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {bodegaForm.depId && bodegaForm.ciudadId ? (
                <p className="text-xs text-muted-foreground">
                  Cabecera:{' '}
                  <span className="font-medium text-foreground">
                    {DEPARTAMENTO_NOMBRES[bodegaForm.depId] ??
                      bodegaDepartamentos.find((d) => String(d.departamentoId) === String(bodegaForm.depId))?.nombre_Departamento}
                    {' · '}
                    {bodegaCiudades.find((c) => String(c.ciudadId) === String(bodegaForm.ciudadId))?.nombre_ciudad}
                  </span>
                  {(() => {
                    const n = 1 + bodegaForm.municipiosExtra.length;
                    return n > 1 ? (
                      <span className="text-foreground"> — Cobertura: {n} municipios</span>
                    ) : null;
                  })()}
                </p>
              ) : null}
              {editingBodegaId ? (
                <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Switch
                    id="bodega-activa"
                    checked={bodegaForm.estado}
                    onCheckedChange={(v) => setBodegaForm((prev) => ({ ...prev, estado: v === true }))}
                  />
                  <Label htmlFor="bodega-activa" className="cursor-pointer text-sm font-normal leading-none">
                    Bodega activa (visible en listados y selectores)
                  </Label>
                </div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                {editingBodegaId ? (
                  <Button type="button" variant="outline" className="shrink-0" onClick={cancelarEdicionBodega} disabled={saving}>
                    Cancelar edición
                  </Button>
                ) : null}
                <Button type="button" className="shrink-0" onClick={() => void guardarBodegaForm()} disabled={saving}>
                  {editingBodegaId ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar cambios
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bodegas.map((bodega) => (
              <Card key={bodega._id} className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{bodega.nombre}</CardTitle>
                      <CardDescription>{bodega.descripcion || 'Sin descripción'}</CardDescription>
                      {(bodega.departamentoNombre || bodega.ciudadNombre) ? (
                        <p className="mt-2 text-sm text-foreground">
                          <span className="text-muted-foreground">Ubicación: </span>
                          {[bodega.departamentoNombre, bodega.ciudadNombre].filter(Boolean).join(' · ')}
                        </p>
                      ) : null}
                      {bodega.municipiosSubnodo && bodega.municipiosSubnodo.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="text-foreground/80">Cobertura municipal: </span>
                          {bodega.municipiosSubnodo.map((m) => m.nombre).join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={bodega.estado ? 'default' : 'outline'}>{bodega.estado ? 'Activa' : 'Inactiva'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Ubicaciones internas: {bodega.ubicaciones?.length ?? 0}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => iniciarEdicionBodega(bodega)} disabled={saving}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setBodegaDeleteTarget(bodega)}
                      disabled={saving}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <AlertDialog
            open={!!bodegaDeleteTarget}
            onOpenChange={(open) => {
              if (!open && !bodegaDeleteBusy) setBodegaDeleteTarget(null);
            }}
          >
            <AlertDialogContent className="border-border bg-background">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Eliminar bodega</AlertDialogTitle>
                <AlertDialogDescription>
                  {bodegaDeleteTarget ? (
                    <>
                      Se eliminará permanentemente <span className="font-semibold text-foreground">{bodegaDeleteTarget.nombre}</span>.
                      Solo es posible si no hay movimientos, existencias, ajustes ni órdenes de compra asociados a ese nombre.
                    </>
                  ) : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialogCancel disabled={bodegaDeleteBusy}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    void confirmarEliminarBodega();
                  }}
                  disabled={bodegaDeleteBusy}
                >
                  {bodegaDeleteBusy ? 'Eliminando…' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Configuración contable</CardTitle>
              <CardDescription>Método de valuación y periodos cerrados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Método de valuación</Label>
                  <Select value={config?.metodoValuacion || 'PROMEDIO'} onValueChange={(value) => void actualizarMetodo(value as MetodoValuacion)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROMEDIO">Promedio ponderado</SelectItem>
                      <SelectItem value="FIFO">PEPS / FIFO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Periodo a cerrar</Label>
                  <Input value={periodo} onChange={(event) => setPeriodo(event.target.value)} placeholder="2026-04" />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => void cerrarPeriodo()} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    Cerrar periodo
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Periodos cerrados</p>
                <div className="flex flex-wrap gap-2">
                  {(config?.periodosCerrados || []).length > 0 ? (
                    config?.periodosCerrados.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay periodos cerrados.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <InventarioUnidadMedidaModal
        open={unidadModalOpen}
        saving={saving}
        unidades={unidadesMedida}
        draft={unidadMedidaDraft}
        onOpenChange={setUnidadModalOpen}
        onDraftChange={setUnidadMedidaDraft}
        onSubmit={() => void guardarUnidadMedida()}
        onEdit={editarUnidadMedida}
        onReset={() => setUnidadMedidaDraft(unidadMedidaDraftInicial)}
        onDelete={eliminarUnidadMedida}
      />

    </div>
  );
}
