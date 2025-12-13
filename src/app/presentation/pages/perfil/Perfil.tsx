import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Importar servicios y providers con la ruta relativa ajustada
import { useAuth } from '../../../providers/AuthProvider';
import { uploadProfileImage, getProfileImageBlobUrl } from '../../../services/clientService';
import { apiFetch } from '../../../services/api';
import type { User, ClientProfile } from '../../../../types/common';
import PerfilClienteForm from '../../components/perfil/PerfilClienteForm';

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
import { Badge } from '@/components/ui/badge';

// Lucide icons
import { Camera, MapPin, User as UserIcon, Edit, Save, X, Trash2, ArrowLeft, LogOut, AlertTriangle, Loader2, Building, Calendar } from 'lucide-react';

// --- INTERFACES ---

interface NavItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    itemKey: string;
    activeNavItem: string;
    setActiveNavItem: (key: string) => void;
}

interface FieldDisplayProps {
    id: string;
    name: string;
    label: string;
    defaultValue: string;
    readOnly: boolean;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    type?: string;
}

// --- CONSTANTES ---
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
    const { user, logout, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();



    // --- ESTADOS DE GESTIÓN DE UI Y DATOS ---
    const [localUser, setLocalUser] = useState<User>(user || DEFAULT_USER_DATA);
    const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
    const [activeNavItem, setActiveNavItem] = useState<string>('personal');
    const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);

    // Refs para inputs no controlados (solo dirección)
    const direccionRef = useRef<HTMLInputElement>(null);

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
    if (loading) {
        return <div>Cargando usuario...</div>;
    }

    if (!user) {
        navigate('/login');
        return <></>;
    }

    useEffect(() => {
        console.log("🔥 useEffect ejecutado");

        if (loading) {
            console.log("⏳ loading = true → no cargo imagen todavía");
            return;
        }

        if (!isAuthenticated) {
            console.log("🚫 Usuario NO autenticado");
            return;
        }

        if (!user?._id) {
            console.log("⛔ user._id NO existe todavía");
            return;
        }

        console.log("📸 Usuario listo, cargando imagen:", user._id);

        // aquí llamas tu loadImage()
    }, [loading, isAuthenticated, user?._id]);


    // Sincronizar localUser con el AuthProvider.user
    useEffect(() => {
        if (user) {
            setLocalUser(user);
        }
    }, [user]);

    // --- LÓGICA DE CARGA DE IMAGEN DEL SERVIDOR ---
    useEffect(() => {
  console.log("=== EFECTO IMAGEN ===");
  console.log("loading:", loading);
  console.log("isAuthenticated:", isAuthenticated);

  if (loading) {
    console.log("STOP → loading true");
    return;
  }

  if (!isAuthenticated) {
    console.log("STOP → usuario NO auth");
    return;
  }

  let isMounted = true;

  const loadImage = async () => {
    try {
      console.log("🔥 Llamando a getProfileImageBlobUrl()");
      setImageLoading(true);
      const blobUrl = await getProfileImageBlobUrl();  // ⬅️ aquí pega a /api/imgPerfil/ver
      console.log("✅ blobUrl:", blobUrl);
      if (isMounted) setProfileImageBlobUrl(blobUrl);
    } catch (err) {
      console.error("❌ Error cargando imagen:", err);
      if (isMounted) setProfileImageBlobUrl(null);
    } finally {
      if (isMounted) setImageLoading(false);
    }
  };

  loadImage();

  return () => {
    isMounted = false;
  };
}, [loading, isAuthenticated, cacheBuster]); // ⬅️ sin user._id

    // --- CARGAR DATOS DEL PERFIL DEL CLIENTE ---
    useEffect(() => {
        const loadClientProfile = async () => {
            try {
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
                const data = await apiFetch(`${API_BASE_URL}/perfil/usuario/consultarPerfil`, {
                    method: 'GET'
                });

                if (data.ok && data.cliente) {
                    setClientProfile(data.cliente);
                }
            } catch (error) {
                console.error('Error al cargar perfil del cliente:', error);
            }
        };

        if (isAuthenticated && !loading) {
            loadClientProfile();
        }
    }, [isAuthenticated, loading]);

    // --- HANDLERS DE EDICIÓN DE DATOS ---

    const handleEditAddress = () => {
        setIsEditingAddress(true);
    };

    const handleSaveAddress = () => {
        const direccion = direccionRef.current?.value || '';
        setLocalUser(prev => ({ ...prev, direccion }));
        setIsEditingAddress(false);
        toast.success("Dirección de envío actualizada.");
    };

    const handleCancelAddress = () => {
        setIsEditingAddress(false);
    };

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
        if (!imageFile) {
            toast.error('Error: No se seleccionó ningún archivo.');
            return;
        }

        setIsUploading(true);
        setOpenPhotoDialog(false);

        const formData = new FormData();
        formData.append('img', imageFile);

        try {
            await uploadProfileImage(formData);
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
        toast.success("Foto de perfil eliminada.");
    };

    // --- COMPONENTES AUXILIARES ---

    const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, itemKey, activeNavItem, setActiveNavItem }) => (
        <Button
            variant={activeNavItem === itemKey ? 'default' : 'ghost'}
            className={`w-full justify-start text-left font-semibold ${activeNavItem === itemKey ? '' : 'text-muted-foreground hover:bg-muted'
                }`}
            onClick={() => setActiveNavItem(itemKey)}
        >
            <Icon className="h-4 w-4 mr-3" />
            {label}
        </Button>
    );

    const FieldDisplay: React.FC<FieldDisplayProps> = ({ id, name, label, defaultValue, readOnly, inputRef, type = 'text' }) => (
        <div className="space-y-1">
            <Label htmlFor={id} className="text-foreground">{label}</Label>
            <Input
                ref={inputRef}
                id={id}
                name={name}
                type={type}
                defaultValue={defaultValue}
                readOnly={readOnly}
                key={`${id}-${readOnly}`}
                className={readOnly
                    ? "border-none shadow-none text-base pl-0 h-auto bg-transparent focus-visible:ring-0 text-foreground"
                    : "text-base bg-background border-border text-foreground"
                }
            />
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col items-center py-6 md:py-10 px-4">
            <div className="w-full max-w-5xl">

                {/* Header del Perfil */}
                <Card className="mb-6 md:mb-8 p-4 md:p-6 text-center shadow-lg border-border bg-gradient-to-br from-primary/5 via-background to-primary/5">
                    <CardContent className="flex flex-col items-center justify-center p-0">
                        <div className="relative mb-4 group">
                            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
                                <AvatarImage
                                    key={previewImage || profileImageBlobUrl}
                                    src={previewImage || profileImageBlobUrl || ""}
                                    alt={localUser.nombre}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                            "https://placehold.co/120x120/E8E8E8/5C5C5C?text=U";
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
                                onClick={() => setOpenPhotoDialog(true)}
                            >
                                <Camera className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                <span className="sr-only">Cambiar foto</span>
                            </Button>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{localUser.nombre}</h1>
                        <p className="text-xs md:text-sm text-muted-foreground">
                            Miembro desde {localUser.fechaCreacion ? new Date(localUser.fechaCreacion).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : 'N/A'} • Rol: <Badge variant="secondary" className="ml-1">{localUser.rol}</Badge>
                        </p>
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
                                onProfileUpdate={(updatedProfile) => {
                                    setClientProfile(updatedProfile);
                                    toast.success('Perfil actualizado correctamente');
                                }}
                                token={localStorage.getItem('token') || undefined}
                            />
                        )}

                        {/* --- Tarjeta de Dirección de Envío --- */}
                        {activeNavItem === 'address' && (
                            <Card className="shadow-sm border-border bg-card">
                                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 space-y-2 md:space-y-0">
                                    <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground">
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
                                    <FieldDisplay
                                        id="direccion"
                                        name="direccion"
                                        label="Dirección Completa"
                                        defaultValue={localUser.direccion || ''}
                                        readOnly={!isEditingAddress}
                                        inputRef={direccionRef}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Sección de Foto de Perfil */}
                        {activeNavItem === 'photo' && (
                            <Card className="shadow-sm border-border bg-card p-6 text-center">
                                <p className="text-base md:text-lg text-muted-foreground">
                                    Haz clic en el botón de la cámara sobre tu foto de perfil para actualizarla, o usa el botón de abajo.
                                </p>
                                <Button className="mt-4" onClick={() => setOpenPhotoDialog(true)}>
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
                        <div className="grid w-full max-w-xs items-center gap-1.5 mx-auto">
                            <Label htmlFor="picture" className="text-foreground">
                                Subir una nueva foto
                            </Label>
                            <Input
                                id="picture"
                                type="file"
                                onChange={handleFileSelect}
                                accept="image/*"
                                className="bg-background border-border text-foreground"
                            />
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
