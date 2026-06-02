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
} from '@/app/services/productosService';
import inventarioService, { type InventarioUnidadMedida, type StockActualItem } from '@/app/services/inventarioService';
import reglasContablesService, { type ReglaContable } from '@/app/services/reglasContablesService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Eye, FolderTree, Pencil, Plus, RefreshCw, Search, Star, Trash2 } from 'lucide-react';

type DialogType = 'add' | 'edit' | 'view' | 'delete';

interface ProductRow {
  id: string;
  sku: string;
  nombre: string;
  categoriaId: string;
  categoria: string;
  tipo: string;
  moneda: string;
  precio: number;
  unidadMedida: string;
  stockMinimo: number;
  cantidadColoresRender: number;
  coloresPermitidos: Array<{ nombre: string; valor: string }>;
  reglasContables: Array<{ codigo: string; aplica?: boolean; reglaContableId?: string | null }>;
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

const mapProduct = (producto: BackendProducto): ProductRow => {
  const origen = productoOrigenRelacion(producto);
  return {
    id: backendId(producto),
    sku: String(origen?.sku || producto.sku || ''),
    nombre: String(producto.nombre || origen?.nombre || ''),
    categoriaId: categoriaId(producto.categoria || origen?.categoria),
    categoria: categoriaLabel(producto.categoria || origen?.categoria),
    tipo: String(producto.tipo || origen?.tipo || 'PRODUCTO'),
    moneda: String(producto.moneda || origen?.moneda || 'COP'),
    precio: Number(producto.precio || origen?.precio || 0),
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
    productoVentaRelacionId: backendId(producto.productoVentaRelacion),
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
  precio: Number(product.precio || 0),
  moneda: product.moneda || 'COP',
  tipo: product.tipo,
  unidadMedida: product.unidadMedida || 'UNIDAD',
  stockMinimo: Math.max(0, Number(product.stockMinimo) || 0),
  categoria: product.categoriaId || null,
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
});

const EMPTY_PRODUCT: ProductRow = {
  id: '',
  sku: '',
  nombre: '',
  categoriaId: '',
  categoria: '',
  tipo: '',
  moneda: 'COP',
  precio: 0,
  unidadMedida: 'UNIDAD',
  stockMinimo: 0,
  cantidadColoresRender: 0,
  coloresPermitidos: [],
  reglasContables: [],
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
  const [stockKardex, setStockKardex] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductRow>(EMPTY_PRODUCT);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaDuration, setMediaDuration] = useState<number | undefined>(undefined);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMediaFile, setCategoryMediaFile] = useState<File | null>(null);
  const [categoryMediaDuration, setCategoryMediaDuration] = useState<number | undefined>(undefined);
  const [typeSaving, setTypeSaving] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoriaPayload>({
    nombre: '',
    descripcion: '',
    padre: null,
  });
  const [typeForm, setTypeForm] = useState<TipoProductoPayload>({
    nombre: '',
    codigo: '',
    descripcion: '',
  });

  const loadData = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const [productosResp, productosCatalogoResp, categoriasResp, tiposResp, unidadesResp, stockActualResp, reglasResp] = await Promise.all([
        productosService.listarProductosVentasAdmin(),
        productosService.listarProductosAdmin(),
        productosService.listarCategorias(),
        productosService.listarTiposProducto(),
        inventarioService.listarUnidadesMedida(),
        inventarioService.stockActual(),
        reglasContablesService.listarActivas(),
      ]);
      setProductos(productosResp.map(mapProduct));
      setProductosCatalogo(productosCatalogoResp.map(mapProduct));
      setCategorias(categoriasResp);
      setTiposProducto(tiposPersistidosUnicos(tiposResp));
      setUnidadesMedida(unidadesResp);
      setReglasContables(reglasResp);
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
  const reglaAplicaCategoria = (regla: ReglaContable, categoriaId: string): boolean => {
    const categorias = (regla.categoriasAplicacion || []).map((categoria) => String(categoria));
    return categorias.length === 0 || (!!categoriaId && categorias.includes(categoriaId));
  };

  const reglasMasivasProducto = (categoriaId = ''): ProductRow['reglasContables'] =>
    reglasContables
      .filter((regla) => regla.aplicaEnCarrito === true && regla.estado !== false && reglaAplicaCategoria(regla, categoriaId))
      .map((regla) => ({ codigo: String(regla.codigo || '').toUpperCase(), aplica: true }));

  const productosConSku = useMemo(
    () => productosCatalogo
      .filter((producto) => producto.sku.trim() && obtenerStockKardexSku(producto.sku) > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [productosCatalogo, stockKardex],
  );

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
        if (!q) return true;
        return (
          String(categoria.nombre || '').toLowerCase().includes(q)
          || String(categoria.descripcion || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
  }, [categorias, categoryQuery]);

  const closeDialog = (): void => {
    setOpenDialog(false);
    setSelected(null);
    setForm(EMPTY_PRODUCT);
    setMediaFile(null);
    setMediaDuration(undefined);
    setDialogType('view');
  };

  const closeCategoryDialog = (): void => {
    setOpenCategoryDialog(false);
    setCategoryForm({
      nombre: '',
      descripcion: '',
      padre: null,
    });
    setCategoryMediaFile(null);
    setCategoryMediaDuration(undefined);
  };

  const onCategoryMediaFileChange = async (file?: File): Promise<void> => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Selecciona una imagen o un video.');
      return;
    }
    if (isVideo) {
      try {
        const duration = await readVideoDuration(file);
        if (duration > 10) {
          toast.error('El video de la categoría debe durar máximo 10 segundos.');
          return;
        }
        setCategoryMediaDuration(duration);
      } catch (error) {
        toast.error(errorMessage(error, 'No se pudo validar la duración del video.'));
        return;
      }
    } else {
      setCategoryMediaDuration(undefined);
    }
    setCategoryMediaFile(file);
  };

  const closeTypeDialog = (): void => {
    setOpenTypeDialog(false);
    setTypeForm({
      nombre: '',
      codigo: '',
      descripcion: '',
    });
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
      tipo: producto.tipo,
      moneda: producto.moneda,
      precio: producto.precio,
      unidadMedida: producto.unidadMedida,
      stockMinimo: producto.stockMinimo,
      cantidadColoresRender: producto.cantidadColoresRender,
      coloresPermitidos: syncColoresPermitidos(producto.cantidadColoresRender, producto.coloresPermitidos),
      reglasContables: producto.reglasContables.length ? producto.reglasContables : reglasMasivasProducto(producto.categoriaId),
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

  const onImageFileChange = async (file?: File): Promise<void> => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Selecciona una imagen o un video.');
      return;
    }

    if (isVideo) {
      try {
        const duration = await readVideoDuration(file);
        if (duration > 30) {
          toast.error('El video debe durar maximo 30 segundos.');
          return;
        }
        setMediaDuration(duration);
      } catch (error) {
        toast.error(errorMessage(error, 'No se pudo validar la duracion del video.'));
        return;
      }
    } else {
      setMediaDuration(undefined);
      setForm((prev) => ({ ...prev, imagen: URL.createObjectURL(file) }));
    }

    setMediaFile(file);
    toast.success(isVideo ? 'Video listo para subir al guardar.' : 'Imagen lista para subir al guardar.');
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
    setForm({ ...EMPTY_PRODUCT, reglasContables: reglasMasivasProducto() });
    setMediaFile(null);
    setMediaDuration(undefined);
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

  const openEdit = (producto: ProductRow): void => {
    setForm(producto);
    setMediaFile(null);
    setMediaDuration(undefined);
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
    if (!form.nombre.trim() || !form.precio) {
      toast.error('Nombre y precio son obligatorios.');
      return;
    }
    if (!form.tipo.trim()) {
      toast.error('Selecciona o crea un tipo de producto.');
      return;
    }

    try {
      setSaving(true);
      if (dialogType === 'add') {
        const created = await productosService.crearProductoAdmin(toPayload(form));
        const createdRow = mapProduct(created);
        if (mediaFile && createdRow.productoVentaRelacionId) {
          await productosService.subirMediaProductoVenta(createdRow.productoVentaRelacionId, mediaFile, mediaDuration);
        }
        setProductos((prev) => [createdRow, ...prev]);
        toast.success('Producto creado exitosamente');
      } else {
        const updated = await productosService.actualizarProductoAdmin(form.id, toPayload(form));
        const updatedRow = mapProduct(updated);
        if (mediaFile && updatedRow.productoVentaRelacionId) {
          await productosService.subirMediaProductoVenta(updatedRow.productoVentaRelacionId, mediaFile, mediaDuration);
        }
        setProductos((prev) => prev.map((item) => item.id === form.id ? updatedRow : item));
        toast.success('Producto actualizado exitosamente');
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
      const nextCategorias = [...categorias, createdWithMedia].sort((a, b) =>
        String(a.nombre || '').localeCompare(String(b.nombre || ''))
      );
      setCategorias(nextCategorias);
      setForm((prev) => ({ ...prev, categoriaId: backendId(created), categoria: created.nombre }));
      toast.success('Categoría creada correctamente');
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
      const created = await productosService.crearTipoProducto({
        nombre: typeForm.nombre,
        codigo: typeForm.codigo || undefined,
        descripcion: typeForm.descripcion || '',
      });
      const nextTipos = tiposPersistidosUnicos([...tiposProducto, created])
        .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
      setTiposProducto(nextTipos);
      setForm((prev) => ({ ...prev, tipo: created.nombre }));
      toast.success('Tipo de producto creado correctamente');
      closeTypeDialog();
    } catch (error) {
      console.error('Error creando tipo de producto:', error);
      toast.error(errorMessage(error, 'No se pudo crear el tipo de producto.'));
    } finally {
      setTypeSaving(false);
    }
  };

  const current = dialogType === 'view' ? selected : form;

  const onSyncCollection = async (): Promise<void> => {
    const ok = await loadData();
    if (ok) toast.success('Productos sincronizados desde la coleccion.');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Gestión de Productos</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => { void onSyncCollection(); }}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button variant="outline" onClick={() => setOpenCategoriesListDialog(true)} className="flex items-center gap-2 rounded-lg">
            <FolderTree className="h-4 w-4" />
            Ver Categorias
          </Button>
          <Button variant="outline" onClick={() => setOpenCategoryDialog(true)} className="rounded-lg">
            Crear Categoría
          </Button>
          <Button onClick={openAdd} className="flex items-center gap-2 rounded-lg">
            <Plus className="h-5 w-5" />
            Agregar Producto
          </Button>
        </div>
      </div>

      <div className="mb-6 max-w-xl">
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
        <Table>
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
                <TableCell className="font-semibold text-primary">${producto.precio.toFixed(2)} {producto.moneda}</TableCell>
                <TableCell>
                  <Switch checked={producto.destacado} onCheckedChange={() => { void onToggleDestacado(producto); }} />
                </TableCell>
                <TableCell>
                  <Switch checked={producto.publicado} onCheckedChange={() => { void onTogglePublished(producto); }} />
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => openEdit(producto)}>
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
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1280px)]">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>
              {dialogType === 'add' ? 'Agregar Nuevo Producto' : dialogType === 'edit' ? 'Editar Producto' : dialogType === 'view' ? 'Detalle del Producto' : 'Desactivar Producto'}
            </DialogTitle>
          </DialogHeader>

          {dialogType === 'delete' ? (
            <div className="space-y-2 px-6 py-6 text-center text-sm text-muted-foreground">
              <p>¿Seguro que deseas desactivar "{selected?.nombre}"?</p>
            </div>
          ) : current ? (
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-6 py-4">
              <div className="flex min-w-[1040px] flex-row flex-nowrap items-start gap-5">
                {/* Columna 1: identificación y catálogo */}
                <section className="flex w-[min(280px,28%)] shrink-0 flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" value={current.nombre} disabled={dialogType === 'view'} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">Producto</Label>
                  {dialogType === 'view' ? (
                    <Input id="sku" value={current.sku} disabled />
                  ) : (
                    <select
                      id="sku"
                      value={form.sku}
                      onChange={(e) => onSelectProductSku(e.target.value)}
                      disabled={productosConSku.length === 0}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">
                        {productosConSku.length > 0 ? 'Selecciona producto' : 'No hay productos con stock disponible'}
                      </option>
                      {productosConSku.map((producto) => (
                        <option key={producto.id} value={producto.sku}>
                          {producto.nombre} | Stock {obtenerStockKardexSku(producto.sku).toLocaleString('es-CO')}
                        </option>
                      ))}
                    </select>
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
                  <Label htmlFor="categoria">Categoría</Label>
                  {dialogType === 'view' ? (
                    <Input id="categoria" value={current.categoria} disabled />
                  ) : (
                    <select
                      id="categoria"
                      value={form.categoriaId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const categoria = categorias.find((item) => backendId(item) === id);
                        setForm((prev) => ({ ...prev, categoriaId: id, categoria: categoria?.nombre || '' }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map((categoria) => (
                        <option key={backendId(categoria)} value={backendId(categoria)}>{categoria.nombre}</option>
                      ))}
                    </select>
                  )}
                  {dialogType !== 'view' && (
                    <button
                      type="button"
                      className="text-xs text-primary underline underline-offset-4"
                      onClick={() => setOpenCategoryDialog(true)}
                    >
                      Crear categoría nueva
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="precio" type="number" className="pl-10" value={current.precio} disabled={dialogType === 'view'} onChange={(e) => setForm((prev) => ({ ...prev, precio: Number(e.target.value || 0) }))} />
                  </div>
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
                <section className="flex w-[min(280px,28%)] shrink-0 flex-col gap-4">
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
                <section className="flex w-[min(300px,30%)] shrink-0 flex-col gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="imagenProducto">Imagen o video corto del producto</Label>
                  <div className="flex flex-col gap-3">
                    <img
                      src={current.imagen || PLACEHOLDER}
                      alt={current.nombre || 'Producto'}
                      className="h-24 w-24 rounded-md border object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = PLACEHOLDER;
                      }}
                    />
                    <div className="space-y-2">
                      <Input
                        id="imagenProducto"
                        value={current.imagen === PLACEHOLDER ? '' : current.imagen}
                        disabled={dialogType === 'view'}
                        onChange={(e) => setForm((prev) => ({ ...prev, imagen: e.target.value || PLACEHOLDER }))}
                        placeholder="URL de imagen del producto"
                      />
                      {dialogType !== 'view' && (
                        <Input
                          type="file"
                          accept="image/*,video/mp4,video/webm,video/quicktime"
                          onChange={(e) => { void onImageFileChange(e.target.files?.[0]); }}
                        />
                      )}
                      {mediaFile && (
                        <p className="text-xs text-muted-foreground">
                          {mediaFile.name}
                          {typeof mediaDuration === 'number' ? ` | ${mediaDuration.toFixed(1)} seg` : ''}
                        </p>
                      )}
                      {current.media?.some((item) => item.tipo === 'video') && (
                        <div className="space-y-1">
                          {current.media.filter((item) => item.tipo === 'video').map((item) => (
                            <video key={item.iud || item._id || item.url} src={mediaSrc(item.url)} controls className="max-h-32 w-full rounded border" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </section>

                {/* Columna 4: opciones y descripción */}
                <section className="flex min-w-[220px] flex-1 flex-col gap-4">
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
                    className="min-h-[140px] flex-1 resize-y"
                    onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  />
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

      <Dialog open={openCategoriesListDialog} onOpenChange={setOpenCategoriesListDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Categorias creadas</DialogTitle>
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descripcion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategorias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No hay categorias para mostrar.
                      </TableCell>
                    </TableRow>
                  ) : filteredCategorias.map((categoria) => (
                    <TableRow key={backendId(categoria)}>
                      <TableCell className="font-medium">{categoria.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Nivel {Number(categoria.nivel || 1)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={categoria.estado ? 'secondary' : 'outline'}>
                          {categoria.estado ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {categoria.descripcion || 'Sin descripcion'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCategoriesListDialog(false)}>Cerrar</Button>
            <Button onClick={() => setOpenCategoryDialog(true)}>Crear Categoria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCategoryDialog} onOpenChange={(open) => (open ? setOpenCategoryDialog(true) : closeCategoryDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Categoría</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoria-nombre">Nombre</Label>
              <Input
                id="categoria-nombre"
                value={categoryForm.nombre || ''}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: LABIALES"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria-padre">Categoría padre</Label>
              <select
                id="categoria-padre"
                value={categoryForm.padre || ''}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, padre: e.target.value || null }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sin categoría padre</option>
                {categorias
                  .filter((categoria) => Number(categoria.nivel) === 1)
                  .map((categoria) => (
                    <option key={backendId(categoria)} value={backendId(categoria)}>
                      {categoria.nombre}
                    </option>
                  ))}
              </select>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="categoria-media">Imagen o video (máx. 10 s)</Label>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeCategoryDialog}>Cancelar</Button>
            <Button onClick={() => { void onCreateCategory(); }} disabled={categorySaving}>
              {categorySaving ? 'Guardando...' : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openTypeDialog} onOpenChange={(open) => (open ? setOpenTypeDialog(true) : closeTypeDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Tipo de Producto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
            <Button variant="outline" onClick={closeTypeDialog}>Cancelar</Button>
            <Button onClick={() => { void onCreateType(); }} disabled={typeSaving}>
              {typeSaving ? 'Guardando...' : 'Crear Tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
