import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { swalFire as Swal } from '@/lib/sweetalert';
import productosService, {
  type AdminProductoPayload,
  type BackendCategoria,
  type BackendProducto,
  type BackendTipoProducto,
  type CategoriaPayload,
  type TipoProductoPayload,
  esCategoriaPadre,
  esSubcategoriaDe,
  getProductoVentaRelacionId,
} from '@/app/services/productosService';
import inventarioService, { type InventarioUnidadMedida, type MonedaCopOption, type StockActualItem } from '@/app/services/inventarioService';
import reglasContablesService, { type ReglaContable } from '@/app/services/reglasContablesService';
import reglasVentasService, {
  type ReglaVenta,
  etiquetaCampoValorReglaVentaProducto,
  normalizarValorReglaVentaProducto,
  placeholderValorPorComportamiento,
  reglaVentaPermiteValorEnProducto,
  resolverComportamientoDesdeReglaVenta,
  resumenValorReglaVenta,
} from '@/app/services/reglasVentasService';
import { useTiposReglaVenta } from '@/app/hooks/useTiposReglaVenta';
import { useProductoCatalogoConfig } from '@/app/hooks/useProductoCatalogoConfig';
import { BTN_GHOST_ACCENT } from '@/app/utils/buttonStyles';
import ReglasVentasModal from '@/app/presentation/pages/admin/components/ReglasVentasModal';
import ConfigCatalogoProductosModal, {
  ConfigCatalogoProductosTrigger,
} from '@/app/presentation/pages/admin/components/ConfigCatalogoProductosModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ModuleHelpButton from '@/app/presentation/components/common/ModuleHelpButton';
import { GovernedButton, PRODUCT_ACTION_IDS } from '@/app/presentation/actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import VentaWompiSecuenciaModal from '@/app/presentation/pages/admin/components/VentaWompiSecuenciaModal';
import AlcanceReglasProductosModal from '@/app/presentation/pages/admin/components/reglas-contables/AlcanceReglasProductosModal';
import ReglasContablesModal from '@/app/presentation/pages/admin/components/ReglasContablesModal';
import pipelineBComisionService from '@/app/services/pipelineBComisionService';
import { GobernanzaModuloSearchableSelect } from '@/app/presentation/pages/admin/gobernanza/GobernanzaModuloSearchableSelect';
import { CircleHelp, DollarSign, Eye, FolderTree, Hash, Pencil, Plus, RefreshCw, Search, Settings2, Star, Trash2, X } from 'lucide-react';

type DialogType = 'add' | 'edit' | 'view' | 'delete';

interface ProductRow {
  id: string;
  sku: string;
  nombre: string;
  categoriaId: string;
  categoria: string;
  subcategoriaId: string;
  subcategoria: string;
  tipo: string;
  moneda: string;
  monedaId: string;
  precio: number | string;
  unidadMedida: string;
  stockMinimo: number;
  cantidadColoresRender: number;
  coloresPermitidos: Array<{ nombre: string; valor: string }>;
  reglasContables: Array<{ codigo: string; aplica?: boolean; reglaContableId?: string | null }>;
  reglasVentas: Array<{ codigo: string; aplica?: boolean; reglaVentaId?: string | null; valor?: number }>;
  productoVentaRelacionId: string;
  productoOrigenId: string;
  manejaVentas: boolean;
  descripcion: string;
  descripcionCorta: string;
  imagen: string;
  media: NonNullable<BackendProducto['productoVentaRelacion']>['media'];
  publicado: boolean;
  destacado: boolean;
  estadoCatalogo: string;
}

const PLACEHOLDER = 'https://placehold.co/80x80/f3f4f6/a3a3a3?text=IMG';
const MAX_PRODUCT_IMAGES = 4;

type PendingProductMedia = {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
  duration?: number;
};

const mediaRowId = (item: { iud?: string; _id?: string; url?: string }): string =>
  String(item.iud || item._id || item.url || '');
const isDataImage = (value: string): boolean => /^data:image\//i.test(String(value || ''));
const isBlobUrl = (value: string): boolean => /^blob:/i.test(String(value || ''));
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const mediaSrc = (url: string): string => {
  const value = String(url || '').trim();
  if (!value || value === PLACEHOLDER || value.startsWith('http') || value.startsWith('blob:') || value.startsWith('data:')) return value;
  if (!value.startsWith('/api') || !API_BASE_URL.startsWith('http')) return value;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${value}`;
};

const backendId = (row: { _id?: string; iud?: string; id?: string } | null | undefined): string =>
  String(row?.iud || row?._id || row?.id || '');

const tiposPersistidosUnicos = (tipos: BackendTipoProducto[]): BackendTipoProducto[] => {
  const vistos = new Set<string>();
  return tipos
    .filter((tipo) => backendId(tipo) && !tipo.base)
    .filter((tipo) => {
      const key = String(tipo.nombre || '').trim().toUpperCase();
      if (!key || vistos.has(key)) return false;
      vistos.add(key);
      return true;
    });
};

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : fallback;

const categoriaId = (categoria: BackendProducto['categoria']): string =>
  typeof categoria === 'object' && categoria !== null ? backendId(categoria) : typeof categoria === 'string' ? categoria : '';

const categoriaLabel = (categoria: BackendProducto['categoria']): string =>
  typeof categoria === 'object' && categoria !== null ? String(categoria.nombre || '') : typeof categoria === 'string' ? categoria : 'Sin categoría';

const productoRelacionId = (relacion: BackendProducto['productoVentaRelacion']): string => {
  const origen = relacion?.productoOrigenId;
  return typeof origen === 'object' && origen !== null ? backendId(origen) : String(origen || '');
};

const productoOrigenRelacion = (producto: BackendProducto): BackendProducto | null => {
  const origen = producto.productoVentaRelacion?.productoOrigen;
  if (typeof origen === 'object' && origen !== null) return origen;
  const origenId = producto.productoVentaRelacion?.productoOrigenId;
  if (typeof origenId === 'object' && origenId !== null) return origenId;
  return null;
};

const imagenPrincipal = (producto: BackendProducto, fallback?: BackendProducto | null): string => {
  const mediaImagen = producto.productoVentaRelacion?.media?.find((item) => item.tipo === 'image')?.url;
  if (mediaImagen) return mediaSrc(mediaImagen);
  if (Array.isArray(producto.imagenes) && producto.imagenes[0]) return producto.imagenes[0];
  if (fallback && Array.isArray(fallback.imagenes) && fallback.imagenes[0]) return fallback.imagenes[0];
  return PLACEHOLDER;
};

const monedaCopId = (moneda: MonedaCopOption): string => String(moneda._id || moneda.iud || '').trim();

const resolverMonedaIdProducto = (producto: BackendProducto): string => {
  const raw = producto.productoVentaRelacion?.monedaId ?? null;
  if (!raw) return '';
  if (typeof raw === 'object') {
    const obj = raw as { _id?: string; iud?: string };
    return String(obj._id || obj.iud || '').trim();
  }
  return String(raw).trim();
};

const mapProduct = (producto: BackendProducto): ProductRow => {
  const origen = productoOrigenRelacion(producto);
  return {
    id: backendId(producto),
    sku: String(origen?.sku || producto.sku || ''),
    nombre: String(producto.nombre || origen?.nombre || ''),
    categoriaId: categoriaId(producto.categoria || origen?.categoria),
    categoria: categoriaLabel(producto.categoria || origen?.categoria),
    subcategoriaId: categoriaId(producto.subcategoria || origen?.subcategoria),
    subcategoria: categoriaLabel(producto.subcategoria || origen?.subcategoria),
    tipo: String(producto.tipo || origen?.tipo || 'PRODUCTO'),
    moneda: String(producto.moneda || origen?.moneda || 'COP'),
    monedaId: resolverMonedaIdProducto(producto),
    precio: Number(producto.productoVentaRelacion?.precio ?? producto.precio ?? origen?.precio ?? 0),
    unidadMedida: String(producto.unidadMedida || origen?.unidadMedida || 'UNIDAD'),
    stockMinimo: Number(producto.stockMinimo || origen?.stockMinimo || 0),
    cantidadColoresRender: Number(producto.productoVentaRelacion?.cantidadColoresRender || 0),
    coloresPermitidos: (producto.productoVentaRelacion?.coloresPermitidos || []).map((color, index) => ({
      nombre: String(color.nombre || `Color ${index + 1}`),
      valor: String(color.valor || '#000000'),
    })),
    reglasContables: (producto.productoVentaRelacion?.reglasContables || [])
      .filter((regla) => regla?.aplica !== false && regla?.codigo)
      .map((regla) => ({
        codigo: String(regla.codigo || '').toUpperCase(),
        aplica: regla.aplica !== false,
        reglaContableId: regla.reglaContableId || null,
      })),
    reglasVentas: (producto.productoVentaRelacion?.reglasVentas || [])
      .filter((regla) => regla?.aplica !== false && regla?.codigo)
      .map((regla) => ({
        codigo: String(regla.codigo || '').toUpperCase(),
        aplica: regla.aplica !== false,
        reglaVentaId: regla.reglaVentaId || null,
        valor: Number.isFinite(Number(regla.valor)) ? Number(regla.valor) : undefined,
      })),
    productoVentaRelacionId: getProductoVentaRelacionId(producto),
    productoOrigenId: productoRelacionId(producto.productoVentaRelacion),
    manejaVentas: producto.productoVentaRelacion?.manejaVentas !== false,
    descripcion: String(producto.descripcion || origen?.descripcion || ''),
    descripcionCorta: String(producto.descripcionCorta || origen?.descripcionCorta || ''),
    imagen: imagenPrincipal(producto, origen),
    media: producto.productoVentaRelacion?.media || [],
    publicado: producto.estadoProducto === true && String(producto.estadoCatalogo || '').toUpperCase() === 'ACTIVO',
    destacado: producto.productoVentaRelacion?.destacado === true,
    estadoCatalogo: String(producto.estadoCatalogo || 'INACTIVO'),
  };
};

const toPayload = (product: ProductRow): AdminProductoPayload => ({
  nombre: product.nombre,
  sku: product.productoOrigenId ? undefined : product.sku || undefined,
  descripcion: product.descripcion || '',
  descripcionCorta: product.descripcionCorta || '',
  precio: Number(product.precio),
  moneda: product.moneda || 'COP',
  monedaId: product.monedaId || null,
  tipo: product.tipo,
  unidadMedida: product.unidadMedida || 'UNIDAD',
  stockMinimo: Math.max(0, Number(product.stockMinimo) || 0),
  categoria: product.categoriaId || null,
  subcategoria: product.subcategoriaId || null,
  imagenes: product.imagen && product.imagen !== PLACEHOLDER && !isDataImage(product.imagen) && !isBlobUrl(product.imagen) ? [product.imagen] : [],
  estadoCatalogo: product.publicado ? 'ACTIVO' : 'INACTIVO',
  productoOrigenId: product.productoOrigenId || null,
  manejaVentas: product.manejaVentas,
  destacado: product.destacado,
  cantidadColoresRender: Math.max(0, Math.min(50, Number(product.cantidadColoresRender) || 0)),
  coloresPermitidos: product.coloresPermitidos.slice(0, Math.max(0, Math.min(50, Number(product.cantidadColoresRender) || 0))),
  reglasContables: product.reglasContables
    .filter((regla) => regla.aplica !== false && regla.codigo)
    .map((regla) => ({ codigo: regla.codigo, aplica: true, reglaContableId: regla.reglaContableId || null })),
  reglasVentas: product.reglasVentas
    .filter((regla) => regla.aplica !== false && regla.codigo)
    .map((regla) => {
      const valor = Number(regla.valor);
      return {
        codigo: regla.codigo,
        aplica: true,
        reglaVentaId: regla.reglaVentaId || null,
        valor: Number.isFinite(valor) ? valor : 0,
      };
    }),
});

const EMPTY_PRODUCT: ProductRow = {
  id: '',
  sku: '',
  nombre: '',
  categoriaId: '',
  categoria: '',
  subcategoriaId: '',
  subcategoria: '',
  tipo: '',
  moneda: 'COP',
  monedaId: '',
  precio: '',
  unidadMedida: 'UNIDAD',
  stockMinimo: 0,
  cantidadColoresRender: 0,
  coloresPermitidos: [],
  reglasContables: [],
  reglasVentas: [],
  productoVentaRelacionId: '',
  productoOrigenId: '',
  manejaVentas: true,
  descripcion: '',
  descripcionCorta: '',
  imagen: PLACEHOLDER,
  media: [],
  publicado: false,
  destacado: false,
  estadoCatalogo: 'INACTIVO',
};

const stockKardexPorSku = (stockActual: StockActualItem[]): Record<string, number> => stockActual.reduce((acc, item) => {
  const sku = String(item.sku || '').trim().toUpperCase();
  if (!sku) return acc;
  acc[sku] = (acc[sku] || 0) + Number(item.cantidadDisponible || 0);
  return acc;
}, {} as Record<string, number>);

export default function GestionProductos(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('view');
  const [openDialog, setOpenDialog] = useState(false);
  const [openProductHelpDialog, setOpenProductHelpDialog] = useState(false);
  const [openCategoriesListDialog, setOpenCategoriesListDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [openTypeDialog, setOpenTypeDialog] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [productos, setProductos] = useState<ProductRow[]>([]);
  const [productosCatalogo, setProductosCatalogo] = useState<ProductRow[]>([]);
  const [categorias, setCategorias] = useState<BackendCategoria[]>([]);
  const [tiposProducto, setTiposProducto] = useState<BackendTipoProducto[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<InventarioUnidadMedida[]>([]);
  const [reglasContables, setReglasContables] = useState<ReglaContable[]>([]);
  const [reglasVentas, setReglasVentas] = useState<ReglaVenta[]>([]);
  const [monedasCop, setMonedasCop] = useState<MonedaCopOption[]>([]);
  const [openReglasVentasModal, setOpenReglasVentasModal] = useState(false);
  const [openCatalogoConfigModal, setOpenCatalogoConfigModal] = useState(false);
  const [openVentaWompiSecuenciaModal, setOpenVentaWompiSecuenciaModal] = useState(false);
  const [openAlcanceReglasModal, setOpenAlcanceReglasModal] = useState(false);
  const [openReglasContablesModal, setOpenReglasContablesModal] = useState(false);
  const [reencolandoPipelineB, setReencolandoPipelineB] = useState(false);
  const [tiposReglaVentaRefreshKey, setTiposReglaVentaRefreshKey] = useState(0);
  const { config: limitesCatalogo, load: reloadLimitesCatalogo } = useProductoCatalogoConfig();
  const { tipos: tiposReglaVenta } = useTiposReglaVenta({
    enabled: openDialog || openReglasVentasModal,
    refreshKey: tiposReglaVentaRefreshKey,
  });
  const [stockKardex, setStockKardex] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductRow>(EMPTY_PRODUCT);
  const [pendingMedia, setPendingMedia] = useState<PendingProductMedia[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMediaFile, setCategoryMediaFile] = useState<File | null>(null);
  const [categoryMediaDuration, setCategoryMediaDuration] = useState<number | undefined>(undefined);
  const [typeSaving, setTypeSaving] = useState(false);
  const [tipoEditandoId, setTipoEditandoId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoriaPayload>({
    nombre: '',
    descripcion: '',
    padre: null,
  });
  const [categoryCreateMode, setCategoryCreateMode] = useState<'parent' | 'subcategory'>('parent');
  const [categoriaPadreSeleccionadaId, setCategoriaPadreSeleccionadaId] = useState('__new__');
  const [subcategoriasDraft, setSubcategoriasDraft] = useState<Array<{
    nombre: string;
    descripcion: string;
    mediaFile: File | null;
    mediaDuration?: number;
  }>>([]);
  const [categoriaEdit, setCategoriaEdit] = useState<BackendCategoria | null>(null);
  const [categoriaEditForm, setCategoriaEditForm] = useState({ nombre: '', descripcion: '', estado: true });
  const [categoriaEditSaving, setCategoriaEditSaving] = useState(false);
  const [categoriaEditMediaFile, setCategoriaEditMediaFile] = useState<File | null>(null);
  const [categoriaEditMediaDuration, setCategoriaEditMediaDuration] = useState<number | undefined>(undefined);
  const [categoriaEliminandoId, setCategoriaEliminandoId] = useState<string | null>(null);

  const abrirEditarCategoria = (categoria: BackendCategoria): void => {
    setCategoriaEdit(categoria);
    setCategoriaEditForm({
      nombre: categoria.nombre || '',
      descripcion: categoria.descripcion || '',
      estado: categoria.estado !== false,
    });
    setCategoriaEditMediaFile(null);
    setCategoriaEditMediaDuration(undefined);
  };

  const guardarCategoriaEdit = async (): Promise<void> => {
    if (!categoriaEdit) return;
    if (!categoriaEditForm.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio.');
      return;
    }
    try {
      setCategoriaEditSaving(true);
      const id = backendId(categoriaEdit);
      await productosService.actualizarCategoria(id, {
        nombre: categoriaEditForm.nombre.trim(),
        descripcion: categoriaEditForm.descripcion.trim(),
        estado: categoriaEditForm.estado,
      });
      // Subir nueva media reemplaza la anterior (el backend desactiva la activa en la misma transacción).
      if (categoriaEditMediaFile) {
        await productosService.subirMediaCategoria(id, categoriaEditMediaFile, categoriaEditMediaDuration);
      }
      toast.success(`Categoría "${categoriaEditForm.nombre.trim().toUpperCase()}" actualizada.`);
      setCategoriaEdit(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo actualizar la categoría.');
    } finally {
      setCategoriaEditSaving(false);
    }
  };

  const eliminarCategoria = async (categoria: BackendCategoria): Promise<void> => {
    const id = backendId(categoria);
    if (!window.confirm(`¿Eliminar la categoría "${categoria.nombre}"? Solo se permite si no tiene subcategorías, productos ni reglas contables asociadas.`)) return;
    try {
      setCategoriaEliminandoId(id);
      const { msg } = await productosService.eliminarCategoria(id);
      toast.success(msg || 'Categoría eliminada.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^\[\d+\]\s*/, '') : 'No se pudo eliminar la categoría.');
    } finally {
      setCategoriaEliminandoId(null);
    }
  };
  const [typeForm, setTypeForm] = useState<TipoProductoPayload>({
    nombre: '',
    codigo: '',
    descripcion: '',
  });

  const loadData = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const [productosResp, productosCatalogoResp, categoriasResp, tiposResp, unidadesResp, stockActualResp, reglasResp, reglasVentasResult, monedasResp] = await Promise.all([
        productosService.listarProductosVentasAdmin(),
        productosService.listarProductosAdmin(),
        productosService.listarCategorias(),
        productosService.listarTiposProducto(),
        inventarioService.listarUnidadesMedida(),
        inventarioService.stockActual(),
        reglasContablesService.listarActivas({ alcance: 'PRODUCTOS' }),
        reglasVentasService.listarActivas().then((data) => ({ ok: true as const, data })).catch((error) => ({ ok: false as const, error })),
        inventarioService.listarMonedasCop().catch(() => [] as MonedaCopOption[]),
      ]);
      setProductos(productosResp.map(mapProduct));
      setProductosCatalogo(productosCatalogoResp.map(mapProduct));
      setCategorias(categoriasResp);
      setTiposProducto(tiposPersistidosUnicos(tiposResp));
      setUnidadesMedida(unidadesResp);
      setReglasContables(reglasResp);
      setMonedasCop(monedasResp);
      if (reglasVentasResult.ok) {
        setReglasVentas(reglasVentasResult.data);
      } else {
        setReglasVentas([]);
        console.warn('No se pudieron cargar reglas de venta:', reglasVentasResult.error);
      }
      setStockKardex(stockKardexPorSku(stockActualResp));
      return true;
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error(errorMessage(error, 'No se pudieron cargar los productos.'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => () => {
    pendingMedia.forEach((item) => {
      if (isBlobUrl(item.previewUrl)) URL.revokeObjectURL(item.previewUrl);
    });
  }, [pendingMedia]);

  const clearMediaSelection = (): void => {
    pendingMedia.forEach((item) => {
      if (isBlobUrl(item.previewUrl)) URL.revokeObjectURL(item.previewUrl);
    });
    setPendingMedia([]);
    setRemovedMediaIds([]);
  };

  const activeExistingImages = (media: ProductRow['media'] = []): NonNullable<ProductRow['media']> =>
    (media || []).filter(
      (item) => item.tipo === 'image' && !removedMediaIds.includes(mediaRowId(item)),
    );

  const activeExistingVideos = (media: ProductRow['media'] = []): NonNullable<ProductRow['media']> =>
    (media || []).filter(
      (item) => item.tipo === 'video' && !removedMediaIds.includes(mediaRowId(item)),
    );

  const pendingImagesCount = pendingMedia.filter((item) => item.kind === 'image').length;
  const pendingVideosCount = pendingMedia.filter((item) => item.kind === 'video').length;

  const totalImagesCount = (media: ProductRow['media'] = []): number =>
    activeExistingImages(media).length + pendingImagesCount;

  const totalVideosCount = (media: ProductRow['media'] = []): number =>
    activeExistingVideos(media).length + pendingVideosCount;

  const remainingImageSlots = (media: ProductRow['media'] = []): number =>
    Math.max(0, MAX_PRODUCT_IMAGES - totalImagesCount(media));

  const markMediaForRemoval = (mediaId: string): void => {
    if (!mediaId) return;
    setRemovedMediaIds((prev) => (prev.includes(mediaId) ? prev : [...prev, mediaId]));
  };

  const removePendingMedia = (pendingId: string): void => {
    setPendingMedia((prev) => {
      const target = prev.find((item) => item.id === pendingId);
      if (target && isBlobUrl(target.previewUrl)) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== pendingId);
    });
  };

  const imagenUrlInputValue = (imagen: string): string => {
    if (pendingImagesCount > 0) return '';
    if (imagen === PLACEHOLDER || isBlobUrl(imagen)) return '';
    return imagen;
  };

  const filtered = useMemo(() => productos.filter((producto) => {
    const q = query.toLowerCase();
    return (
      producto.nombre.toLowerCase().includes(q)
      || producto.categoria.toLowerCase().includes(q)
      || producto.tipo.toLowerCase().includes(q)
      || producto.sku.toLowerCase().includes(q)
    );
  }), [productos, query]);

  const obtenerStockKardexSku = (sku: string): number => stockKardex[String(sku || '').trim().toUpperCase()] || 0;
  const reglaAplicaCategoria = (
    regla: ReglaContable | ReglaVenta,
    categoriaId: string,
  ): boolean => {
    const categorias = (regla.categoriasAplicacion || []).map((categoria) => String(categoria));
    return categorias.length === 0 || (!!categoriaId && categorias.includes(categoriaId));
  };

  const reglasMasivasProducto = (categoriaId = ''): ProductRow['reglasContables'] =>
    reglasContables
      .filter((regla) => regla.aplicaEnCarrito === true && regla.estado !== false && reglaAplicaCategoria(regla, categoriaId))
      .map((regla) => ({ codigo: String(regla.codigo || '').toUpperCase(), aplica: true }));

  /** Las reglas de venta se eligen y parametrizan por producto, no por asignacion masiva del catalogo. */

  const productosConSku = useMemo(
    () => productosCatalogo
      .filter((producto) => producto.sku.trim() && obtenerStockKardexSku(producto.sku) > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [productosCatalogo, stockKardex],
  );

  const precioMinimoCatalogo = useMemo(() => {
    if (!form.productoOrigenId) return 0;
    const origen = productosCatalogo.find((producto) => producto.id === form.productoOrigenId);
    return Number(origen?.precio ?? 0);
  }, [form.productoOrigenId, productosCatalogo]);

  const monedasCatalogoActivas = useMemo(
    () => monedasCop.filter((moneda) => moneda.estadoMoneda !== false),
    [monedasCop],
  );

  useEffect(() => {
    if (!openDialog || dialogType === 'view') return;
    if (form.monedaId) return;
    const cop = monedasCatalogoActivas.find((moneda) => moneda.monedas === 'COP');
    if (!cop) return;
    setForm((prev) => ({
      ...prev,
      monedaId: monedaCopId(cop),
      moneda: cop.monedas,
    }));
  }, [openDialog, dialogType, form.monedaId, monedasCatalogoActivas]);

  const detalleUnidadMedida = (codigo: string): string => {
    const unidad = unidadesMedida.find((item) => item.codigo === codigo || item.nombre === codigo);
    if (!unidad) return 'Sin detalle de unidad parametrizado';
    const tipo = String(unidad.tipoUnidad || '');
    const conversion = unidad.unidadBaseRelacionada
      ? ` | Base: ${unidad.unidadBaseRelacionada.codigo} x ${unidad.factorConversionHaciaBase || 1}`
      : '';
    return `${tipo || 'Sin tipo de unidad'}${conversion}`;
  };

  const syncColoresPermitidos = (
    cantidad: number,
    coloresActuales: ProductRow['coloresPermitidos'] = form.coloresPermitidos,
  ): ProductRow['coloresPermitidos'] => {
    const total = Math.max(0, Math.min(50, Number(cantidad) || 0));
    return Array.from({ length: total }, (_, index) => coloresActuales[index] || {
      nombre: `Color ${index + 1}`,
      valor: '#000000',
    });
  };

  const filteredCategorias = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    return categorias
      .filter((categoria) => {
        if (Number(categoria.nivel || 1) !== 1) return false;
        if (!q) return true;
        const hijas = categorias.filter((item) => {
          const padre = typeof item.padre === 'object' && item.padre !== null
            ? backendId(item.padre)
            : String(item.padre || '');
          return padre === backendId(categoria);
        });
        return (
          String(categoria.nombre || '').toLowerCase().includes(q)
          || String(categoria.descripcion || '').toLowerCase().includes(q)
          || hijas.some((item) => String(item.nombre || '').toLowerCase().includes(q))
        );
      })
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
  }, [categorias, categoryQuery]);

  const closeDialog = (): void => {
    setOpenDialog(false);
    setSelected(null);
    setForm(EMPTY_PRODUCT);
    clearMediaSelection();
    setDialogType('view');
  };

  const closeCategoryDialog = (): void => {
    setOpenCategoryDialog(false);
    setCategoryCreateMode('parent');
    setCategoriaPadreSeleccionadaId('__new__');
    setCategoryForm({
      nombre: '',
      descripcion: '',
      padre: null,
    });
    setCategoryMediaFile(null);
    setCategoryMediaDuration(undefined);
    setSubcategoriasDraft([]);
  };

  const abrirCrearCategoriaPadre = (): void => {
    setCategoryCreateMode('parent');
    setCategoriaPadreSeleccionadaId('__new__');
    setCategoryForm({ nombre: '', descripcion: '', padre: null });
    setSubcategoriasDraft([]);
    setOpenCategoryDialog(true);
  };

  const abrirCrearSubcategoria = (categoriaPadre: BackendCategoria): void => {
    setCategoryCreateMode('subcategory');
    setCategoriaPadreSeleccionadaId(backendId(categoriaPadre));
    setCategoryForm({
      nombre: '',
      descripcion: '',
      padre: backendId(categoriaPadre),
    });
    setOpenCategoryDialog(true);
  };

  /** Valida imagen/video (máx. 10 s) para media de categoría; retorna null si no pasa. */
  const validarMediaCategoria = async (file?: File): Promise<{ file: File; duracion?: number } | null> => {
    if (!file) return null;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Selecciona una imagen o un video.');
      return null;
    }
    if (isVideo) {
      try {
        const duration = await readVideoDuration(file);
        if (duration > 10) {
          toast.error('El video de la categoría debe durar máximo 10 segundos.');
          return null;
        }
        return { file, duracion: duration };
      } catch (error) {
        toast.error(errorMessage(error, 'No se pudo validar la duración del video.'));
        return null;
      }
    }
    return { file };
  };

  const onCategoryMediaFileChange = async (file?: File): Promise<void> => {
    const valido = await validarMediaCategoria(file);
    if (!valido) return;
    setCategoryMediaDuration(valido.duracion);
    setCategoryMediaFile(valido.file);
  };

  const onCategoriaEditMediaFileChange = async (file?: File): Promise<void> => {
    const valido = await validarMediaCategoria(file);
    if (!valido) return;
    setCategoriaEditMediaDuration(valido.duracion);
    setCategoriaEditMediaFile(valido.file);
  };

  const closeTypeDialog = (): void => {
    setOpenTypeDialog(false);
    setTypeForm({
      nombre: '',
      codigo: '',
      descripcion: '',
    });
    setTipoEditandoId(null);
  };

  const onSelectProductSku = (value: string): void => {
    const producto = productosCatalogo.find((item) => item.sku === value);
    if (!producto) {
      setForm((prev) => ({ ...prev, sku: value }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      sku: producto.sku,
      productoOrigenId: producto.id,
      manejaVentas: true,
      nombre: producto.nombre,
      categoriaId: producto.categoriaId,
      categoria: producto.categoria,
      subcategoriaId: producto.subcategoriaId,
      subcategoria: producto.subcategoria,
      tipo: producto.tipo,
      moneda: producto.moneda,
      monedaId: producto.monedaId,
      precio: producto.precio,
      unidadMedida: producto.unidadMedida,
      stockMinimo: producto.stockMinimo,
      cantidadColoresRender: producto.cantidadColoresRender,
      coloresPermitidos: syncColoresPermitidos(producto.cantidadColoresRender, producto.coloresPermitidos),
      reglasContables: producto.reglasContables.length ? producto.reglasContables : reglasMasivasProducto(producto.categoriaId),
      reglasVentas: producto.reglasVentas,
      descripcion: producto.descripcion,
      descripcionCorta: producto.descripcionCorta,
      imagen: producto.imagen,
      publicado: producto.publicado,
      destacado: producto.destacado,
      estadoCatalogo: producto.estadoCatalogo,
    }));
  };

  const readVideoDuration = (file: File): Promise<number> => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration || 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la duracion del video.'));
    };
    video.src = url;
  });

  const onProductMediaFilesChange = async (files?: FileList | File[]): Promise<void> => {
    const list = Array.from(files || []);
    if (!list.length) return;

    const slots = remainingImageSlots(form.media);
    let videoSlots = totalVideosCount(form.media) >= 1 ? 0 : 1;
    const accepted: PendingProductMedia[] = [];

    for (const file of list) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        toast.error(`"${file.name}" no es imagen ni video válido.`);
        continue;
      }

      if (isImage) {
        if (slots - accepted.filter((item) => item.kind === 'image').length <= 0) {
          toast.error(`Máximo ${MAX_PRODUCT_IMAGES} imágenes por producto.`);
          break;
        }
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          kind: 'image',
        });
        continue;
      }

      if (videoSlots <= 0 || accepted.some((item) => item.kind === 'video')) {
        toast.error('Solo se permite un video corto por producto.');
        continue;
      }

      try {
        const duration = await readVideoDuration(file);
        if (duration > 30) {
          toast.error('El video debe durar máximo 30 segundos.');
          continue;
        }
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          kind: 'video',
          duration,
        });
        videoSlots -= 1;
      } catch (error) {
        toast.error(errorMessage(error, 'No se pudo validar la duración del video.'));
      }
    }

    if (!accepted.length) return;
    setPendingMedia((prev) => [...prev, ...accepted]);
    toast.success(
      accepted.length === 1
        ? 'Archivo listo para subir al guardar.'
        : `${accepted.length} archivos listos para subir al guardar.`,
    );
  };

  const syncProductMediaAfterSave = async (relacionId: string, media: ProductRow['media'] = []): Promise<void> => {
    for (const mediaId of removedMediaIds) {
      await productosService.eliminarMediaProductoVenta(mediaId);
    }

    const existingImages = activeExistingImages(media);
    let markPrincipal = existingImages.length === 0;

    for (const item of pendingMedia) {
      if (item.kind === 'video') {
        await productosService.subirMediaProductoVenta(relacionId, item.file, {
          duracionSegundos: item.duration,
          principal: false,
        });
        continue;
      }
      await productosService.subirMediaProductoVenta(relacionId, item.file, {
        principal: markPrincipal,
      });
      markPrincipal = false;
    }
  };

  const onCantidadColoresChange = (cantidad: number): void => {
    setForm((prev) => ({
      ...prev,
      cantidadColoresRender: cantidad,
      coloresPermitidos: syncColoresPermitidos(cantidad, prev.coloresPermitidos),
    }));
  };

  const onColorPermitidoChange = (
    index: number,
    field: 'nombre' | 'valor',
    value: string,
  ): void => {
    setForm((prev) => ({
      ...prev,
      coloresPermitidos: prev.coloresPermitidos.map((color, colorIndex) => (
        colorIndex === index ? { ...color, [field]: value } : color
      )),
    }));
  };

  const openAdd = (): void => {
    setForm({
      ...EMPTY_PRODUCT,
      reglasContables: reglasMasivasProducto(),
      reglasVentas: [],
    });
    clearMediaSelection();
    setDialogType('add');
    setOpenDialog(true);
  };

  const onReglaContableChange = (codigo: string, checked: boolean): void => {
    setForm((prev) => {
      const codigoNorm = codigo.trim().toUpperCase();
      const sinRegla = prev.reglasContables.filter((regla) => regla.codigo !== codigoNorm);
      return {
        ...prev,
        reglasContables: checked ? [...sinRegla, { codigo: codigoNorm, aplica: true }] : sinRegla,
      };
    });
  };

  const onReglaVentaChange = (codigo: string, checked: boolean): void => {
    setForm((prev) => {
      const codigoNorm = codigo.trim().toUpperCase();
      const sinRegla = prev.reglasVentas.filter((regla) => regla.codigo !== codigoNorm);
      if (!checked) {
        return { ...prev, reglasVentas: sinRegla };
      }
      const catalogo = reglasVentas.find((regla) => String(regla.codigo || '').toUpperCase() === codigoNorm);
      const existente = prev.reglasVentas.find((regla) => regla.codigo === codigoNorm);
      return {
        ...prev,
        reglasVentas: [
          ...sinRegla,
          {
            codigo: codigoNorm,
            aplica: true,
            reglaVentaId: catalogo?.iud || catalogo?._id || null,
            valor: Number.isFinite(Number(existente?.valor)) ? Number(existente?.valor) : undefined,
          },
        ],
      };
    });
  };

  const onReglaVentaValorChange = (codigo: string, raw: string): void => {
    const codigoNorm = codigo.trim().toUpperCase();
    const parsed = Number(raw);
    if (raw.trim() !== '' && !Number.isFinite(parsed)) return;
    setForm((prev) => ({
      ...prev,
      reglasVentas: prev.reglasVentas.map((regla) => (
        regla.codigo === codigoNorm
          ? { ...regla, valor: raw.trim() === '' ? undefined : parsed }
          : regla
      )),
    }));
  };

  const buildProductoPayload = (): AdminProductoPayload => {
    const reglasVentasNormalizadas = form.reglasVentas
      .filter((regla) => regla.aplica !== false && regla.codigo)
      .map((asignada) => {
        const catalogo = reglasVentas.find(
          (regla) => String(regla.codigo || '').toUpperCase() === asignada.codigo,
        );
        const comportamiento = catalogo
          ? resolverComportamientoDesdeReglaVenta(catalogo, tiposReglaVenta)
          : null;
        const valor = Number(asignada.valor);
        if (!Number.isFinite(valor)) {
          throw new Error(`Falta valor para la regla ${asignada.codigo}`);
        }
        let valorNorm = valor;
        if (reglaVentaPermiteValorEnProducto(comportamiento)) {
          const validado = normalizarValorReglaVentaProducto(comportamiento, valorNorm);
          if (validado !== null) valorNorm = validado;
        }
        return {
          codigo: asignada.codigo,
          aplica: true,
          reglaVentaId: asignada.reglaVentaId || catalogo?.iud || catalogo?._id || null,
          valor: valorNorm,
        };
      });
    return toPayload({ ...form, reglasVentas: reglasVentasNormalizadas });
  };

  const validarReglasVentasProducto = (): string | null => {
    for (const asignada of form.reglasVentas.filter((regla) => regla.aplica !== false && regla.codigo)) {
      const catalogo = reglasVentas.find((regla) => String(regla.codigo || '').toUpperCase() === asignada.codigo);
      if (!catalogo) continue;
      const comportamiento = resolverComportamientoDesdeReglaVenta(catalogo, tiposReglaVenta);
      if (!reglaVentaPermiteValorEnProducto(comportamiento)) continue;
      const valorBase = Number(asignada.valor);
      if (!Number.isFinite(valorBase)) {
        return `Parametrice el valor de la regla "${catalogo.nombre || asignada.codigo}" en este producto.`;
      }
      const valorNorm = normalizarValorReglaVentaProducto(comportamiento, valorBase);
      if (valorNorm === null) {
        return `Indique un valor valido para la regla "${catalogo.nombre || asignada.codigo}".`;
      }
    }
    return null;
  };

  const openEdit = (producto: ProductRow): void => {
    setForm({
      ...producto,
      imagen: isBlobUrl(producto.imagen) ? PLACEHOLDER : producto.imagen,
    });
    clearMediaSelection();
    setDialogType('edit');
    setOpenDialog(true);
  };

  const openView = async (producto: ProductRow): Promise<void> => {
    try {
      const detalle = await productosService.obtenerProductoAdmin(producto.id);
      setSelected(mapProduct(detalle));
      setDialogType('view');
      setOpenDialog(true);
    } catch (error) {
      console.error('Error cargando detalle del producto:', error);
      toast.error(errorMessage(error, 'No se pudo cargar el detalle del producto.'));
    }
  };

  const openDelete = (producto: ProductRow): void => {
    setSelected(producto);
    setDialogType('delete');
    setOpenDialog(true);
  };

  const onTogglePublished = async (producto: ProductRow): Promise<void> => {
    try {
      const updated = await productosService.actualizarProductoAdmin(producto.id, {
        estadoCatalogo: producto.publicado ? 'INACTIVO' : 'ACTIVO',
      });
      setProductos((prev) => prev.map((item) => item.id === producto.id ? mapProduct(updated) : item));
      toast.success(`Producto ${producto.publicado ? 'despublicado' : 'publicado'} exitosamente`);
    } catch (error) {
      console.error('Error actualizando publicación:', error);
      toast.error(errorMessage(error, 'No se pudo actualizar el estado del producto.'));
    }
  };

  const onToggleDestacado = async (producto: ProductRow): Promise<void> => {
    try {
      const updated = await productosService.actualizarProductoAdmin(producto.id, {
        destacado: !producto.destacado,
      });
      setProductos((prev) => prev.map((item) => item.id === producto.id ? mapProduct(updated) : item));
      toast.success(`Producto ${producto.destacado ? 'retirado de destacados' : 'marcado como destacado'}`);
    } catch (error) {
      console.error('Error actualizando destacado:', error);
      toast.error(errorMessage(error, 'No se pudo actualizar el destacado del producto.'));
    }
  };

  const onSave = async (): Promise<void> => {
    if (!form.productoOrigenId) {
      toast.error('Selecciona un producto con stock disponible en Kardex.');
      return;
    }
    if (obtenerStockKardexSku(form.sku) <= 0) {
      toast.error('El producto seleccionado no tiene stock disponible en inventario.');
      return;
    }
    const precioFormulario = Number(form.precio);
    if (!form.nombre.trim() || String(form.precio).trim() === '' || !Number.isFinite(precioFormulario) || precioFormulario <= 0) {
      toast.error('Nombre y precio son obligatorios.');
      return;
    }
    if (form.nombre.length > limitesCatalogo.nombreMax) {
      toast.error(`El nombre supera ${limitesCatalogo.nombreMax} caracteres.`);
      return;
    }
    if ((form.descripcion || '').length > limitesCatalogo.descripcionMax) {
      toast.error(`La descripcion supera ${limitesCatalogo.descripcionMax} caracteres.`);
      return;
    }
    if (precioMinimoCatalogo > 0 && precioFormulario < precioMinimoCatalogo) {
      toast.error(
        `El precio no puede ser inferior al precio del producto en catálogo (${precioMinimoCatalogo.toLocaleString('es-CO')} ${form.moneda || 'COP'}).`,
      );
      return;
    }
    if (!form.tipo.trim()) {
      toast.error('Selecciona o crea un tipo de producto.');
      return;
    }
    const errorReglasVenta = validarReglasVentasProducto();
    if (errorReglasVenta) {
      toast.error(errorReglasVenta);
      return;
    }

    try {
      setSaving(true);
      if (dialogType === 'add') {
        const created = await productosService.crearProductoAdmin(buildProductoPayload());
        const createdRow = mapProduct(created);
        const relacionId = getProductoVentaRelacionId(created);
        if (relacionId && (pendingMedia.length > 0 || removedMediaIds.length > 0)) {
          await syncProductMediaAfterSave(relacionId, createdRow.media);
        }
        setProductos((prev) => [createdRow, ...prev]);
        toast.success('Producto creado exitosamente');
      } else {
        const updated = await productosService.actualizarProductoAdmin(form.id, buildProductoPayload());
        const updatedRow = mapProduct(updated);
        const relacionId = getProductoVentaRelacionId(updated);
        if (relacionId && (pendingMedia.length > 0 || removedMediaIds.length > 0)) {
          await syncProductMediaAfterSave(relacionId, updatedRow.media);
        }
        setProductos((prev) => prev.map((item) => item.id === form.id ? updatedRow : item));
        if (updated.cambiosReglasVentas?.length) {
          const resumen = updated.cambiosReglasVentas
            .map((c) => `${c.codigo}: ${c.valorAnterior ?? '—'}% → ${c.valorNuevo}%`)
            .join(' · ');
          toast.success(`Porcentajes actualizados: ${resumen}`);
          if (updated.sincronizarCarritoRecomendado) {
            toast.info('Los carritos activos deben sincronizarse para aplicar el nuevo porcentaje.');
          }
        } else {
          toast.success('Producto actualizado exitosamente');
        }
      }
      await loadData();
      closeDialog();
    } catch (error) {
      console.error('Error guardando producto:', error);
      toast.error(errorMessage(error, 'No se pudo guardar el producto.'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (): void => {
    if (!selected?.id) {
      toast.error('No se pudo identificar el producto.');
      return;
    }
    if (!selected) return;
    Swal({
      title: '¿Estás seguro?',
      text: 'El producto se desactivará del catálogo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await productosService.desactivarProductoAdmin(selected.id);
        setProductos((prev) => prev.filter((item) => item.id !== selected.id));
        toast.success('Producto desactivado correctamente');
        closeDialog();
      } catch (error) {
        console.error('Error desactivando producto:', error);
        toast.error(errorMessage(error, 'No se pudo desactivar el producto.'));
      }
    });
  };

  const onEliminar = (): void => {
    if (!selected?.id) {
      toast.error('No se pudo identificar el producto.');
      return;
    }
    if (!selected) return;
    Swal({
      title: '¿Eliminar definitivamente?',
      text: 'Esta acción elimina el producto de forma permanente. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await productosService.eliminarProductoAdmin(selected.id);
        setProductos((prev) => prev.filter((item) => item.id !== selected.id));
        toast.success('Producto eliminado correctamente');
        closeDialog();
      } catch (error) {
        console.error('Error eliminando producto:', error);
        toast.error(errorMessage(error, 'No se pudo eliminar el producto.'));
      }
    });
  };

  const onCreateCategory = async (): Promise<void> => {
    if (categoryCreateMode === 'parent' && categoriaPadreSeleccionadaId !== '__new__') {
      const subcategoriasValidas = subcategoriasDraft.filter((item) => item.nombre.trim());
      if (!subcategoriasValidas.length) {
        toast.error('Agrega al menos una subcategoría con nombre.');
        return;
      }
      try {
        setCategorySaving(true);
        const creadas: BackendCategoria[] = [];
        for (const subcategoria of subcategoriasValidas) {
          const creada = await productosService.crearCategoria({
            nombre: subcategoria.nombre.trim(),
            descripcion: subcategoria.descripcion.trim(),
            padre: categoriaPadreSeleccionadaId,
          });
          const subcategoriaId = backendId(creada);
          if (subcategoria.mediaFile && subcategoriaId) {
            const media = await productosService.subirMediaCategoria(
              subcategoriaId,
              subcategoria.mediaFile,
              subcategoria.mediaDuration,
            );
            creadas.push({ ...creada, media });
          } else {
            creadas.push(creada);
          }
        }
        if (categoryMediaFile) {
          await productosService.subirMediaCategoria(
            categoriaPadreSeleccionadaId,
            categoryMediaFile,
            categoryMediaDuration,
          );
        }
        setCategorias((prev) => [...prev, ...creadas].sort((a, b) => (
          String(a.nombre || '').localeCompare(String(b.nombre || ''))
        )));
        toast.success(`${creadas.length} subcategoría(s) parametrizadas correctamente`);
        closeCategoryDialog();
      } catch (error) {
        toast.error(errorMessage(error, 'No se pudieron crear las subcategorías.'));
      } finally {
        setCategorySaving(false);
      }
      return;
    }

    if (!categoryForm.nombre?.trim()) {
      toast.error('El nombre de la categoría es obligatorio.');
      return;
    }

    try {
      setCategorySaving(true);
      const created = await productosService.crearCategoria({
        nombre: categoryForm.nombre,
        descripcion: categoryForm.descripcion || '',
        padre: categoryForm.padre || null,
      });
      const createdId = backendId(created);
      let createdWithMedia = created;
      if (categoryMediaFile && createdId) {
        const media = await productosService.subirMediaCategoria(
          createdId,
          categoryMediaFile,
          categoryMediaDuration
        );
        createdWithMedia = { ...created, media };
      }
      const subcategoriasCreadas: BackendCategoria[] = [];
      if (categoryCreateMode === 'parent' && createdId) {
        for (const subcategoria of subcategoriasDraft) {
          const nombre = subcategoria.nombre.trim();
          if (!nombre) continue;
          const creada = await productosService.crearCategoria({
            nombre,
            descripcion: subcategoria.descripcion.trim(),
            padre: createdId,
          });
          const subcategoriaId = backendId(creada);
          if (subcategoria.mediaFile && subcategoriaId) {
            const media = await productosService.subirMediaCategoria(
              subcategoriaId,
              subcategoria.mediaFile,
              subcategoria.mediaDuration,
            );
            subcategoriasCreadas.push({ ...creada, media });
          } else {
            subcategoriasCreadas.push(creada);
          }
        }
      }
      const nextCategorias = [...categorias, createdWithMedia, ...subcategoriasCreadas].sort((a, b) =>
        String(a.nombre || '').localeCompare(String(b.nombre || ''))
      );
      setCategorias(nextCategorias);
      setForm((prev) => ({ ...prev, categoriaId: backendId(created), categoria: created.nombre }));
      toast.success(
        subcategoriasCreadas.length
          ? `Categoría padre y ${subcategoriasCreadas.length} subcategoría(s) creadas correctamente`
          : 'Categoría creada correctamente',
      );
      closeCategoryDialog();
    } catch (error) {
      console.error('Error creando categoría:', error);
      toast.error(errorMessage(error, 'No se pudo crear la categoría.'));
    } finally {
      setCategorySaving(false);
    }
  };

  const onCreateType = async (): Promise<void> => {
    if (!typeForm.nombre?.trim()) {
      toast.error('El nombre del tipo es obligatorio.');
      return;
    }

    try {
      setTypeSaving(true);
      const payload = {
        nombre: typeForm.nombre,
        codigo: typeForm.codigo || undefined,
        descripcion: typeForm.descripcion || '',
      };
      const saved = tipoEditandoId
        ? await productosService.actualizarTipoProducto(tipoEditandoId, payload)
        : await productosService.crearTipoProducto(payload);
      const nextTipos = tiposPersistidosUnicos([
        ...tiposProducto.filter((tipo) => backendId(tipo) !== tipoEditandoId),
        saved,
      ])
        .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
      setTiposProducto(nextTipos);
      setForm((prev) => ({ ...prev, tipo: saved.nombre }));
      toast.success(tipoEditandoId ? 'Tipo actualizado correctamente' : 'Tipo creado correctamente');
      setTypeForm({ nombre: '', codigo: '', descripcion: '' });
      setTipoEditandoId(null);
    } catch (error) {
      console.error('Error creando tipo de producto:', error);
      toast.error(errorMessage(error, 'No se pudo crear el tipo de producto.'));
    } finally {
      setTypeSaving(false);
    }
  };

  const editarTipoProducto = (tipo: BackendTipoProducto): void => {
    setTipoEditandoId(backendId(tipo));
    setTypeForm({
      nombre: tipo.nombre || '',
      codigo: tipo.codigo || '',
      descripcion: tipo.descripcion || '',
    });
  };

  const eliminarTipoProducto = async (tipo: BackendTipoProducto): Promise<void> => {
    const id = backendId(tipo);
    if (!id) return;
    const confirmacion = await Swal({
      title: '¿Desactivar tipo de producto?',
      text: tipo.nombre,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;
    try {
      setTypeSaving(true);
      await productosService.eliminarTipoProducto(id);
      setTiposProducto((prev) => prev.filter((item) => backendId(item) !== id));
      if (tipoEditandoId === id) {
        setTipoEditandoId(null);
        setTypeForm({ nombre: '', codigo: '', descripcion: '' });
      }
      toast.success('Tipo desactivado correctamente');
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo desactivar el tipo.'));
    } finally {
      setTypeSaving(false);
    }
  };

  const current = dialogType === 'view' ? selected : form;

  const onSyncCollection = async (): Promise<void> => {
    const ok = await loadData();
    if (ok) toast.success('Productos sincronizados desde la coleccion.');
  };

  const reencolarPipelineB = async (): Promise<void> => {
    setReencolandoPipelineB(true);
    try {
      const resultado = await pipelineBComisionService.reencolar({ scan: true, limit: 50, fixOrigen: true });
      toast.success(resultado.msg || `Reencolado completado: ${resultado.evaluadas} venta(s) evaluada(s).`);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo reencolar Pipeline B.'));
    } finally {
      setReencolandoPipelineB(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-5 flex flex-col gap-4 border-b pb-4 sm:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Gestión de Productos</h1>
          <ModuleHelpButton id="btn-ayuda-modulo-productos" title="Ayuda de Gestión de Productos" description="Administra catálogo, inventario, publicación, reglas contables, reglas de venta, categorías y secuencias." details={["Las reglas contables determinan impuestos y su desglose.", "Las reglas de venta determinan comisiones.", "Sincronizar actualiza relaciones del catálogo.", "Reencolar recupera comisiones pendientes del Pipeline B."]} />
        </div>
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 xl:flex xl:flex-wrap xl:items-center [&>*]:h-auto [&>*]:min-h-10 [&>*]:w-full [&>*]:whitespace-normal xl:[&>*]:w-auto">
          <GovernedButton actionId={PRODUCT_ACTION_IDS.MANAGE_RULE_SCOPE}
            variant="outline"
            onClick={() => setOpenAlcanceReglasModal(true)}
            className="flex items-center gap-2 rounded-lg"
          >
            <Settings2 className="h-4 w-4" />
            Alcance reglas
          </GovernedButton>
          <ConfigCatalogoProductosTrigger actionId={PRODUCT_ACTION_IDS.MANAGE_CATALOG_CONFIG} onClick={() => setOpenCatalogoConfigModal(true)} />
          <GovernedButton actionId={PRODUCT_ACTION_IDS.MANAGE_SALES_SEQUENCE}
            variant="outline"
            onClick={() => setOpenVentaWompiSecuenciaModal(true)}
            className="flex items-center gap-2 rounded-lg"
          >
            <Hash className="h-4 w-4" />
            Secuencia ventas
          </GovernedButton>
          <GovernedButton actionId={PRODUCT_ACTION_IDS.MANAGE_SALES_RULES}
            variant="outline"
            onClick={() => setOpenReglasVentasModal(true)}
            className="flex items-center gap-2 rounded-lg"
          >
            <Settings2 className="h-4 w-4" />
            Reglas Ventas
          </GovernedButton>
          <GovernedButton actionId={PRODUCT_ACTION_IDS.SYNC}
            variant="outline"
            onClick={() => { void onSyncCollection(); }}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </GovernedButton>
          <GovernedButton actionId={PRODUCT_ACTION_IDS.VIEW_CATEGORIES} variant="outline" onClick={() => setOpenCategoriesListDialog(true)} className="flex items-center gap-2 rounded-lg">
            <FolderTree className="h-4 w-4" />
            Ver Categorias
          </GovernedButton>
          <GovernedButton actionId={PRODUCT_ACTION_IDS.CREATE_CATEGORY} variant="outline" onClick={abrirCrearCategoriaPadre} className="rounded-lg">
            Crear Categoría Padre
          </GovernedButton>
          <GovernedButton actionId={PRODUCT_ACTION_IDS.MANAGE_ACCOUNTING_RULES}
            variant="outline"
            onClick={() => setOpenReglasContablesModal(true)}
            className="flex items-center gap-2 rounded-lg"
          >
            <DollarSign className="h-4 w-4" />
            Reglas contables
          </GovernedButton>
          <GovernedButton actionId={PRODUCT_ACTION_IDS.REQUEUE_PIPELINE_B}
            variant="outline"
            onClick={() => { void reencolarPipelineB(); }}
            disabled={reencolandoPipelineB}
            className="flex items-center gap-2 rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${reencolandoPipelineB ? 'animate-spin' : ''}`} />
            Reencolar
          </GovernedButton>
          <GovernedButton
            id="btn-parametrizar-tipos-producto"
            actionId={PRODUCT_ACTION_IDS.MANAGE_PRODUCT_TYPES}
            variant="outline"
            onClick={() => setOpenTypeDialog(true)}
            className="flex items-center gap-2 rounded-lg"
          >
            <Settings2 className="h-4 w-4" />
            Parametrizar tipos
          </GovernedButton>
          <GovernedButton actionId={PRODUCT_ACTION_IDS.CREATE_PRODUCT} onClick={openAdd} className="flex items-center gap-2 rounded-lg">
            <Plus className="h-5 w-5" />
            Agregar Producto
          </GovernedButton>
        </div>
      </div>

      <div className="mb-5 w-full sm:mb-6 sm:max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto por nombre, categoría o SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 rounded-lg pl-10 shadow-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table className="min-w-[1050px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Stock Kardex</TableHead>
                <TableHead>Colores</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Destacado</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Cargando productos...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No hay productos para mostrar.</TableCell>
              </TableRow>
            ) : filtered.map((producto) => (
              <TableRow key={producto.id} className="hover:bg-accent/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img
                      src={producto.imagen || PLACEHOLDER}
                      alt={producto.nombre}
                      className="h-10 w-10 rounded border object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = PLACEHOLDER;
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">{producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">{producto.sku || producto.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{producto.categoria}</TableCell>
                <TableCell>{producto.tipo}</TableCell>
                <TableCell>{producto.unidadMedida}</TableCell>
                <TableCell>{obtenerStockKardexSku(producto.sku).toLocaleString('es-CO')}</TableCell>
                <TableCell>{producto.cantidadColoresRender}</TableCell>
                <TableCell className="font-semibold text-primary">${Number(producto.precio || 0).toFixed(2)} {producto.moneda}</TableCell>
                <TableCell>
                  <Switch checked={producto.destacado} onCheckedChange={() => { void onToggleDestacado(producto); }} />
                </TableCell>
                <TableCell>
                  <Switch checked={producto.publicado} onCheckedChange={() => { void onTogglePublished(producto); }} />
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button variant="ghost" size="icon" className={`h-8 w-8 ${BTN_GHOST_ACCENT}`} onClick={() => openEdit(producto)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-secondary hover:bg-secondary/10" onClick={() => { void openView(producto); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => openDelete(producto)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openDialog} onOpenChange={(open) => (open ? setOpenDialog(true) : closeDialog())}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] lg:w-[min(1200px,calc(100vw-3rem))]">
          <DialogHeader className="shrink-0 border-b px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
              <DialogTitle>
                {dialogType === 'add' ? 'Agregar Nuevo Producto' : dialogType === 'edit' ? 'Editar Producto' : dialogType === 'view' ? 'Detalle del Producto' : 'Desactivar Producto'}
              </DialogTitle>
              {dialogType !== 'delete' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => setOpenProductHelpDialog(true)}
                >
                  <CircleHelp className="h-4 w-4" />
                  Ayuda
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          {dialogType === 'delete' ? (
            <div className="space-y-2 px-6 py-6 text-center text-sm text-muted-foreground">
              <p>¿Seguro que deseas desactivar "{selected?.nombre}"?</p>
            </div>
          ) : current ? (
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-5 md:min-w-[1040px] md:flex-row md:flex-nowrap md:items-start">
                {/* Columna 1: identificación y catálogo */}
                <section className="flex w-full flex-col gap-4 md:w-[min(280px,28%)] md:shrink-0">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={current.nombre}
                    disabled={dialogType === 'view'}
                    maxLength={limitesCatalogo.nombreMax}
                    onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  />
                  {dialogType !== 'view' ? (
                    <p className="text-xs text-muted-foreground">
                      {current.nombre.length}/{limitesCatalogo.nombreMax} caracteres
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">Producto</Label>
                  {dialogType === 'view' ? (
                    <Input id="sku" value={current.sku} disabled />
                  ) : (
                    <GobernanzaModuloSearchableSelect
                      id="sku"
                      value={form.sku}
                      onValueChange={onSelectProductSku}
                      disabled={productosConSku.length === 0}
                      placeholder={productosConSku.length > 0 ? 'Selecciona producto' : 'No hay productos con stock disponible'}
                      searchPlaceholder="Buscar producto…"
                      emptyMessage="Sin productos que coincidan"
                      options={productosConSku.map((producto) => ({
                        value: producto.sku,
                        searchText: `${producto.nombre} ${producto.sku}`,
                        label: `${producto.nombre} | Stock ${obtenerStockKardexSku(producto.sku).toLocaleString('es-CO')}`,
                      }))}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {dialogType === 'view' ? detalleUnidadMedida(current.unidadMedida) : detalleUnidadMedida(form.unidadMedida)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockKardex">Stock Kardex del SKU</Label>
                  <Input
                    id="stockKardex"
                    type="number"
                    min={0}
                    value={obtenerStockKardexSku(current.sku)}
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground">
                    Calculado desde saldos Kardex por bodega.
                  </p>
                </div>
                <div className="space-y-2">
                  {dialogType === 'view' ? (
                    current.tipo ? (
                      <>
                        <Label htmlFor="tipo">Tipo</Label>
                        <Input id="tipo" value={current.tipo} disabled />
                      </>
                    ) : null
                  ) : (
                    <>
                      {tiposProducto.length > 0 && (
                        <>
                          <Label htmlFor="tipo">Tipo</Label>
                          <select id="tipo" value={form.tipo} onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <option value="">Selecciona tipo</option>
                            {tiposProducto.map((tipo) => (
                              <option key={backendId(tipo) || tipo.codigo || tipo.nombre} value={tipo.nombre}>
                                {tipo.nombre}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                      <button
                        type="button"
                        className="text-xs text-primary underline underline-offset-4"
                        onClick={() => setOpenTypeDialog(true)}
                      >
                        Crear tipo nuevo
                      </button>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría padre</Label>
                  {dialogType === 'view' ? (
                    <Input id="categoria" value={current.categoria} disabled />
                  ) : (
                    <select
                      id="categoria"
                      value={form.categoriaId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const categoria = categorias.find((item) => backendId(item) === id);
                        setForm((prev) => ({
                          ...prev,
                          categoriaId: id,
                          categoria: categoria?.nombre || '',
                          subcategoriaId: '',
                          subcategoria: '',
                        }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Sin categoría</option>
                      {categorias
                        .filter(esCategoriaPadre)
                        .map((categoria) => (
                          <option key={backendId(categoria)} value={backendId(categoria)}>
                            {categoria.nombre}
                          </option>
                        ))}
                    </select>
                  )}
                  {dialogType !== 'view' && (
                    <button
                      type="button"
                      className="text-xs text-primary underline underline-offset-4"
                      onClick={abrirCrearCategoriaPadre}
                    >
                      Crear categoría nueva
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategoria">Subcategoría asociada</Label>
                  {dialogType === 'view' ? (
                    <Input
                      id="subcategoria"
                      value={current.subcategoria || 'Sin subcategoría'}
                      disabled
                    />
                  ) : (
                    <select
                      id="subcategoria"
                      value={form.subcategoriaId}
                      disabled={!form.categoriaId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const subcategoria = categorias.find((item) => backendId(item) === id);
                        setForm((prev) => ({
                          ...prev,
                          subcategoriaId: id,
                          subcategoria: subcategoria?.nombre || '',
                        }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">
                        {form.categoriaId ? 'Sin subcategoría' : 'Selecciona primero la categoría padre'}
                      </option>
                      {categorias
                        .filter((categoria) => esSubcategoriaDe(categoria, form.categoriaId))
                        .map((subcategoria) => (
                          <option key={backendId(subcategoria)} value={backendId(subcategoria)}>
                            {subcategoria.nombre}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="precio"
                      type="number"
                      className="pl-10"
                      min={dialogType !== 'view' && precioMinimoCatalogo > 0 ? precioMinimoCatalogo : undefined}
                      value={current.precio}
                      disabled={dialogType === 'view'}
                      onChange={(e) => setForm((prev) => ({ ...prev, precio: e.target.value }))}
                    />
                  </div>
                  {dialogType !== 'view' && precioMinimoCatalogo > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Precio mínimo del producto en catálogo: ${precioMinimoCatalogo.toLocaleString('es-CO')} {form.moneda || 'COP'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda catálogo / carrito</Label>
                  {dialogType === 'view' ? (
                    <Input id="moneda" value={current.moneda} disabled />
                  ) : (
                    <select
                      id="moneda"
                      value={form.monedaId || monedasCatalogoActivas.find((m) => m.monedas === form.moneda)?.iud || monedasCatalogoActivas.find((m) => m.monedas === form.moneda)?._id || ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        const moneda = monedasCatalogoActivas.find((row) => monedaCopId(row) === id);
                        setForm((prev) => ({
                          ...prev,
                          monedaId: id,
                          moneda: moneda?.monedas || prev.moneda,
                        }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {monedasCatalogoActivas.length === 0 && (
                        <option value="">Sin monedas activas</option>
                      )}
                      {monedasCatalogoActivas.map((moneda) => (
                        <option key={monedaCopId(moneda)} value={monedaCopId(moneda)}>
                          {moneda.monedas}
                          {moneda.activoWompi ? ' · Wompi' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {dialogType !== 'view' && (
                    <p className="text-xs text-muted-foreground">
                      Referencia a monedasCop (monedaId). Para checkout Wompi requiere activoWompi=true.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidadMedida">Unidad medida</Label>
                  {dialogType === 'view' ? (
                    <Input id="unidadMedida" value={current.unidadMedida} disabled />
                  ) : (
                    <select
                      id="unidadMedida"
                      value={form.unidadMedida}
                      onChange={(e) => setForm((prev) => ({ ...prev, unidadMedida: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="UNIDAD">UNIDAD</option>
                      {unidadesMedida.map((unidad) => (
                        <option key={unidad._id || unidad.codigo} value={unidad.codigo}>
                          {unidad.nombre || unidad.codigo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                </section>

                {/* Columna 2: colores */}
                <section className="flex w-full flex-col gap-4 md:w-[min(280px,28%)] md:shrink-0">
                <div className="space-y-2">
                  <Label htmlFor="cantidadColoresRender">Colores a renderizar</Label>
                  <Input
                    id="cantidadColoresRender"
                    type="number"
                    min={0}
                    max={50}
                    value={current.cantidadColoresRender}
                    disabled={dialogType === 'view'}
                    onChange={(e) => onCantidadColoresChange(Number(e.target.value || 0))}
                  />
                </div>
                {current.cantidadColoresRender > 0 && (
                  <div className="space-y-3 rounded-md border border-border p-3">
                    <Label>Colores permitidos del producto</Label>
                    <div className="flex flex-col gap-3">
                      {syncColoresPermitidos(current.cantidadColoresRender, current.coloresPermitidos).map((color, index) => (
                        <div key={`color-${index}`} className="grid grid-cols-[44px_1fr_92px] items-center gap-2">
                          <Input
                            type="color"
                            value={color.valor}
                            disabled={dialogType === 'view'}
                            onChange={(e) => onColorPermitidoChange(index, 'valor', e.target.value)}
                            className="h-10 p-1"
                          />
                          <Input
                            value={color.nombre}
                            disabled={dialogType === 'view'}
                            onChange={(e) => onColorPermitidoChange(index, 'nombre', e.target.value)}
                            placeholder={`Color ${index + 1}`}
                          />
                          <Input
                            value={color.valor}
                            disabled={dialogType === 'view'}
                            onChange={(e) => onColorPermitidoChange(index, 'valor', e.target.value)}
                            placeholder="#000000"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </section>

                {/* Columna 3: reglas contables e imagen */}
                <section className="flex w-full flex-col gap-4 md:w-[min(300px,30%)] md:shrink-0">
                <div className="space-y-3 rounded-md border border-border px-3 py-2">
                  <div>
                    <Label>Reglas contables del producto</Label>
                    <p className="text-xs text-muted-foreground">
                      Selecciona las reglas que se calculan para este item en el carrito.
                    </p>
                  </div>
                  {reglasContables.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay reglas contables activas.</p>
                  ) : (
                    <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                      {reglasContables.map((regla) => {
                        const codigo = String(regla.codigo || '').toUpperCase();
                        const checked = current.reglasContables.some((item) => item.codigo === codigo && item.aplica !== false);
                        return (
                          <label key={codigo} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={dialogType === 'view'}
                              onChange={(e) => onReglaContableChange(codigo, e.target.checked)}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{regla.nombre || codigo}</span>
                              <span className="text-xs text-muted-foreground">{codigo} | {Number(regla.tarifa || 0)}%</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-3 rounded-md border border-border px-3 py-2">
                  <div>
                    <Label>Reglas de venta del producto</Label>
                    <p className="text-xs text-muted-foreground">
                      Seleccione las reglas que aplican a este producto y asigne el valor (% , cantidad max. u otro).
                      Si la regla esta marcada, el carrito exige ese valor.
                    </p>
                  </div>
                  {reglasVentas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay reglas de venta activas.</p>
                  ) : (
                    <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                      {reglasVentas.map((regla) => {
                        const codigo = String(regla.codigo || '').toUpperCase();
                        const asignada = current.reglasVentas.find((item) => item.codigo === codigo && item.aplica !== false);
                        const checked = Boolean(asignada);
                        const comportamiento = resolverComportamientoDesdeReglaVenta(regla, tiposReglaVenta);
                        const permiteValor = reglaVentaPermiteValorEnProducto(comportamiento);
                        const valorMostrar = Number.isFinite(Number(asignada?.valor))
                          ? Number(asignada?.valor)
                          : NaN;
                        const reglaResumen = { ...regla, valor: valorMostrar };
                        return (
                          <div key={codigo} className="rounded-md border px-3 py-2 text-sm">
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                disabled={dialogType === 'view'}
                                onChange={(e) => onReglaVentaChange(codigo, e.target.checked)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{regla.nombre || codigo}</span>
                                <span className="text-xs text-muted-foreground">{codigo}</span>
                              </span>
                            </label>
                            {checked && permiteValor ? (
                              <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                                <Label htmlFor={`regla-venta-valor-${codigo}`} className="shrink-0 text-xs text-muted-foreground">
                                  {etiquetaCampoValorReglaVentaProducto(comportamiento)}
                                </Label>
                                <Input
                                  id={`regla-venta-valor-${codigo}`}
                                  type="number"
                                  min={comportamiento === 'LIMITE_CANTIDAD' ? 1 : 0}
                                  max={comportamiento === 'DESCUENTO_PORCENTAJE' ? 100 : undefined}
                                  step={comportamiento === 'LIMITE_CANTIDAD' ? 1 : comportamiento === 'DESCUENTO_PORCENTAJE' ? 0.01 : 1}
                                  className="h-8 w-28"
                                  value={Number.isFinite(Number(asignada?.valor)) ? String(asignada?.valor) : ''}
                                  placeholder={placeholderValorPorComportamiento(comportamiento)}
                                  disabled={dialogType === 'view'}
                                  onChange={(e) => onReglaVentaValorChange(codigo, e.target.value)}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {Number.isFinite(valorMostrar)
                                    ? `En carrito: ${resumenValorReglaVenta(reglaResumen, tiposReglaVenta)}`
                                    : 'Indique el valor para aplicar esta regla en el carrito'}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imagenProducto">
                    Imágenes del producto
                    {' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      (máx. {MAX_PRODUCT_IMAGES}
                      {totalVideosCount(current.media) > 0 || pendingVideosCount > 0 ? ', 1 video' : ''}
                      )
                    </span>
                  </Label>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {activeExistingImages(current.media).map((item) => {
                        const id = mediaRowId(item);
                        return (
                          <div key={id} className="relative">
                            <img
                              src={mediaSrc(item.url)}
                              alt={current.nombre || 'Producto'}
                              className="h-24 w-full rounded-md border object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = PLACEHOLDER;
                              }}
                            />
                            {dialogType !== 'view' && (
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="absolute right-1 top-1 h-6 w-6"
                                onClick={() => markMediaForRemoval(id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {pendingMedia.filter((item) => item.kind === 'image').map((item) => (
                        <div key={item.id} className="relative">
                          <img
                            src={item.previewUrl}
                            alt="Nueva imagen"
                            className="h-24 w-full rounded-md border object-cover"
                          />
                          {dialogType !== 'view' && (
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute right-1 top-1 h-6 w-6"
                              onClick={() => removePendingMedia(item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Input
                        id="imagenProducto"
                        value={imagenUrlInputValue(current.imagen)}
                        disabled={dialogType === 'view'}
                        onChange={(e) => {
                          clearMediaSelection();
                          setForm((prev) => ({ ...prev, imagen: e.target.value || PLACEHOLDER }));
                        }}
                        placeholder="URL de imagen principal (opcional)"
                      />
                      {dialogType !== 'view' && (
                        <Input
                          type="file"
                          accept="image/*,video/mp4,video/webm,video/quicktime"
                          multiple
                          disabled={remainingImageSlots(current.media) <= 0 && totalVideosCount(current.media) >= 1}
                          onChange={(e) => {
                            void onProductMediaFilesChange(e.target.files);
                            e.target.value = '';
                          }}
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {totalImagesCount(current.media)}
                        /
                        {MAX_PRODUCT_IMAGES}
                        {' '}
                        imágenes
                        {pendingMedia.length > 0 ? ' · se suben al guardar' : ''}
                      </p>
                      {activeExistingVideos(current.media).map((item) => {
                        const id = mediaRowId(item);
                        return (
                          <div key={id} className="space-y-1">
                            <video src={mediaSrc(item.url)} controls className="max-h-32 w-full rounded border" />
                            {dialogType !== 'view' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => markMediaForRemoval(id)}
                              >
                                Quitar video
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {pendingMedia.filter((item) => item.kind === 'video').map((item) => (
                        <div key={item.id} className="space-y-1">
                          <video src={item.previewUrl} controls className="max-h-32 w-full rounded border" />
                          {dialogType !== 'view' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => removePendingMedia(item.id)}
                            >
                              Quitar video pendiente
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                </section>

                {/* Columna 4: opciones y descripción */}
                <section className="flex w-full flex-col gap-4 md:min-w-[220px] md:flex-1">
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <Label htmlFor="manejaVentas">Maneja ventas</Label>
                    <p className="text-xs text-muted-foreground">Crea la relacion del producto para el flujo de ventas.</p>
                  </div>
                  <Switch
                    id="manejaVentas"
                    checked={current.manejaVentas}
                    disabled={dialogType === 'view'}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, manejaVentas: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div className="flex items-start gap-2">
                    <Star className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <Label htmlFor="destacado">Destacado</Label>
                      <p className="text-xs text-muted-foreground">Muestra este producto en Productos Destacados del home.</p>
                    </div>
                  </div>
                  <Switch
                    id="destacado"
                    checked={current.destacado}
                    disabled={dialogType === 'view'}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, destacado: checked }))}
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={current.descripcion}
                    disabled={dialogType === 'view'}
                    rows={8}
                    maxLength={limitesCatalogo.descripcionMax}
                    className="min-h-[140px] flex-1 resize-y"
                    onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  />
                  {dialogType !== 'view' ? (
                    <p className="text-xs text-muted-foreground">
                      {(current.descripcion || '').length}/{limitesCatalogo.descripcionMax} caracteres
                    </p>
                  ) : null}
                </div>
                </section>
              </div>
            </div>
          ) : null}

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={closeDialog}>{dialogType === 'delete' ? 'Cancelar' : 'Cerrar'}</Button>
            {dialogType === 'add' || dialogType === 'edit' ? (
              <Button onClick={() => { void onSave(); }} disabled={saving}>
                {saving ? 'Guardando...' : dialogType === 'add' ? 'Agregar Producto' : 'Guardar Cambios'}
              </Button>
            ) : dialogType === 'delete' ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="destructive" onClick={onEliminar}>
                  Eliminar
                </Button>
                <Button variant="outline" onClick={onDelete}>
                  Sí, desactivar
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openProductHelpDialog} onOpenChange={setOpenProductHelpDialog}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto overscroll-contain p-3 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6 lg:w-[min(672px,calc(100vw-3rem))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleHelp className="h-5 w-5 text-primary" />
              Ayuda del formulario de productos
            </DialogTitle>
            <DialogDescription>
              Completa la información necesaria para publicar y vender un producto en el catálogo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="font-medium">Identificación</p>
              <p className="mt-1 text-muted-foreground">Asigna el nombre y selecciona el producto con SKU y stock disponible.</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Clasificación</p>
              <p className="mt-1 text-muted-foreground">Selecciona tipo, categoría y subcategoría para organizar el catálogo.</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Precio y moneda</p>
              <p className="mt-1 text-muted-foreground">Define el precio, la moneda utilizada por el carrito y la unidad de medida.</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Reglas del producto</p>
              <p className="mt-1 text-muted-foreground">Activa las reglas contables y de venta que deben calcularse al agregar el producto al carrito.</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Imágenes</p>
              <p className="mt-1 text-muted-foreground">Agrega una URL principal o carga hasta cuatro archivos para presentar el producto.</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Venta y visibilidad</p>
              <p className="mt-1 text-muted-foreground">“Maneja ventas” vincula el producto al flujo comercial y “Destacado” lo muestra en el inicio.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setOpenProductHelpDialog(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCategoriesListDialog} onOpenChange={setOpenCategoriesListDialog}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto overscroll-contain p-3 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6 lg:w-[min(768px,calc(100vw-3rem))]">
          <DialogHeader>
            <DialogTitle>Categorias creadas</DialogTitle>
            <DialogDescription>
              Consulta, edita o elimina las categorías del catálogo de productos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria o descripcion..."
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Categoría padre y subcategorías</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategorias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No hay categorias para mostrar.
                      </TableCell>
                    </TableRow>
                  ) : filteredCategorias.map((categoria) => (
                    <TableRow key={backendId(categoria)}>
                      <TableCell>
                        <p className="font-medium">{categoria.nombre}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {categorias
                            .filter((item) => {
                              const padre = typeof item.padre === 'object' && item.padre !== null
                                ? backendId(item.padre)
                                : String(item.padre || '');
                              return padre === backendId(categoria);
                            })
                            .map((item) => (
                              <Badge key={backendId(item)} variant="outline">{item.nombre}</Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={categoria.estado ? 'secondary' : 'outline'}>
                          {categoria.estado ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {categoria.descripcion || 'Sin descripcion'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title="Crear subcategoría"
                            onClick={() => abrirCrearSubcategoria(categoria)}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Subcategoría
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar categoría"
                            onClick={() => abrirEditarCategoria(categoria)}
                            disabled={categoriaEliminandoId === backendId(categoria)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            title="Eliminar categoría"
                            onClick={() => void eliminarCategoria(categoria)}
                            disabled={categoriaEliminandoId === backendId(categoria)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCategoriesListDialog(false)}>Cerrar</Button>
            <Button onClick={abrirCrearCategoriaPadre}>Crear categoría padre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(categoriaEdit)} onOpenChange={(open) => { if (!open) setCategoriaEdit(null); }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto overscroll-contain p-3 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6 lg:w-[min(512px,calc(100vw-3rem))]">
          <DialogHeader>
            <DialogTitle>Parametrizar Categoría</DialogTitle>
            <DialogDescription>
              Actualiza nombre, descripción, estado o la imagen/video de la categoría.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoria-edit-nombre">Nombre</Label>
              <Input
                id="categoria-edit-nombre"
                value={categoriaEditForm.nombre}
                onChange={(e) => setCategoriaEditForm((prev) => ({ ...prev, nombre: e.target.value }))}
                disabled={categoriaEditSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria-edit-descripcion">Descripción</Label>
              <Input
                id="categoria-edit-descripcion"
                value={categoriaEditForm.descripcion}
                onChange={(e) => setCategoriaEditForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                disabled={categoriaEditSaving}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={categoriaEditForm.estado}
                onCheckedChange={(checked) => setCategoriaEditForm((prev) => ({ ...prev, estado: checked }))}
                disabled={categoriaEditSaving}
                aria-label="Estado de la categoría"
              />
              <span className="text-sm text-muted-foreground">
                {categoriaEditForm.estado ? 'Activa en catálogo' : 'Inactiva (oculta en selects y matriz de reglas)'}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria-edit-media">Imagen o video (máx. 10 s)</Label>
              {categoriaEdit?.media?.url && !categoriaEditMediaFile ? (
                <div className="flex items-center gap-3 rounded-md border p-2">
                  {String(categoriaEdit.media.mimetype || '').startsWith('image/') ? (
                    <img
                      src={categoriaEdit.media.url}
                      alt={`Media de ${categoriaEdit.nombre}`}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Video actual</span>
                  )}
                  <span className="text-xs text-muted-foreground">Media actual — sube un archivo para reemplazarla.</span>
                </div>
              ) : null}
              <Input
                id="categoria-edit-media"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={(e) => { void onCategoriaEditMediaFileChange(e.target.files?.[0]); }}
                disabled={categoriaEditSaving}
              />
              {categoriaEditMediaFile && (
                <p className="text-xs text-muted-foreground">
                  {categoriaEditMediaFile.name}
                  {typeof categoriaEditMediaDuration === 'number'
                    ? ` | ${categoriaEditMediaDuration.toFixed(1)} seg`
                    : ''}
                  {' — reemplazará la media actual al guardar.'}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoriaEdit(null)} disabled={categoriaEditSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void guardarCategoriaEdit()} disabled={categoriaEditSaving}>
              {categoriaEditSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCategoryDialog} onOpenChange={(open) => (open ? setOpenCategoryDialog(true) : closeCategoryDialog())}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto overscroll-contain p-3 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6 lg:w-[min(512px,calc(100vw-3rem))]">
          <DialogHeader>
            <DialogTitle>
              {categoryCreateMode === 'subcategory'
                ? 'Crear Subcategoría'
                : categoriaPadreSeleccionadaId === '__new__'
                  ? 'Crear Categoría Padre'
                  : 'Parametrizar Subcategorías'}
            </DialogTitle>
            <DialogDescription>
              {categoryCreateMode === 'subcategory'
                ? 'Registra una subcategoría relacionada con la categoría padre seleccionada.'
                : categoriaPadreSeleccionadaId === '__new__'
                  ? 'Registra una nueva categoría padre del catálogo.'
                  : 'Agrega subcategorías a una categoría padre existente.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {categoryCreateMode === 'parent' && (
              <div className="space-y-2">
                <Label htmlFor="categoria-padre-dinamica">Categoría padre</Label>
                <select
                  id="categoria-padre-dinamica"
                  value={categoriaPadreSeleccionadaId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCategoriaPadreSeleccionadaId(value);
                    setCategoryForm((prev) => ({
                      ...prev,
                      nombre: value === '__new__' ? prev.nombre : '',
                      descripcion: value === '__new__' ? prev.descripcion : '',
                      padre: null,
                    }));
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="__new__">+ Crear nueva categoría padre</option>
                  {categorias
                    .filter((categoria) => (
                      Number(categoria.nivel || 1) === 1
                      && categoria.estado !== false
                    ))
                    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
                    .map((categoria) => (
                      <option key={backendId(categoria)} value={backendId(categoria)}>
                        {categoria.nombre}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Selecciona un padre existente para agregarle subcategorías o crea uno nuevo.
                </p>
              </div>
            )}

            {(categoryCreateMode !== 'parent' || categoriaPadreSeleccionadaId === '__new__') && (
            <>
            <div className="space-y-2">
              <Label htmlFor="categoria-nombre">Nombre</Label>
              <Input
                id="categoria-nombre"
                value={categoryForm.nombre || ''}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: LABIALES"
              />
            </div>

            {categoryCreateMode === 'subcategory' && (
            <div className="space-y-2">
              <Label htmlFor="categoria-padre">Categoría padre seleccionada</Label>
              <select
                id="categoria-padre"
                value={categoryForm.padre || ''}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, padre: e.target.value || null }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {categorias
                  .filter(esCategoriaPadre)
                  .map((categoria) => (
                    <option key={backendId(categoria)} value={backendId(categoria)}>
                      {categoria.nombre}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground">
                La relación se guardará mediante el identificador de esta categoría padre.
              </p>
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="categoria-descripcion">Descripción</Label>
              <Textarea
                id="categoria-descripcion"
                value={categoryForm.descripcion || ''}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                rows={3}
                placeholder="Descripción opcional de la categoría"
              />
            </div>
            </>
            )}

            {categoryCreateMode === 'parent' && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Subcategorías</Label>
                    <p className="text-xs text-muted-foreground">
                      Parametriza las subcategorías que quedarán relacionadas con este padre.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSubcategoriasDraft((prev) => [
                      ...prev,
                      { nombre: '', descripcion: '', mediaFile: null },
                    ])}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Agregar
                  </Button>
                </div>

                {subcategoriasDraft.length === 0 ? (
                  <p className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    Puedes crear el padre sin subcategorías o agregar una o varias ahora.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                    {subcategoriasDraft.map((subcategoria, index) => (
                      <div key={index} className="space-y-2 rounded-md border bg-muted/20 p-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={subcategoria.nombre}
                            placeholder={`Nombre de subcategoría ${index + 1}`}
                            onChange={(e) => setSubcategoriasDraft((prev) => prev.map(
                              (item, itemIndex) => itemIndex === index
                                ? { ...item, nombre: e.target.value }
                                : item,
                            ))}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive"
                            onClick={() => setSubcategoriasDraft((prev) => (
                              prev.filter((_, itemIndex) => itemIndex !== index)
                            ))}
                            aria-label={`Eliminar subcategoría ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={subcategoria.descripcion}
                          placeholder="Descripción opcional de la subcategoría"
                          rows={2}
                          onChange={(e) => setSubcategoriasDraft((prev) => prev.map(
                            (item, itemIndex) => itemIndex === index
                              ? { ...item, descripcion: e.target.value }
                            : item,
                          ))}
                        />
                        <div className="space-y-1">
                          <Label htmlFor={`subcategoria-media-${index}`} className="text-xs">
                            Imagen o video de la subcategoría
                          </Label>
                          <Input
                            id={`subcategoria-media-${index}`}
                            type="file"
                            accept="image/*,video/mp4,video/webm,video/quicktime"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              void (async () => {
                                if (!file) return;
                                const media = await validarMediaCategoria(file);
                                if (!media) {
                                  e.target.value = '';
                                  return;
                                }
                                setSubcategoriasDraft((prev) => prev.map(
                                  (item, itemIndex) => itemIndex === index
                                    ? {
                                        ...item,
                                        mediaFile: media.file,
                                        mediaDuration: media.duracion,
                                      }
                                    : item,
                                ));
                              })();
                            }}
                          />
                          {subcategoria.mediaFile && (
                            <p className="text-xs text-muted-foreground">
                              {subcategoria.mediaFile.name}
                              {typeof subcategoria.mediaDuration === 'number'
                                ? ` | ${subcategoria.mediaDuration.toFixed(1)} seg`
                                : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(categoryCreateMode === 'subcategory' || categoriaPadreSeleccionadaId === '__new__') && (
            <div className="space-y-2">
              <Label htmlFor="categoria-media">
                {categoryCreateMode === 'subcategory'
                  ? 'Imagen o video de la subcategoría (máx. 10 s)'
                  : 'Imagen o video de la categoría padre (máx. 10 s)'}
              </Label>
              <Input
                id="categoria-media"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={(e) => { void onCategoryMediaFileChange(e.target.files?.[0]); }}
              />
              {categoryMediaFile && (
                <p className="text-xs text-muted-foreground">
                  {categoryMediaFile.name}
                  {typeof categoryMediaDuration === 'number'
                    ? ` | ${categoryMediaDuration.toFixed(1)} seg`
                    : ''}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Se muestra en la tarjeta del home. JPG, PNG, WEBP, GIF o MP4/WEBM/MOV.
              </p>
            </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeCategoryDialog}>Cancelar</Button>
            <Button onClick={() => { void onCreateCategory(); }} disabled={categorySaving}>
              {categorySaving
                ? 'Guardando...'
                : categoryCreateMode === 'subcategory'
                  ? 'Crear Subcategoría'
                  : categoriaPadreSeleccionadaId === '__new__'
                    ? 'Crear Categoría Padre'
                    : 'Guardar Subcategorías'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openTypeDialog} onOpenChange={(open) => (open ? setOpenTypeDialog(true) : closeTypeDialog())}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto overscroll-contain p-3 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6 lg:w-[min(768px,calc(100vw-3rem))]">
          <DialogHeader>
            <DialogTitle>Parametrizar Tipos de Producto</DialogTitle>
            <DialogDescription>Consulta, crea, edita o desactiva los tipos disponibles.</DialogDescription>
          </DialogHeader>

          <div className="max-h-56 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposProducto.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No hay tipos parametrizados.
                    </TableCell>
                  </TableRow>
                ) : tiposProducto.map((tipo) => (
                  <TableRow key={backendId(tipo)}>
                    <TableCell className="font-medium">{tipo.nombre}</TableCell>
                    <TableCell>{tipo.codigo}</TableCell>
                    <TableCell>{tipo.descripcion || 'Sin descripción'}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <GovernedButton
                        id={`btn-editar-tipo-producto-${backendId(tipo)}`}
                        actionId={PRODUCT_ACTION_IDS.UPDATE_PRODUCT_TYPE}
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => editarTipoProducto(tipo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </GovernedButton>
                      <GovernedButton
                        id={`btn-desactivar-tipo-producto-${backendId(tipo)}`}
                        actionId={PRODUCT_ACTION_IDS.DELETE_PRODUCT_TYPE}
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => { void eliminarTipoProducto(tipo); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </GovernedButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">{tipoEditandoId ? 'Editar tipo' : 'Crear tipo'}</h3>
            <div className="space-y-2">
              <Label htmlFor="tipo-nombre">Nombre</Label>
              <Input
                id="tipo-nombre"
                value={typeForm.nombre || ''}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: BONO"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-codigo">Codigo</Label>
              <Input
                id="tipo-codigo"
                value={typeForm.codigo || ''}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                placeholder="Se genera desde el nombre si lo dejas vacio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-descripcion">Descripcion</Label>
              <Textarea
                id="tipo-descripcion"
                value={typeForm.descripcion || ''}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                rows={3}
                placeholder="Descripcion opcional del tipo"
              />
            </div>
          </div>

          <DialogFooter>
            {tipoEditandoId && (
              <Button id="btn-cancelar-edicion-tipo-producto" variant="outline" onClick={() => {
                setTipoEditandoId(null);
                setTypeForm({ nombre: '', codigo: '', descripcion: '' });
              }}>
                Cancelar edición
              </Button>
            )}
            <Button id="btn-cerrar-crud-tipos-producto" variant="outline" onClick={closeTypeDialog}>Cerrar</Button>
            <GovernedButton
              id={tipoEditandoId ? 'btn-guardar-tipo-producto' : 'btn-crear-tipo-producto'}
              actionId={tipoEditandoId
                ? PRODUCT_ACTION_IDS.UPDATE_PRODUCT_TYPE
                : PRODUCT_ACTION_IDS.CREATE_PRODUCT_TYPE}
              onClick={() => { void onCreateType(); }}
              disabled={typeSaving}
            >
              {typeSaving ? 'Guardando...' : tipoEditandoId ? 'Guardar cambios' : 'Crear Tipo'}
            </GovernedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReglasVentasModal
        open={openReglasVentasModal}
        onOpenChange={setOpenReglasVentasModal}
        onChanged={() => {
          setTiposReglaVentaRefreshKey((k) => k + 1);
          void loadData();
        }}
      />

      <ConfigCatalogoProductosModal
        open={openCatalogoConfigModal}
        onOpenChange={setOpenCatalogoConfigModal}
        onSaved={() => { void reloadLimitesCatalogo(); }}
      />

      <VentaWompiSecuenciaModal
        open={openVentaWompiSecuenciaModal}
        onOpenChange={setOpenVentaWompiSecuenciaModal}
      />

      <AlcanceReglasProductosModal
        open={openAlcanceReglasModal}
        onOpenChange={setOpenAlcanceReglasModal}
        onSaved={() => { void loadData(); }}
      />

      <ReglasContablesModal
        open={openReglasContablesModal}
        onOpenChange={setOpenReglasContablesModal}
        onReglasActualizadas={() => { void loadData(); }}
      />
    </div>
  );
}
