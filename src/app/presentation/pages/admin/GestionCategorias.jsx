import { useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Pencil, Trash2, Search, Plus, ImageUp, Check } from 'lucide-react';

export default function GestionCategorias() {
    const [query, setQuery] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [dialogType, setDialogType] = useState('add'); // 'add', 'edit'

    const [categorias, setCategorias] = useState([
        { id: '#ce8d812a', nombre: 'Muñeca bebé', imagen: '/assets/images/categories/muneca.png', nivel: 1, destacado: false },
        { id: '#4c9681ac', nombre: 'Regalo de cumpleaños', imagen: '/assets/images/categories/regalo-cumple.png', nivel: 1, destacado: true },
        { id: '#f7b1da64', nombre: 'Cosméticos', imagen: '/assets/images/categories/cosmeticos.png', nivel: 1, destacado: true },
        { id: '#c8305a8a', nombre: 'Regalo de pareja', imagen: '/assets/images/categories/regalo-pareja.png', nivel: 1, destacado: true },
        { id: '#e6d2c2e3', nombre: 'Aparatos', imagen: '/assets/images/categories/aparatos.png', nivel: 1, destacado: true },
        { id: '#96c813a8', nombre: 'Moda masculina', imagen: '/assets/images/categories/moda-masculina.png', nivel: 1, destacado: true },
        { id: '#76f4a1dd', nombre: 'Moda femenina', imagen: '/assets/images/categories/moda-femenina.png', nivel: 1, destacado: false }
    ]);

    // Funciones para manejar acciones
    const handleAdd = () => {
        setSelectedCategory({
            id: '#' + Math.random().toString(16).slice(2, 10),
            nombre: '',
            imagen: '',
            nivel: 1,
            destacado: false,
            imagenPreview: null // Usaremos esto para la previsualización local
        });
        setDialogType('add');
        setOpenDialog(true);
    };

    const handleEdit = (categoria) => {
        setSelectedCategory({ ...categoria, imagenPreview: categoria.imagen });
        setDialogType('edit');
        setOpenDialog(true);
    };

    const handleDelete = (categoria) => {
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
                setCategorias(prev => prev.filter(c => c.id !== categoria.id));
                Swal.fire(
                    '¡Eliminado!',
                    'La categoría ha sido eliminada.',
                    'success'
                );
            }
        });
    };

    const handleToggleDestacado = (id, currentStatus) => {
        setCategorias(prev => prev.map(c =>
            c.id === id ? { ...c, destacado: !currentStatus } : c
        ));
        toast.success(`Categoría ${currentStatus ? 'removida de' : 'marcada como'} destacada`);
    };

    const handleSave = () => {
        if (!selectedCategory?.nombre.trim()) {
            toast.error('El nombre de la categoría es obligatorio.');
            return;
        }

        if (dialogType === 'add') {
            setCategorias(prev => [...prev, selectedCategory]);
            toast.success('Categoría creada exitosamente');
        } else {
            setCategorias(prev => prev.map(c =>
                c.id === selectedCategory.id ? selectedCategory : c
            ));
            toast.success('Categoría actualizada exitosamente');
        }
        setOpenDialog(false);
    };

    const handleClose = () => {
        setOpenDialog(false);
        setSelectedCategory(null);
    };

    // Manejar la carga de imagen en el diálogo
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSelectedCategory(prev => ({
                    ...prev,
                    imagen: file, // Guardamos el objeto File (si la API lo requiere)
                    imagenPreview: event.target.result // Guardamos el base64 para la preview
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const filteredCategorias = categorias.filter(
        categoria => categoria.nombre.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="p-4 md:p-6 lg:p-8"> {/* Reemplaza Box sx={{ p: 3 }} */}

            {/* Header y Botón de Acción */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Gestión de Categorías
                </h1>
                <Button
                    onClick={handleAdd}
                    className="flex items-center gap-2 rounded-lg"
                >
                    <Plus className="h-5 w-5" />
                    Agregar Categoría
                </Button>
            </div>

            {/* Buscador */}
            <div className="mb-6 max-w-lg">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        fullWidth
                        placeholder="Buscar categoría por nombre..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10 h-10 rounded-lg shadow-sm"
                    />
                </div>
            </div>

            {/* Tabla de categorías - Reemplaza TableContainer y Paper */}
            <div className="rounded-lg border shadow-sm overflow-x-auto bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Imagen</TableHead>
                            <TableHead>Nivel</TableHead>
                            <TableHead>Destacado</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCategorias.map((categoria) => (
                            <TableRow key={categoria.id} className="hover:bg-accent/50">
                                <TableCell className="font-mono text-xs text-muted-foreground">{categoria.id}</TableCell>
                                <TableCell className="font-medium">{categoria.nombre}</TableCell>
                                <TableCell>
                                    <img
                                        src={categoria.imagen}
                                        alt={categoria.nombre}
                                        className="w-10 h-10 rounded object-cover border"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/f3f4f6/a3a3a3?text=N/A"; }}
                                    />
                                </TableCell>
                                <TableCell>{categoria.nivel}</TableCell>
                                <TableCell>
                                    <Switch
                                        checked={categoria.destacado}
                                        onCheckedChange={() => handleToggleDestacado(categoria.id, categoria.destacado)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary hover:bg-primary/10"
                                        onClick={() => handleEdit(categoria)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(categoria)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Paginación simple (Mantenemos la estructura) */}
            <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">&lt;</Button>
                    <Button className="w-10 h-10 rounded-full" variant="default">1</Button>
                    <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">&gt;</Button>
                </div>
            </div>

            {/* Diálogo para agregar/editar categoría - Reemplaza MUI Dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="sm:max-w-md"> {/* sm:max-w-md reemplaza maxWidth="sm" */}
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === 'add' ? 'Agregar Nueva Categoría' : 'Editar Categoría'}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Formulario del Diálogo */}
                    <div className="py-4 space-y-4">
                        {/* Carga de Imagen */}
                        <div className="space-y-2">
                            <Label htmlFor="categoria-imagen">Imagen de la Categoría</Label>
                            <div
                                className="w-full h-48 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
                                onClick={() => document.getElementById('categoria-imagen-input').click()}
                            >
                                {selectedCategory?.imagenPreview ? (
                                    <>
                                        <img
                                            src={selectedCategory.imagenPreview}
                                            alt={selectedCategory.nombre}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-sm font-medium">Cambiar imagen</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <ImageUp className="h-10 w-10 mx-auto mb-1" />
                                        <p className="text-sm">Haga clic para subir una imagen</p>
                                    </div>
                                )}
                                <input
                                    id="categoria-imagen-input"
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleImageChange}
                                />
                            </div>
                        </div>

                        {/* Campo Nombre */}
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre</Label>
                            <Input
                                id="nombre"
                                value={selectedCategory?.nombre || ''}
                                onChange={(e) => setSelectedCategory(prev => ({
                                    ...prev,
                                    nombre: e.target.value
                                }))}
                            />
                        </div>

                        {/* Campo Nivel */}
                        <div className="space-y-2">
                            <Label htmlFor="nivel">Nivel</Label>
                            <Input
                                id="nivel"
                                type="number"
                                value={selectedCategory?.nivel || 1}
                                onChange={(e) => setSelectedCategory(prev => ({
                                    ...prev,
                                    nivel: parseInt(e.target.value) || 1 // Aseguramos que sea número
                                }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                        <Button
                            onClick={handleSave}
                            disabled={!selectedCategory?.nombre.trim()}
                        >
                            {dialogType === 'add' ? 'Agregar' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}