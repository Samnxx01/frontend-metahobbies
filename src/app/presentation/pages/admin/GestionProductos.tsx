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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';

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
  descripcion: string;
  descripcionCorta: string;
  imagen: string;
  publicado: boolean;
  estadoCatalogo: string;
}

const PLACEHOLDER = 'https://placehold.co/80x80/f3f4f6/a3a3a3?text=IMG';

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

const mapProduct = (producto: BackendProducto): ProductRow => ({
  id: backendId(producto),
  sku: String(producto.sku || ''),
  nombre: String(producto.nombre || ''),
  categoriaId: categoriaId(producto.categoria),
  categoria: categoriaLabel(producto.categoria),
  tipo: String(producto.tipo || 'PRODUCTO'),
  moneda: String(producto.moneda || 'COP'),
  precio: Number(producto.precio || 0),
  descripcion: String(producto.descripcion || ''),
  descripcionCorta: String(producto.descripcionCorta || ''),
  imagen: Array.isArray(producto.imagenes) && producto.imagenes[0] ? producto.imagenes[0] : PLACEHOLDER,
  publicado: producto.estadoProducto === true && String(producto.estadoCatalogo || '').toUpperCase() === 'ACTIVO',
  estadoCatalogo: String(producto.estadoCatalogo || 'INACTIVO'),
});

const toPayload = (product: ProductRow): AdminProductoPayload => ({
  nombre: product.nombre,
  sku: product.sku || undefined,
  descripcion: product.descripcion || '',
  descripcionCorta: product.descripcionCorta || '',
  precio: Number(product.precio || 0),
  moneda: product.moneda || 'COP',
  tipo: product.tipo,
  categoria: product.categoriaId || null,
  imagenes: product.imagen && product.imagen !== PLACEHOLDER ? [product.imagen] : [],
  estadoCatalogo: product.publicado ? 'ACTIVO' : 'INACTIVO',
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
  descripcion: '',
  descripcionCorta: '',
  imagen: PLACEHOLDER,
  publicado: false,
  estadoCatalogo: 'INACTIVO',
};

export default function GestionProductos(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('view');
  const [openDialog, setOpenDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [openTypeDialog, setOpenTypeDialog] = useState(false);
  const [productos, setProductos] = useState<ProductRow[]>([]);
  const [categorias, setCategorias] = useState<BackendCategoria[]>([]);
  const [tiposProducto, setTiposProducto] = useState<BackendTipoProducto[]>([]);
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductRow>(EMPTY_PRODUCT);
  const [categorySaving, setCategorySaving] = useState(false);
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

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [productosResp, categoriasResp, tiposResp] = await Promise.all([
        productosService.listarProductosAdmin(),
        productosService.listarCategorias(),
        productosService.listarTiposProducto(),
      ]);
      setProductos(productosResp.map(mapProduct));
      setCategorias(categoriasResp);
      setTiposProducto(tiposPersistidosUnicos(tiposResp));
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error(errorMessage(error, 'No se pudieron cargar los productos.'));
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

  const productosConSku = useMemo(
    () => productos
      .filter((producto) => producto.sku.trim())
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [productos],
  );

  const closeDialog = (): void => {
    setOpenDialog(false);
    setSelected(null);
    setForm(EMPTY_PRODUCT);
    setDialogType('view');
  };

  const closeCategoryDialog = (): void => {
    setOpenCategoryDialog(false);
    setCategoryForm({
      nombre: '',
      descripcion: '',
      padre: null,
    });
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
    const producto = productos.find((item) => item.sku === value);
    if (!producto) {
      setForm((prev) => ({ ...prev, sku: value }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      sku: producto.sku,
      nombre: producto.nombre,
      categoriaId: producto.categoriaId,
      categoria: producto.categoria,
      tipo: producto.tipo,
      moneda: producto.moneda,
      precio: producto.precio,
      descripcion: producto.descripcion,
      descripcionCorta: producto.descripcionCorta,
      imagen: producto.imagen,
      publicado: producto.publicado,
      estadoCatalogo: producto.estadoCatalogo,
    }));
  };

  const openAdd = (): void => {
    setForm(EMPTY_PRODUCT);
    setDialogType('add');
    setOpenDialog(true);
  };

  const openEdit = (producto: ProductRow): void => {
    setForm(producto);
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

  const onSave = async (): Promise<void> => {
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
        setProductos((prev) => [mapProduct(created), ...prev]);
        toast.success('Producto creado exitosamente');
      } else {
        const updated = await productosService.actualizarProductoAdmin(form.id, toPayload(form));
        setProductos((prev) => prev.map((item) => item.id === form.id ? mapProduct(updated) : item));
        toast.success('Producto actualizado exitosamente');
      }
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
      const nextCategorias = [...categorias, created].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
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

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Gestión de Productos</h1>
        <div className="flex items-center gap-2">
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
              <TableHead>Precio</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando productos...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay productos para mostrar.</TableCell>
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
                <TableCell className="font-semibold text-primary">${producto.precio.toFixed(2)} {producto.moneda}</TableCell>
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'add' ? 'Agregar Nuevo Producto' : dialogType === 'edit' ? 'Editar Producto' : dialogType === 'view' ? 'Detalle del Producto' : 'Desactivar Producto'}
            </DialogTitle>
          </DialogHeader>

          {dialogType === 'delete' ? (
            <div className="space-y-2 py-4 text-center text-sm text-muted-foreground">
              <p>¿Seguro que deseas desactivar "{selected?.nombre}"?</p>
            </div>
          ) : current ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" value={current.nombre} disabled={dialogType === 'view'} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">Producto</Label>
                  {dialogType === 'view' ? (
                    <Input id="sku" value={current.sku} disabled />
                  ) : productosConSku.length > 0 ? (
                    <select
                      id="sku"
                      value={form.sku}
                      onChange={(e) => onSelectProductSku(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Selecciona producto</option>
                      {productosConSku.map((producto) => (
                        <option key={producto.id} value={producto.sku}>
                          {producto.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input id="sku" value={current.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} />
                  )}
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
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea id="descripcion" value={current.descripcion} disabled={dialogType === 'view'} rows={4} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{dialogType === 'delete' ? 'Cancelar' : 'Cerrar'}</Button>
            {dialogType === 'add' || dialogType === 'edit' ? (
              <Button onClick={() => { void onSave(); }} disabled={saving}>
                {saving ? 'Guardando...' : dialogType === 'add' ? 'Agregar Producto' : 'Guardar Cambios'}
              </Button>
            ) : dialogType === 'delete' ? (
              <Button variant="destructive" onClick={onDelete}>Sí, desactivar</Button>
            ) : null}
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
