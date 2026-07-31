import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Lucide icons
import { Plus, Edit, Trash2, Loader2, ImageUp, Eye } from 'lucide-react';
import PostsParametrizables from './PostsParametrizables';

interface Publicidad {
    id: string;
    tittle: string;
    subtittle?: string;
    body: string;
    price?: number;
    buttonText?: string;
    buttonLink?: string;
    fileUrl?: string;
    createdAt?: string;
}

interface FormData {
    tittle: string;
    subtittle: string;
    body: string;
    price: string;
    buttonText: string;
    buttonLink: string;
    file: File | null;
    filePreview: string | null;
}

export default function ModalInicio(): React.ReactElement {
    const [publicidades, setPublicidades] = useState<Publicidad[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [dialogType, setDialogType] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedPublicidad, setSelectedPublicidad] = useState<Publicidad | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const [formData, setFormData] = useState<FormData>({
        tittle: '',
        subtittle: '',
        body: '',
        price: '',
        buttonText: '',
        buttonLink: '',
        file: null,
        filePreview: null
    });

    useEffect(() => {
        loadPublicidades();
    }, []);

    const loadPublicidades = async (): Promise<void> => {
        try {
            setLoading(true);
            const data = await apiFetch('/api/parametrizable/listar/todas/post', {
                method: 'GET'
            });
            
            console.log('Publicidades cargadas:', data);
            // El endpoint devuelve { ok, total, publicaciones }
            const publicacionesArray = data.publicaciones || [];
            
            // Mapear el response al formato esperado por el frontend
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const mappedData = publicacionesArray.map((pub: any) => {
                // Construir URL de imagen/video desde el objeto img
                let fileUrl = null;
                if (pub.img) {
                    if (typeof pub.img === 'string') {
                        fileUrl = `${API_BASE_URL}/api/files/${pub.img}`;
                    } else if (pub.img._id) {
                        fileUrl = `${API_BASE_URL}/api/files/${pub.img._id}`;
                    }
                }
                
                return {
                    id: pub.id || pub._id,
                    tittle: pub.tittle,
                    subtittle: pub.subtittle,
                    body: pub.body,
                    price: pub.price,
                    buttonText: pub.buttonText,
                    buttonLink: pub.buttonLink,
                    fileUrl,
                    createdAt: pub.creadoEl || pub.createdAt
                };
            });
            
            setPublicidades(mappedData);
        } catch (error) {
            console.error('Error al cargar publicidades:', error);
            toast.error('Error al cargar las publicidades');
            setPublicidades([]); // Asegurarse de que sea un array vacío en caso de error
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = (): void => {
        setFormData({
            tittle: '',
            subtittle: '',
            body: '',
            price: '',
            buttonText: '',
            buttonLink: '',
            file: null,
            filePreview: null
        });
        setSelectedPublicidad(null);
        setDialogType('add');
        setOpenDialog(true);
    };

    const handleEdit = (publicidad: Publicidad): void => {
        setFormData({
            tittle: publicidad.tittle,
            subtittle: publicidad.subtittle || '',
            body: publicidad.body,
            price: publicidad.price?.toString() || '',
            buttonText: publicidad.buttonText || '',
            buttonLink: publicidad.buttonLink || '',
            file: null,
            filePreview: publicidad.fileUrl || null
        });
        setSelectedPublicidad(publicidad);
        setDialogType('edit');
        setOpenDialog(true);
    };

    const handleView = (publicidad: Publicidad): void => {
        setFormData({
            tittle: publicidad.tittle,
            subtittle: publicidad.subtittle || '',
            body: publicidad.body,
            price: publicidad.price?.toString() || '',
            buttonText: publicidad.buttonText || '',
            buttonLink: publicidad.buttonLink || '',
            file: null,
            filePreview: publicidad.fileUrl || null
        });
        setSelectedPublicidad(publicidad);
        setDialogType('view');
        setOpenDialog(true);
    };

    const handleDelete = async (publicidad: Publicidad): Promise<void> => {
        if (!window.confirm('¿Estás seguro de eliminar esta publicidad?')) {
            return;
        }

        try {
            await apiFetch(`/api/parametrizable/eliminar/contenido/${publicidad.id}`, {
                method: 'DELETE'
            });
            
            toast.success('Publicidad eliminada exitosamente');
            loadPublicidades();
        } catch (error) {
            console.error('Error al eliminar publicidad:', error);
            toast.error('Error al eliminar la publicidad');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) {
            // Validar que sea imagen o video
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
            if (!validTypes.includes(file.type)) {
                toast.error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP) o videos (MP4, WEBM)');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>): void => {
                setFormData(prev => ({
                    ...prev,
                    file,
                    filePreview: event.target?.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (field: keyof FormData, value: string): void => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        // Validaciones
        if (!formData.tittle.trim()) {
            toast.error('El título es obligatorio');
            return;
        }

        if (!formData.body.trim()) {
            toast.error('El cuerpo es obligatorio');
            return;
        }

        if (dialogType === 'add' && !formData.file) {
            toast.error('Debe seleccionar una imagen o video');
            return;
        }

        setIsSubmitting(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('tittle', formData.tittle);
            formDataToSend.append('subtittle', formData.subtittle);
            formDataToSend.append('body', formData.body);
            
            if (formData.price) {
                formDataToSend.append('price', formData.price);
            }
            if (formData.buttonText) {
                formDataToSend.append('buttonText', formData.buttonText);
            }
            if (formData.buttonLink) {
                formDataToSend.append('buttonLink', formData.buttonLink);
            }
            if (formData.file) {
                formDataToSend.append('file', formData.file);
            }

            if (dialogType === 'edit' && selectedPublicidad) {
                // Actualizar
                await apiFetch(`/api/parametrizable/actualizar/contenido/post/${selectedPublicidad.id}`, {
                    method: 'PUT',
                    body: formDataToSend
                });
                toast.success('Publicidad actualizada exitosamente');
            } else {
                // Crear
                await apiFetch('/api/parametrizable/guardar/contenido/post', {
                    method: 'POST',
                    body: formDataToSend
                });
                toast.success('Publicidad creada exitosamente');
            }

            setOpenDialog(false);
            loadPublicidades();
        } catch (error: any) {
            console.error('Error al guardar publicidad:', error);
            toast.error(error.message || 'Error al guardar la publicidad');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = (): void => {
        setOpenDialog(false);
        setFormData({
            tittle: '',
            subtittle: '',
            body: '',
            price: '',
            buttonText: '',
            buttonLink: '',
            file: null,
            filePreview: null
        });
        setSelectedPublicidad(null);
    };

    const isView = dialogType === 'view';

    return (
        <Card className="max-w-4xl mx-auto mt-8">
         
            <CardContent>
                {/* Publicidad UI */}
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Modal de Inicio</h1>
                            <p className="text-muted-foreground mt-1">
                                Gestiona las publicidades que aparecen en el modal de inicio
                            </p>
                        </div>
                        <Button onClick={handleAdd} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nueva Publicidad
                        </Button>
                    </div>

                    {/* Card con Tabla */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Publicidades Registradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : publicidades.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>No hay publicidades registradas</p>
                                    <Button onClick={handleAdd} variant="outline" className="mt-4">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear primera publicidad
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Título</TableHead>
                                                <TableHead>Subtítulo</TableHead>
                                                <TableHead>Precio</TableHead>
                                                <TableHead>Botón</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {publicidades.map((publicidad) => (
                                                <TableRow key={publicidad.id}>
                                                    <TableCell className="font-medium">
                                                        {publicidad.tittle}
                                                    </TableCell>
                                                    <TableCell>
                                                        {publicidad.subtittle || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {publicidad.price ? (
                                                            <Badge variant="secondary">
                                                                ${publicidad.price.toLocaleString()}
                                                            </Badge>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {publicidad.buttonText || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleView(publicidad)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(publicidad)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(publicidad)}
                                                                className="text-destructive hover:text-destructive"
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
                            )}
                        </CardContent>
                    </Card>

                    {/* Dialog para Crear/Editar/Ver */}
                    <Dialog open={openDialog} onOpenChange={handleClose}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {isView ? 'Ver Publicidad' : dialogType === 'edit' ? 'Editar Publicidad' : 'Nueva Publicidad'}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleSubmit}>
                                <div className="py-4 space-y-4">
                                    {/* Preview de imagen/video */}
                                    <div className="space-y-2">
                                        <Label>Imagen o Video *</Label>
                                        <div
                                            className={`w-full h-64 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group transition-all duration-200 ${isView ? 'cursor-default' : 'cursor-pointer hover:border-primary'}`}
                                            onClick={() => !isView && document.getElementById('file-input')?.click()}
                                        >
                                            {formData.filePreview ? (
                                                <>
                                                    {formData.file?.type.startsWith('video/') || formData.filePreview.includes('video') ? (
                                                        <video
                                                            src={formData.filePreview}
                                                            className="w-full h-full object-cover"
                                                            controls
                                                        />
                                                    ) : (
                                                        <img
                                                            src={formData.filePreview}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    {!isView && (
                                                        <div className="absolute inset-0 bg-background/80 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-sm font-medium">Cambiar archivo</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-center text-muted-foreground">
                                                    <ImageUp className="h-10 w-10 mx-auto mb-1" />
                                                    <p className="text-sm">Haga clic para subir imagen o video</p>
                                                    <p className="text-xs mt-1">JPEG, PNG, GIF, WEBP, MP4, WEBM</p>
                                                </div>
                                            )}
                                            {!isView && (
                                                <input
                                                    id="file-input"
                                                    type="file"
                                                    accept="image/*,video/*"
                                                    style={{ display: 'none' }}
                                                    onChange={handleFileChange}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Título */}
                                    <div className="space-y-2">
                                        <Label htmlFor="tittle">Título *</Label>
                                        <Input
                                            id="tittle"
                                            value={formData.tittle}
                                            onChange={(e) => handleInputChange('tittle', e.target.value)}
                                            disabled={isView}
                                            placeholder="Ej: Oferta Especial de Verano"
                                        />
                                    </div>

                                    {/* Subtítulo */}
                                    <div className="space-y-2">
                                        <Label htmlFor="subtittle">Subtítulo</Label>
                                        <Input
                                            id="subtittle"
                                            value={formData.subtittle}
                                            onChange={(e) => handleInputChange('subtittle', e.target.value)}
                                            disabled={isView}
                                            placeholder="Ej: Hasta 50% de descuento"
                                        />
                                    </div>

                                    {/* Cuerpo */}
                                    <div className="space-y-2">
                                        <Label htmlFor="body">Descripción *</Label>
                                        <Textarea
                                            id="body"
                                            value={formData.body}
                                            onChange={(e) => handleInputChange('body', e.target.value)}
                                            disabled={isView}
                                            placeholder="Describe el contenido de la publicidad..."
                                            rows={4}
                                        />
                                    </div>

                                    {/* Grid para precio y botón */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Precio */}
                                        <div className="space-y-2">
                                            <Label htmlFor="price">Precio</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) => handleInputChange('price', e.target.value)}
                                                disabled={isView}
                                                placeholder="0"
                                            />
                                        </div>

                                        {/* Texto del Botón */}
                                        <div className="space-y-2">
                                            <Label htmlFor="buttonText">Texto del Botón</Label>
                                            <Input
                                                id="buttonText"
                                                value={formData.buttonText}
                                                onChange={(e) => handleInputChange('buttonText', e.target.value)}
                                                disabled={isView}
                                                placeholder="Ej: Ver Más"
                                            />
                                        </div>
                                    </div>

                                    {/* Link del Botón */}
                                    <div className="space-y-2">
                                        <Label htmlFor="buttonLink">Enlace del Botón</Label>
                                        <Input
                                            id="buttonLink"
                                            type="url"
                                            value={formData.buttonLink}
                                            onChange={(e) => handleInputChange('buttonLink', e.target.value)}
                                            disabled={isView}
                                            placeholder="https://example.com"
                                        />
                                    </div>
                                </div>

                                <DialogFooter className="pt-4 flex justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClose}
                                        disabled={isSubmitting}
                                    >
                                        {isView ? 'Cerrar' : 'Cancelar'}
                                    </Button>
                                    {!isView && (
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                dialogType === 'edit' ? 'Actualizar' : 'Crear'
                                            )}
                                        </Button>
                                    )}
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Sección de Posts */}
                <div className="mt-8">
                    <PostsParametrizables />
                </div>
            </CardContent>
        </Card>
    );
}
