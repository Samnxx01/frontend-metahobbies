import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Importar servicios y providers con la ruta relativa ajustada
import { useAuth } from '../../../providers/AuthProvider';
import { uploadProfileImage, getProfileImageBlobUrl } from '../../../services/clientService';

// Shadcn UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge'; // Añadido para el estado de usuario

// Lucide icons
import { Camera, Mail, Phone, MapPin, Building, Calendar, User, Edit, Save, X, Trash2, ArrowLeft, LogOut, AlertTriangle, Loader2 } from 'lucide-react';


// --- CONSTANTES ---
const PRIMARY_COLOR_CLASS = 'text-primary';
const CHAMPAGNE_BG = 'bg-primary/10';
const CONFIRM_LOGOUT_TITLE = 'Cerrar Sesión';
const CONFIRM_LOGOUT_MESSAGE = '¿Estás seguro de que quieres cerrar tu sesión actual?';

// Datos de usuario de ejemplo (ajustados para el diseño)
const DEFAULT_USER_DATA = {
    name: 'Sofia Alvarez',
    email: 'sofia.alvarez@example.com',
    phone: '+57 310 123 4567',
    address: {
        country: 'Colombia',
        city: 'Bogotá',
        street: 'Calle 123 #45-67',
        zip: '110111',
    },
    // Nota: Reemplazamos la imagen de ejemplo por el valor del usuario auténtico
    memberSince: 'Noviembre 2023',
    role: 'CLIENTE',
};


export default function Perfil() {
    // Aquí se utiliza el user del AuthProvider
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // --- ESTADOS DE GESTIÓN DE UI Y DATOS ---
    const [localUser, setLocalUser] = useState(user || DEFAULT_USER_DATA); // Usamos un estado local inicializado con el usuario real o default
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [tempPersonalData, setTempPersonalData] = useState({ name: localUser.name, email: localUser.email, phone: localUser.phone });
    const [tempAddressData, setTempAddressData] = useState({ ...localUser.address });
    const [activeNavItem, setActiveNavItem] = useState('personal'); // Para la navegación lateral

    // Estados de Foto de Perfil (Mantenidos de tu versión)
    const [openPhotoDialog, setOpenPhotoDialog] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const [profileImageBlobUrl, setProfileImageBlobUrl] = useState(null);
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);


    // Redirección si el usuario no existe (protección de ruta básica)
    if (!user) { navigate('/login'); return null; }

    // Sincronizar localUser con el AuthProvider.user
    useEffect(() => {
        if (user) {
            setLocalUser(prev => ({
                ...prev,
                ...user,
                // Mantener datos dummy si no vienen del user real
                name: user.name || prev.name,
                email: user.email || prev.email,
                phone: user.phone || prev.phone,
            }));
        }
    }, [user]);

    // --- LÓGICA DE CARGA DE IMAGEN DEL SERVIDOR (Tu código de useEffect) ---
    useEffect(() => {
        let isMounted = true;

        const loadImage = async () => {
            if (!user?.id) return;

            setImageLoading(true);
            if (profileImageBlobUrl) URL.revokeObjectURL(profileImageBlobUrl);

            try {
                const blobUrl = await getProfileImageBlobUrl(user.id);
                if (isMounted) setProfileImageBlobUrl(blobUrl);
            } catch (error) {
                setProfileImageBlobUrl(null);
            } finally {
                if (isMounted) setImageLoading(false);
            }
        };

        loadImage();
        return () => {
            isMounted = false;
            if (profileImageBlobUrl && profileImageBlobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageBlobUrl);
            }
        };
    }, [user?.id, cacheBuster]);


    // --- HANDLERS DE EDICIÓN DE DATOS ---

    const handleEditPersonal = () => {
        setTempPersonalData({ name: localUser.name, email: localUser.email, phone: localUser.phone });
        setIsEditingPersonal(true);
    };

    const handleSavePersonal = () => {
        // Lógica para enviar tempPersonalData al backend (usando user.id)
        setLocalUser(prev => ({ ...prev, ...tempPersonalData }));
        setIsEditingPersonal(false);
        toast.success("Información personal actualizada.");
    };

    const handleCancelPersonal = () => {
        setIsEditingPersonal(false);
        setTempPersonalData({});
    };

    const handlePersonalChange = (e) => {
        setTempPersonalData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleEditAddress = () => {
        setTempAddressData({ ...localUser.address });
        setIsEditingAddress(true);
    };

    const handleSaveAddress = () => {
        // Lógica para enviar tempAddressData al backend
        setLocalUser(prev => ({ ...prev, address: tempAddressData }));
        setIsEditingAddress(false);
        toast.success("Dirección de envío actualizada.");
    };

    const handleCancelAddress = () => {
        setIsEditingAddress(false);
        setTempAddressData({});
    };

    const handleAddressChange = (e) => {
        setTempAddressData(prev => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    // --- LOGOUT Y FOTO DE PERFIL (Tu lógica original) ---

    const confirmLogout = () => setOpenConfirmDialog(true);
    const handlePerformLogout = async () => {
        setOpenConfirmDialog(false);
        try {
            await logout();
            toast.success('Sesión cerrada exitosamente.');
            setTimeout(() => navigate('/login'), 500);
        } catch (error) {
            toast.error(error.message || 'Error al cerrar sesión.');
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setPreviewImage(URL.createObjectURL(file));
            setImageFile(file);
            setOpenPhotoDialog(true);
        }
    };

    const handleUploadImage = async () => {
        if (!imageFile || !user?.id) {
            toast.error('Error: No se seleccionó ningún archivo.');
            return;
        }
        setIsUploading(true);
        setOpenPhotoDialog(false);
        const formData = new FormData();
        formData.append('img', imageFile);

        try {
            await uploadProfileImage(user.id, formData);
            setCacheBuster(Date.now()); // Fuerza la recarga del Blob URL
            toast.success('Foto de perfil actualizada.');
        } catch (error) {
            toast.error(error.message || 'Error al subir la imagen.');
        } finally {
            setIsUploading(false);
            setPreviewImage(null);
            setImageFile(null);
        }
    };

    const handleDeletePhoto = () => {
        // En una implementación real, esto llamaría a una API de eliminación
        setLocalUser(prev => ({ ...prev, profileImage: '/assets/images/default_profile.png' }));
        setNewProfileImageFile(null);
        setNewProfileImageUrl(null);
        setIsPhotoDialogOpen(false);
        toast.success("Foto de perfil eliminada.");
    };

    const cancelPhotoUpload = () => {
        setNewProfileImageFile(null);
        setNewProfileImageUrl(localUser.profileImage);
        setIsPhotoDialogOpen(false);
    };

    // --- Componente auxiliar para la navegación ---
    const NavItem = ({ icon: Icon, label, itemKey }) => (
        <Button
            variant={activeNavItem === itemKey ? 'default' : 'ghost'}
            className={`w-full justify-start text-left font-semibold ${activeNavItem === itemKey ? '' : 'text-gray-700 hover:bg-muted'}`}
            onClick={() => setActiveNavItem(itemKey)}
        >
            <Icon className="h-4 w-4 mr-3" />
            {label}
        </Button>
    );

    // --- Componente de Renderizado de Campos ---
    const FieldDisplay = ({ id, name, label, value, readOnly, onChange, type = 'text' }) => (
        <div className="space-y-1">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                name={name}
                type={type}
                value={value}
                readOnly={readOnly}
                onChange={onChange}
                // Estilo para modo lectura (sin borde ni sombra)
                className={readOnly ? "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0" : "text-base"}
            />
        </div>
    );


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-5xl">

                {/* Header del Perfil (Estilo de la Card del diseño) */}
                <Card className="mb-8 p-6 text-center shadow-lg border-none bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
                    <CardContent className="flex flex-col items-center justify-center p-0">
                        <div className="relative mb-4 group">
                            <Avatar className="h-32 w-32 border-4 border-white dark:border-gray-700 shadow-lg">
                                <AvatarImage
                                    src={previewImage || profileImageBlobUrl || undefined}
                                    alt={localUser.name}
                                    onError={(e) => e.target.src = "https://placehold.co/120x120/E8E8E8/5C5C5C?text=U"}
                                />
                                <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                                    {localUser.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>

                            {imageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                                    <Loader2 className={`w-10 h-10 animate-spin text-white`} />
                                </div>
                            )}

                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm 
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                onClick={() => setIsPhotoDialogOpen(true)}
                            >
                                <Camera className="h-4 w-4 text-gray-600" />
                                <span className="sr-only">Cambiar foto</span>
                            </Button>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">{localUser.name}</h1>
                        <p className="text-sm text-gray-500">Miembro desde {localUser.memberSince} • Rol: <Badge variant="secondary">{localUser.role}</Badge></p>
                    </CardContent>
                </Card>

                {/* Contenido Principal: Navegación y Secciones */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Navegación Lateral (1/4) */}
                    <Card className="lg:col-span-1 shadow-sm border">
                        <CardHeader className="pb-3">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-primary mb-2"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver
                            </Button>
                            <Separator />
                        </CardHeader>
                        <CardContent className="space-y-1 p-4">
                            <NavItem icon={User} label="Información Personal" itemKey="personal" />
                            <NavItem icon={MapPin} label="Direcciones de Envío" itemKey="address" />
                            <NavItem icon={Camera} label="Foto de Perfil" itemKey="photo" />
                            <NavItem icon={Building} label="Membresía" itemKey="membership" />
                            <NavItem icon={Calendar} label="Historial de Pedidos" itemKey="history" />
                            <Button
                                variant="destructive"
                                className="w-full justify-start mt-4"
                                onClick={confirmLogout}
                            >
                                <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Secciones de Información (3/4 del ancho) */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* --- Tarjeta de Información Personal --- */}
                        {activeNavItem === 'personal' && (
                            <Card className="shadow-sm border">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                        <User className="h-5 w-5 text-primary" /> Información Personal
                                    </CardTitle>
                                    {!isEditingPersonal ? (
                                        <Button variant="outline" size="sm" onClick={handleEditPersonal}>
                                            <Edit className="h-4 w-4 mr-2" /> Editar
                                        </Button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={handleCancelPersonal}>
                                                <X className="h-4 w-4 mr-2" /> Cancelar
                                            </Button>
                                            <Button size="sm" onClick={handleSavePersonal}>
                                                <Save className="h-4 w-4 mr-2" /> Guardar
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <FieldDisplay id="name" name="name" label="Nombre Completo" value={isEditingPersonal ? tempPersonalData.name : localUser.name} readOnly={!isEditingPersonal} onChange={handlePersonalChange} />
                                    <FieldDisplay id="email" name="email" label="Correo Electrónico" value={isEditingPersonal ? tempPersonalData.email : localUser.email} readOnly={true} onChange={handlePersonalChange} type="email" />
                                    <FieldDisplay id="phone" name="phone" label="Teléfono" value={isEditingPersonal ? tempPersonalData.phone : localUser.phone} readOnly={!isEditingPersonal} onChange={handlePersonalChange} type="tel" />
                                </CardContent>
                            </Card>
                        )}

                        {/* --- Tarjeta de Dirección de Envío --- */}
                        {activeNavItem === 'address' && (
                            <Card className="shadow-sm border">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-primary" /> Dirección de Envío
                                    </CardTitle>
                                    {!isEditingAddress ? (
                                        <Button variant="outline" size="sm" onClick={handleEditAddress}>
                                            <Edit className="h-4 w-4 mr-2" /> Editar
                                        </Button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={handleCancelAddress}>
                                                <X className="h-4 w-4 mr-2" /> Cancelar
                                            </Button>
                                            <Button size="sm" onClick={handleSaveAddress}>
                                                <Save className="h-4 w-4 mr-2" /> Guardar
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <FieldDisplay id="country" name="country" label="País" value={isEditingAddress ? tempAddressData.country : localUser.address.country} readOnly={!isEditingAddress} onChange={handleAddressChange} />
                                    <FieldDisplay id="city" name="city" label="Ciudad" value={isEditingAddress ? tempAddressData.city : localUser.address.city} readOnly={!isEditingAddress} onChange={handleAddressChange} />
                                    <FieldDisplay id="street" name="street" label="Dirección" value={isEditingAddress ? tempAddressData.street : localUser.address.street} readOnly={!isEditingAddress} onChange={handleAddressChange} />
                                    <FieldDisplay id="zip" name="zip" label="Código Postal" value={isEditingAddress ? tempAddressData.zip : localUser.address.zip} readOnly={!isEditingAddress} onChange={handleAddressChange} />
                                </CardContent>
                            </Card>
                        )}

                        {/* Redirección al diálogo de foto de perfil (simulado) */}
                        {activeNavItem === 'photo' && (
                            <Card className="shadow-sm border p-6 text-center">
                                <p className="text-lg text-muted-foreground">Haz clic en el botón de la cámara sobre tu foto de perfil para actualizarla, o usa el botón de abajo.</p>
                                <Button className="mt-4" onClick={() => setIsPhotoDialogOpen(true)}>
                                    <Camera className="h-4 w-4 mr-2" /> Abrir Gestor de Fotos
                                </Button>
                            </Card>
                        )}

                        {/* Aquí irían las otras secciones (Membresía, Historial) */}
                        {activeNavItem !== 'personal' && activeNavItem !== 'address' && activeNavItem !== 'photo' && (
                            <Card className="shadow-sm border p-6 text-center">
                                <p className="text-lg font-semibold text-muted-foreground">{localUser.name} - Contenido de {activeNavItem.charAt(0).toUpperCase() + activeNavItem.slice(1)}.</p>
                                <p className="text-sm text-muted-foreground">Esta sección está pendiente de implementación.</p>
                            </Card>
                        )}

                    </div>
                </div>
            </div>

            {/* --- MODALES --- */}

            {/* 1. DIALOGO DE CONFIRMACIÓN MINIMALISTA (Cerrar Sesión) */}
            <Dialog open={openConfirmDialog} onOpenChange={setOpenConfirmDialog}>
                <DialogContent className="sm:max-w-xs text-center p-6">
                    <DialogHeader className="flex items-center space-y-3">
                        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
                        <DialogTitle className="text-xl font-bold pt-2">{CONFIRM_LOGOUT_TITLE}</DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground mt-2 text-sm">
                        {CONFIRM_LOGOUT_MESSAGE}
                    </p>

                    <DialogFooter className="mt-4 flex justify-center gap-3">
                        <Button variant="outline" onClick={() => setOpenConfirmDialog(false)}>Cancelar</Button>
                        <Button onClick={handlePerformLogout} variant="destructive">Sí, Cerrar Sesión</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 2. DIALOGO DE SUBIR/ACTUALIZAR FOTO */}
            <Dialog open={openPhotoDialog} onOpenChange={setOpenPhotoDialog}>
                <DialogContent className="sm:max-w-xs text-center">
                    <DialogHeader className="flex items-center space-y-3">
                        <Camera className="h-8 w-8 text-primary" />
                        <DialogTitle>Subir Foto de Perfil</DialogTitle>
                    </DialogHeader>
                    <div className="my-4">
                        <div className="relative w-40 h-40 mx-auto mb-3">
                            <Avatar className="w-40 h-40 border-4 border-primary/20 mx-auto">
                                <AvatarImage src={previewImage} alt="Preview" />
                                <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-semibold">
                                    {localUser.name ? localUser.name[0].toUpperCase() : 'U'}
                                </AvatarFallback>
                            </Avatar>
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="grid w-full max-w-xs items-center gap-1.5 mx-auto">
                            <Label htmlFor="picture">Subir una nueva foto</Label>
                            <Input id="picture" type="file" onChange={handleFileSelect} accept="image/*" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Asegúrate que la imagen sea clara y tenga un buen enfoque.</p>
                    </div>

                    <DialogFooter className="justify-between pt-0">
                        <Button
                            variant="destructive"
                            onClick={handleDeletePhoto}
                            disabled={localUser.profileImage === '/assets/images/default_profile.png'}
                        >
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </Button>
                        <Button onClick={handleUploadImage} disabled={isUploading || !imageFile}>
                            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Confirmar Subida'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}