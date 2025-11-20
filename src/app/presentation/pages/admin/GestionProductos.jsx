import { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea'; // Componente Textarea para la descripción
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

// Lucide icons
import { Pencil, Trash2, Search, Plus, Eye, ImageUp, DollarSign } from 'lucide-react';

export default function GestionProductos() {
    const [query, setQuery] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [dialogType, setDialogType] = useState('view'); // 'view', 'edit', 'delete'
    const [productos, setProductos] = useState([
        { id: '#MAC001', imagen: 'https://mac-cosmetics.imgix.net/images/products/2x/mac_sku_M2LP01_1x1_0.jpg', nombre: 'Labial MAC Retro Matte', categoria: 'Labiales', marca: 'MAC', precio: 19.00, publicado: true, descripcion: 'Labial de larga duración con acabado mate' },
        { id: '#NYX002', imagen: 'https://www.nyxcosmetics.com/dw/image/v2/AANG_PRD/on/demandware.static/-/Sites-cpd-nyxusa-master-catalog/default/dwd5e25f68/ProductImages/2016/Face/Total_Control_Drop_Foundation/800897068936_totalcontroldropfoundation_pale_main.jpg', nombre: 'Base Total Control', categoria: 'Base de Maquillaje', marca: 'NYX', precio: 15.00, publicado: true, descripcion: 'Base líquida de cobertura buildable' },
        { id: '#FEN003', imagen: 'https://www.sephora.com/productimages/sku/s2518959-main-zoom.jpg', nombre: 'Gloss Bomb Universal', categoria: 'Brillos', marca: 'Fenty Beauty', precio: 20.00, publicado: false, descripcion: 'Brillo labial con acabado brillante' },
        { id: '#MAY004', imagen: 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/products/eye-makeup/mascara/sky-high-washable-mascara/super-black/sky-high-mascara-super-black-041554602302-primary.jpg', nombre: 'Máscara Sky High', categoria: 'Ojos', marca: 'Maybelline', precio: 12.99, publicado: true, descripcion: 'Máscara de pestañas de alto impacto' },
    ]);

    // Lógica para mantener los datos del producto durante la edición
    const [editFormData, setEditFormData] = useState(null);

    // Sincronizar el producto seleccionado al abrir el diálogo de edición
    const startEdit = (producto) => {
        setEditFormData({ ...producto, imagenPreview: producto.imagen });
        setDialogType('edit');
        setOpenDialog(true);
    };

    // Funciones para manejar acciones
    const handleView = (producto) => {
        setSelectedProduct(producto);
        setDialogType('view');
        setOpenDialog(true);
    };

    const handleAdd = () => {
        setEditFormData({
            id: '#' + Math.random().toString(16).slice(2, 10),
            imagen: '',
            nombre: '',
            categoria: '',
            marca: '',
            precio: 0,
            publicado: false,
            descripcion: '',
            imagenPreview: null // Usaremos esto para la previsualización local
        });
        setDialogType('add');
        setOpenDialog(true);
    };

    const handleDelete = (producto) => {
        setSelectedProduct(producto);
        setDialogType('delete');
        setOpenDialog(true);
    };

    const handlePublish = (id, currentStatus) => {
        setProductos(prev => prev.map(p =>
            p.id === id ? { ...p, publicado: !currentStatus } : p
        ));
        toast.success(`Producto ${currentStatus ? 'despublicado' : 'publicado'} exitosamente`);
    };

    const handleSave = () => {
        if (!editFormData?.nombre.trim() || editFormData?.precio === undefined || editFormData?.precio === null) {
            toast.error('El nombre y el precio del producto son obligatorios.');
            return;
        }

        if (dialogType === 'add') {
            setProductos(prev => [...prev, editFormData]);
            toast.success('Producto creado exitosamente');
        } else {
            setProductos(prev => prev.map(p =>
                p.id === editFormData.id ? editFormData : p
            ));
            toast.success('Producto actualizado exitosamente');
        }
        handleClose();
    };

    const handleConfirmDelete = () => {
        if (selectedProduct) {
            Swal.fire({
                title: '¿Estás seguro?',
                text: "No podrás revertir esta acción",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    setProductos(prev => prev.filter(p => p.id !== selectedProduct.id));
                    toast.success('El producto ha sido eliminado.');
                    handleClose();
                }
            });
        }
    };

    const handleClose = () => {
        setOpenDialog(false);
        setSelectedProduct(null);
        setEditFormData(null);
        setDialogType('view');
    };

    // Manejar la carga de imagen en el diálogo de edición/adición
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditFormData(prev => ({
                    ...prev,
                    imagen: file,
                    imagenPreview: event.target.result // Base64 para la preview
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFormChange = (field, value) => {
        setEditFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };


    const filteredProductos = useMemo(() => productos.filter(
        producto => producto.nombre.toLowerCase().includes(query.toLowerCase()) ||
            producto.categoria.toLowerCase().includes(query.toLowerCase())
    ), [productos, query]);

    // --- Renderizado Condicional del Diálogo ---
    const renderDialogContent = () => {
        if (dialogType === 'delete') {
            return (
                <div className="space-y-4 py-4 text-center">
                    <Trash2 className="h-10 w-10 text-destructive mx-auto" />
                    <p className="text-lg text-muted-foreground">
                        ¿Estás seguro de que quieres eliminar el producto **"{selectedProduct?.nombre}"**?
                    </p>
                    <p className="text-sm text-destructive font-medium">Esta acción no se puede deshacer.</p>
                </div>
            );
        }

        const isView = dialogType === 'view';
        const data = isView ? selectedProduct : editFormData;

        if (!data) return null;

        // Estructura del formulario/vista
        return (
            <div className="py-4 space-y-4">

                {/* Visualización/Carga de Imagen */}
                <div className="space-y-2">
                    <Label>Imagen del Producto</Label>
                    <div
                        className={`w-full h-48 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group transition-all duration-200 ${isView ? 'cursor-default' : 'cursor-pointer hover:border-primary'}`}
                        onClick={() => !isView && document.getElementById('producto-imagen-input').click()}
                    >
                        {data.imagenPreview || data.imagen ? (
                            <>
                                <img
                                    src={data.imagenPreview || data.imagen}
                                    alt={data.nombre}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/200x200/f3f4f6/a3a3a3?text=Error"; }}
                                />
                                {!isView && (
                                    <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-sm font-medium">Cambiar imagen</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <ImageUp className="h-10 w-10 mx-auto mb-1" />
                                <p className="text-sm">Haga clic para subir una imagen</p>
                            </div>
                        )}
                        {!isView && (
                            <input
                                id="producto-imagen-input"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageChange}
                            />
                        )}
                    </div>
                </div>

                {/* Campos de Texto */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input
                            id="nombre"
                            value={data.nombre || ''}
                            onChange={(e) => handleFormChange('nombre', e.target.value)}
                            disabled={isView}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="categoria">Categoría</Label>
                        <Input
                            id="categoria"
                            value={data.categoria || ''}
                            onChange={(e) => handleFormChange('categoria', e.target.value)}
                            disabled={isView}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="marca">Marca</Label>
                        <Input
                            id="marca"
                            value={data.marca || ''}
                            onChange={(e) => handleFormChange('marca', e.target.value)}
                            disabled={isView}
                        />
                    </div>
                    <div className="space-y-2 col-span-2">
                        <Label htmlFor="precio">Precio</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="precio"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-10"
                                value={data.precio || 0}
                                onChange={(e) => handleFormChange('precio', parseFloat(e.target.value) || 0)}
                                disabled={isView}
                            />
                        </div>
                    </div>
                    <div className="space-y-2 col-span-2">
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                            id="descripcion"
                            value={data.descripcion || ''}
                            onChange={(e) => handleFormChange('descripcion', e.target.value)}
                            disabled={isView}
                            rows={4}
                        />
                    </div>
                </div>
            </div>
        );
    };


    return (
        <div className="p-4 md:p-6 lg:p-8"> {/* Reemplaza Box sx={{ p: 3 }} */}

            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Gestión de Productos
                </h1>
                <Button
                    onClick={handleAdd}
                    className="flex items-center gap-2 rounded-lg"
                >
                    <Plus className="h-5 w-5" />
                    Agregar Producto
                </Button>
            </div>

            {/* Buscador */}
            <div className="mb-6 max-w-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        fullWidth
                        placeholder="Buscar producto por nombre o categoría..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10 h-10 rounded-lg shadow-sm"
                    />
                </div>
            </div>

            {/* Tabla de productos */}
            <div className="rounded-lg border shadow-sm overflow-x-auto bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>Nombre</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Marca</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Publicado</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProductos.map((producto) => (
                            <TableRow key={producto.id} className="hover:bg-accent/50">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={producto.imagen}
                                            alt={producto.nombre}
                                            className="w-10 h-10 rounded object-cover border flex-shrink-0"
                                            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/f3f4f6/a3a3a3?text=IMG"; }}
                                        />
                                        <div>
                                            <p className="font-medium text-sm">{producto.nombre}</p>
                                            <p className="text-xs text-muted-foreground">{producto.id}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{producto.categoria}</TableCell>
                                <TableCell>
                                    <img
                                        // Asumiendo que las imágenes de marca están en /public/assets/images/brands/
                                        src={`/assets/images/brands/${producto.marca.toLowerCase()}.png`}
                                        alt={producto.marca}
                                        className="h-6 w-auto object-contain"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/60x24/f3f4f6/a3a3a3?text=Marca"; }}
                                    />
                                </TableCell>
                                <TableCell className="font-semibold text-primary">${producto.precio.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Switch
                                        checked={producto.publicado}
                                        onCheckedChange={() => handlePublish(producto.id, producto.publicado)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary hover:bg-primary/10"
                                        onClick={() => startEdit(producto)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-secondary hover:bg-secondary/10"
                                        onClick={() => handleView(producto)}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(producto)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Paginación simple */}
            <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">&lt;</Button>
                    <Button className="w-10 h-10 rounded-full font-bold" variant="default">1</Button>
                    <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">&gt;</Button>
                </div>
            </div>

            {/* Diálogo para ver/editar/eliminar producto */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === 'add' ? 'Agregar Nuevo Producto' :
                                dialogType === 'edit' ? 'Editar Producto' :
                                    dialogType === 'view' ? 'Detalles del Producto' :
                                        'Eliminar Producto'}
                        </DialogTitle>
                    </DialogHeader>

                    {renderDialogContent()}

                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={handleClose}>
                            {dialogType === 'delete' ? 'Cancelar' : 'Cerrar'}
                        </Button>
                        {dialogType === 'edit' || dialogType === 'add' ? (
                            <Button
                                onClick={handleSave}
                                disabled={!editFormData?.nombre.trim() || editFormData?.precio === undefined || editFormData?.precio === null}
                            >
                                {dialogType === 'add' ? 'Agregar Producto' : 'Guardar Cambios'}
                            </Button>
                        ) : dialogType === 'delete' ? (
                            <Button
                                onClick={handleConfirmDelete}
                                variant="destructive"
                            >
                                Sí, Eliminar
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}