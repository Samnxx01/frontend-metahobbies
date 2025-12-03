import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Importar servicios y providers con la ruta relativa ajustada
import { useAuth } from '../../../providers/AuthProvider';
import { uploadProfileImage, getProfileImageBlobUrl, getClientProfile, updateClientProfile } from '../../../services/clientService';
import PerfilClienteForm from '../../components/perfil/PerfilClienteForm';
import DireccionEnvioForm from '../../components/perfil/DireccionEnvioForm';
import type { User, ClientProfile } from '../../../../types/common';

// Shadcn UI components
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Lucide icons
import { Camera, MapPin, User as UserIcon, Trash2, ArrowLeft, LogOut, AlertTriangle, Loader2, Building, Calendar } from 'lucide-react';

// --- INTERFACES ---

interface NavItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    itemKey: string;
    activeNavItem: string;
    setActiveNavItem: (key: string) => void;
}

const CONFIRM_LOGOUT_TITLE = 'Cerrar Sesión';
const CONFIRM_LOGOUT_MESSAGE = '¿Estás seguro de que quieres cerrar tu sesión actual?';

// Datos de usuario de ejemplo
const DEFAULT_USER_DATA: User = {
    _id: '',
    nombre: 'Sofia Alvarez',
    apellido: '',
    correo: 'sofia.alvarez@example.com',
    rol: 'CLIENTE',
    estado: 'activo',
    role: 'CLIENTE',
    telefono: '+57 310 123 4567',
    direccion: 'Calle 123 #45-67, Bogotá, Colombia',
};

export default function Perfil(): React.ReactElement {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // --- ESTADOS DE GESTIÓN DE UI Y DATOS ---
    const [localUser, setLocalUser] = useState<User>(user || DEFAULT_USER_DATA);
    const [activeNavItem, setActiveNavItem] = useState<string>('personal');
    const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
    
    // Refs para archivo de foto
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estados de Foto de Perfil
    const [openPhotoDialog, setOpenPhotoDialog] = useState<boolean>(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
    const [profileImageBlobUrl, setProfileImageBlobUrl] = useState<string | null>(null);
    const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
    const [imageLoading, setImageLoading] = useState<boolean>(false);

    // Redirección si el usuario no existe
    if (!user) { 
        navigate('/login'); 
        return <></>; 
    }

    // Sincronizar localUser con el AuthProvider.user
    useEffect(() => {
        if (user) {
            setLocalUser(user);
        }
    }, [user]);

    // --- LÓGICA DE CARGA DE IMAGEN DEL SERVIDOR ---
    useEffect(() => {
        let isMounted = true;

        const loadImage = async () => {
            if (!user?._id) return;

            setImageLoading(true);
            if (profileImageBlobUrl) URL.revokeObjectURL(profileImageBlobUrl);

            try {
                const blobUrl = await getProfileImageBlobUrl(user._id);
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
    }, [user?._id, cacheBuster]);

    // --- LÓGICA DE CARGA DEL PERFIL DEL CLIENTE ---
    useEffect(() => {
        let isMounted = true;

        const loadClientProfile = async () => {
            if (!user?._id) return;

            try {
                const profile = await getClientProfile(user._id);
                if (isMounted && profile) {
                    setClientProfile(profile);
                }
            } catch (error) {
                console.error('Error al cargar perfil del cliente:', error);
            }
        };

        loadClientProfile();
        return () => {
            isMounted = false;
        };
    }, [user?._id]);

    // --- HANDLERS DE EDICIÓN DE DATOS ---

    // --- LOGOUT Y FOTO DE PERFIL ---

    const confirmLogout = () => setOpenConfirmDialog(true);
    
    const handlePerformLogout = async () => {
        setOpenConfirmDialog(false);
        try {
            await logout();
            toast.success('Sesión cerrada exitosamente.');
            setTimeout(() => navigate('/login'), 500);
        } catch (error) {
            toast.error((error as Error).message || 'Error al cerrar sesión.');
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setPreviewImage(URL.createObjectURL(file));
            setImageFile(file);
            setOpenPhotoDialog(true);
        }
    };

    const handleUploadImage = async () => {
        if (!imageFile || !user?._id) {
            toast.error('Error: No se seleccionó ningún archivo.');
            return;
        }
        setIsUploading(true);
        setOpenPhotoDialog(false);
        const formData = new FormData();
        formData.append('archivo', imageFile);

        try {
            await uploadProfileImage(user._id, formData);
            setCacheBuster(Date.now());
            toast.success('Foto de perfil actualizada.');
        } catch (error) {
            toast.error((error as Error).message || 'Error al subir la imagen.');
        } finally {
            setIsUploading(false);
            setPreviewImage(null);
            setImageFile(null);
        }
    };

    const handleDeletePhoto = () => {
        setPreviewImage(null);
        setImageFile(null);
        setOpenPhotoDialog(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        toast.info("Selección de imagen cancelada.");
    };

    // --- COMPONENTES AUXILIARES ---

    const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, itemKey, activeNavItem, setActiveNavItem }) => (
        <Button
            variant={activeNavItem === itemKey ? 'default' : 'ghost'}
            className={`w-full justify-start text-left font-semibold ${
                activeNavItem === itemKey ? '' : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setActiveNavItem(itemKey)}
        >
            <Icon className="h-4 w-4 mr-3" />
            {label}
        </Button>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col items-center py-6 md:py-10 px-4">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
            <div className="w-full max-w-5xl">

                {/* Header del Perfil */}
                <Card className="mb-6 md:mb-8 p-4 md:p-6 text-center shadow-lg border-border bg-gradient-to-br from-primary/5 via-background to-primary/5">
                    <CardContent className="flex flex-col items-center justify-center p-0">
                        <div className="relative mb-4 group">
                            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
                                <AvatarImage
                                    src={previewImage || profileImageBlobUrl || undefined}
                                    alt={localUser.nombre}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://placehold.co/120x120/E8E8E8/5C5C5C?text=U";
                                    }}
                                />
                                <AvatarFallback className="bg-primary/20 text-primary text-2xl md:text-3xl font-bold">
                                    {localUser.nombre?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>

                            {imageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                                    <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-white" />
                                </div>
                            )}

                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute bottom-0 right-0 h-8 w-8 md:h-9 md:w-9 rounded-full bg-background border border-border shadow-sm 
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                <span className="sr-only">Cambiar foto</span>
                            </Button>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{localUser.nombre}</h1>
                        <div className="text-xs md:text-sm text-muted-foreground">
                            Miembro desde {localUser.fechaCreacion ? new Date(localUser.fechaCreacion).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : 'N/A'} • Rol: <Badge variant="secondary" className="ml-1">{localUser.rol}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Contenido Principal: Navegación y Secciones */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Navegación Lateral */}
                    <Card className="lg:col-span-1 shadow-sm border-border bg-card">
                        <CardHeader className="pb-3">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-primary mb-2"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver
                            </Button>
                            <Separator className="bg-border" />
                        </CardHeader>
                        <CardContent className="space-y-1 p-4">
                            <NavItem 
                                icon={UserIcon} 
                                label="Información Personal" 
                                itemKey="personal" 
                                activeNavItem={activeNavItem}
                                setActiveNavItem={setActiveNavItem}
                            />
                            <NavItem 
                                icon={MapPin} 
                                label="Direcciones de Envío" 
                                itemKey="address" 
                                activeNavItem={activeNavItem}
                                setActiveNavItem={setActiveNavItem}
                            />
                            <NavItem 
                                icon={Camera} 
                                label="Foto de Perfil" 
                                itemKey="photo" 
                                activeNavItem={activeNavItem}
                                setActiveNavItem={setActiveNavItem}
                            />
                            <NavItem 
                                icon={Building} 
                                label="Membresía" 
                                itemKey="membership" 
                                activeNavItem={activeNavItem}
                                setActiveNavItem={setActiveNavItem}
                            />
                            <NavItem 
                                icon={Calendar} 
                                label="Historial de Pedidos" 
                                itemKey="history" 
                                activeNavItem={activeNavItem}
                                setActiveNavItem={setActiveNavItem}
                            />
                            <Button
                                variant="destructive"
                                className="w-full justify-start mt-4"
                                onClick={confirmLogout}
                            >
                                <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Secciones de Información */}
                    <div className="lg:col-span-3 space-y-4 md:space-y-6">

                        {/* --- Tarjeta de Información Personal --- */}
                        {activeNavItem === 'personal' && (
                            <PerfilClienteForm
                                profile={clientProfile}
                                onProfileUpdate={async (updatedProfile) => {
                                    setClientProfile(updatedProfile);
                                    if (user?._id) {
                                        try {
                                            const response = await updateClientProfile(user._id, updatedProfile);
                                            if (response && response.success) {
                                                toast.success('Perfil actualizado correctamente.');
                                            }
                                        } catch (error) {
                                            console.error('Error al actualizar perfil:', error);
                                            toast.error('Error al actualizar el perfil.');
                                        }
                                    }
                                }}
                            />
                        )}

                        {/* --- Tarjeta de Dirección de Envío --- */}
                        {activeNavItem === 'address' && (
                            <DireccionEnvioForm
                                localUser={localUser}
                                onUserUpdate={setLocalUser}
                            />
                        )}

                        {/* Sección de Foto de Perfil */}
                        {activeNavItem === 'photo' && (
                            <Card className="shadow-sm border-border bg-card p-6 text-center">
                                <p className="text-base md:text-lg text-muted-foreground">
                                    Haz clic en el botón de la cámara sobre tu foto de perfil para actualizarla, o usa el botón de abajo.
                                </p>
                                <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
                                    <Camera className="h-4 w-4 mr-2" /> Abrir Gestor de Fotos
                                </Button>
                            </Card>
                        )}

                        {/* Otras secciones pendientes */}
                        {activeNavItem !== 'personal' && activeNavItem !== 'address' && activeNavItem !== 'photo' && (
                            <Card className="shadow-sm border-border bg-card p-6 text-center">
                                <p className="text-base md:text-lg font-semibold text-muted-foreground">
                                    {localUser.nombre} - Contenido de {activeNavItem.charAt(0).toUpperCase() + activeNavItem.slice(1)}.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Esta sección está pendiente de implementación.
                                </p>
                            </Card>
                        )}

                    </div>
                </div>
            </div>

            {/* --- MODALES --- */}

            {/* DIALOGO DE CONFIRMACIÓN (Cerrar Sesión) */}
            <Dialog open={openConfirmDialog} onOpenChange={setOpenConfirmDialog}>
                <DialogContent className="sm:max-w-xs text-center p-6 bg-card border-border">
                    <DialogHeader className="flex items-center space-y-3">
                        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
                        <DialogTitle className="text-xl font-bold pt-2 text-foreground">
                            {CONFIRM_LOGOUT_TITLE}
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground mt-2 text-sm">
                        {CONFIRM_LOGOUT_MESSAGE}
                    </p>

                    <DialogFooter className="mt-4 flex justify-center gap-3">
                        <Button variant="outline" onClick={() => setOpenConfirmDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handlePerformLogout} variant="destructive">
                            Sí, Cerrar Sesión
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOGO DE SUBIR/ACTUALIZAR FOTO */}
            <Dialog open={openPhotoDialog} onOpenChange={setOpenPhotoDialog}>
                <DialogContent className="sm:max-w-xs text-center bg-card border-border">
                    <DialogHeader className="flex items-center space-y-3">
                        <Camera className="h-8 w-8 text-primary" />
                        <DialogTitle className="text-foreground">
                            Subir Foto de Perfil
                        </DialogTitle>
                    </DialogHeader>
                    <div className="my-4">
                        <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-3">
                            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-primary/20 mx-auto">
                                <AvatarImage src={previewImage || undefined} alt="Preview" />
                                <AvatarFallback className="bg-primary text-primary-foreground text-3xl md:text-4xl font-semibold">
                                    {localUser.nombre ? localUser.nombre[0].toUpperCase() : 'U'}
                                </AvatarFallback>
                            </Avatar>
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                    <Loader2 className="h-8 w-8 md:h-10 md:w-10 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Asegúrate que la imagen sea clara y tenga un buen enfoque.
                        </p>
                    </div>

                    <DialogFooter className="flex flex-col md:flex-row justify-between gap-2 pt-0">
                        <Button
                            variant="destructive"
                            onClick={handleDeletePhoto}
                            disabled={!previewImage && !profileImageBlobUrl}
                            className="w-full md:w-auto"
                        >
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </Button>
                        <Button 
                            onClick={handleUploadImage} 
                            disabled={isUploading || !imageFile}
                            className="w-full md:w-auto"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subiendo...
                                </>
                            ) : (
                                'Confirmar Subida'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
