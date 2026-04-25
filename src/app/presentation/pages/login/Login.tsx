import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';

// Importar el AuthProvider con la ruta relativa ajustada
import { useAuth } from '../../../providers/AuthProvider';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Lucide icons
import { Loader2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { getAdminHomeRoute } from '@/app/services/routeService';
import { getGovernedPostLoginPath, getGovernedRegisterPath, getGovernedForgotPasswordPath, isGovernedPathConfigured } from '@/app/services/governedNavigation';

// --- Interfaces ---
interface LoginFormData {
    correo: string;
    password: string;
}

interface LoginResponse {
    token?: string;
    usuario?: {
        rol: string;
        [key: string]: any;
    };
    requiereActualizacion?: boolean;
}

interface LoginError {
    status?: string;
    message?: string;
}

// --- Constantes y Esquemas ---
const EMPTY_FIELDS_MESSAGE = 'Por favor, completa todos los campos requeridos para acceder.';
const CREDENTIAL_ERROR_MESSAGE = 'Credenciales inválidas. Verifica tu correo y contraseña.';
const CRITICAL_ERROR_TITLE = 'Error de Conexión';

const loginSchema = z.object({
    correo: z.string().email('Correo electrónico inválido').min(1, 'Este campo es obligatorio'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
});


export default function Login(): React.ReactElement {
    const navigate = useNavigate();
    const { login } = useAuth();

    // --- ESTADO DE CONTROL DE LA UI ---
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Estado para el Dialog (Errores críticos de API)
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [dialogMessage, setDialogMessage] = useState<string>('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    // 1. Inicializar useForm
    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            correo: '',
            password: '',
        }
    });

    useEffect(() => {
        const fetchPublicLogo = async (): Promise<void> => {
            try {
                const logoRes = await apiFetch('/api/config/parametrizacion/listar/logos/coporativo', {
                    method: 'GET',
                    useAuth: false,
                    logoutOn401: false
                });

                if (logoRes?.ok && logoRes?.logo) {
                    const { base64, mimetype } = logoRes.logo;
                    if (base64 && mimetype) {
                        setLogoUrl(`data:${mimetype};base64,${base64}`);
                    }
                }
            } catch (error) {
                console.warn('No se pudo cargar el logo publico para login:', error);
                setLogoUrl(null);
            }
        };

        fetchPublicLogo();
    }, []);

    // Función para cerrar el diálogo
    const handleCloseDialog = (): void => {
        setDialogOpen(false);
        setDialogMessage('');
    };

    // --- 2. FUNCIÓN PARA VALIDACIÓN FALLIDA (onInvalid) ---
    const onFormInvalid = (): void => {
        setIsSubmitting(false);
        toast.warning(EMPTY_FIELDS_MESSAGE);
    };

    // --- 3. Lógica de envío SÓLO si el formulario es válido (onValidSubmit) ---
    const onValidSubmit = async (data: LoginFormData): Promise<void> => {
        setIsSubmitting(true);
        setDialogOpen(false);

        try {
            // Map correo to email for the login service
            const response = await login({ correo: data.correo, password: data.password }) as LoginResponse;
            console.log('[MABS][Login][response]', response);

            if (response?.token && response?.usuario) {
                // Verificar si requiere actualización de contraseña
                if (response.requiereActualizacion === true) {
                    toast.info('Debes actualizar tu contraseña provisional');
                    setTimeout(() => {
                        navigate('/cambiar-contrasena-provisional');
                    }, 1000);
                    return;
                }

                // Éxito: Mostrar Toast y Redirigir
                toast.success('¡Acceso exitoso! Redirigiendo...');

                setTimeout(async () => {
                    const governedPath = getGovernedPostLoginPath();
                    const governedConfigured = isGovernedPathConfigured('postLogin');
                    // El governed path del backend tiene prioridad cuando está explícitamente configurado.
                    // Solo se usa getAdminHomeRoute() como fallback cuando no hay config de gobernanza.
                    let targetPath: string;
                    if (governedConfigured) {
                        targetPath = governedPath;
                    } else {
                        const adminPath = await getAdminHomeRoute();
                        targetPath = adminPath ?? governedPath;
                    }
                    console.log('[MABS][Login][post-auth-redirect]', {
                        governedPath,
                        governedConfigured,
                        targetPath,
                        userId: response?.usuario?._id ?? null,
                        correo: response?.usuario?.correo ?? null,
                    });
                    navigate(targetPath);
                }, 1000);
                return;
            } else {
                // Si la respuesta es vacía o inesperada, forzamos un error de credenciales
                throw new Error('401');
            }

        } catch (error) {
            console.error("Error en Login:", error);
            setIsSubmitting(false);

            const err = error as LoginError;
            // 4. Manejo de Errores de API
            const status = err.status || err.message || '';
            const isCredentialError = status.includes('401') || status.includes('Unauthorized');

            if (isCredentialError) {
                // Error de Credenciales: Usamos Toast
                toast.error(CREDENTIAL_ERROR_MESSAGE);
                return;

            } else {
                // Error Crítico: Usamos Dialog Minimalista
                const userFriendlyMessage = err.message || 'No se pudo conectar al servidor. Verifica tu conexión a internet o intenta más tarde.';
                setDialogMessage(userFriendlyMessage);
                setDialogOpen(true);
            }
        }
    };


    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 sm:p-6">

            {/* --- DIALOG DE ERROR CRÍTICO --- */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="w-[300px] rounded-lg text-center p-6 bg-card border-border">
                    <DialogHeader className="flex items-center space-y-3">
                        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />

                        <DialogTitle id="error-dialog-title" className="text-xl font-bold pt-2 text-foreground">
                            {CRITICAL_ERROR_TITLE}
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground mt-2">
                        {dialogMessage}
                    </p>

                    <DialogFooter className="mt-4 flex justify-center">
                        <Button
                            type="button"
                            onClick={handleCloseDialog}
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Contenedor del Formulario con adaptación dark/light */}
            <Card className="w-full max-w-md shadow-2xl border-border bg-card">
                <CardContent className="p-6 sm:p-8 flex flex-col items-center">

                    {/* Logo y Títulos */}
                    <div className="mb-4 p-4 rounded-full bg-primary/10 dark:bg-primary/20">
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt="Logo"
                                className="h-16 w-auto filter dark:brightness-110"
                                onError={() => setLogoUrl(null)}
                            />
                        ) : (
                            <span className="inline-flex h-16 items-center text-sm text-muted-foreground italic">
                                Sin logo
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-semibold mb-1 text-center text-foreground">
                        Bienvenido/a de vuelta
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6 text-center">
                        Accede a tu cuenta
                    </p>

                    {/* Formulario */}
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onValidSubmit, onFormInvalid)}
                            className="space-y-4 w-full"
                        >

                            {/* Campo Correo */}
                            <FormField
                                control={form.control}
                                name="correo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground">Correo electrónico</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="email" 
                                                placeholder="tu.correo@ejemplo.com" 
                                                className="bg-background border-input focus:border-primary focus:ring-primary" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Campo Contraseña */}
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground">Contraseña</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                placeholder="Tu contraseña secreta" 
                                                className="bg-background border-input focus:border-primary focus:ring-primary" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Enlace Olvidé mi contraseña */}
                            <div className="flex justify-end pt-1 pb-3">
                                <Link
                                    to={getGovernedForgotPasswordPath()}
                                    className="text-sm text-primary hover:underline font-medium transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            {/* Botón de Acceder */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Ingresando...
                                    </>
                                ) : (
                                    'Acceder a mi Cuenta'
                                )}
                            </Button>

                            {/* Enlace a Registro */}
                            <p className="text-sm text-center text-muted-foreground pt-2">
                                ¿Aún no tienes cuenta?{' '}
                                <Link
                                    to={getGovernedRegisterPath()}
                                    className="text-primary font-semibold hover:underline transition-colors"
                                >
                                    Regístrate aquí
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
