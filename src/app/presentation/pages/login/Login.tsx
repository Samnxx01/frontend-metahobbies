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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Lucide icons
import { Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { fetchSplashLogo, resolveSplashLogoUrl } from '@/app/services/splashLogoService';
import { obtenerBrandingPublico } from '@/app/services/brandingWidget';
import { normalizeImageRenderUrl } from '@/app/utils/normalizeImageRenderUrl';
import { getAdminHomeRoute } from '@/app/services/routeService';
import { getGovernedPostLoginPath, getGovernedRegisterPath, getGovernedForgotPasswordPath, isGovernedPathConfigured } from '@/app/services/governedNavigation';
import {
    clearSavedLoginCredentials,
    persistSavedLoginCredentials,
    readSavedLoginCredentials,
} from '@/app/services/savedLoginCredentialsService';
import {
    consumeCheckoutLoginFlow,
} from '@/app/services/checkoutLoginFlowService';

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
    correo: z.string().trim().toLowerCase().email('Correo electrónico inválido').min(1, 'Este campo es obligatorio'),
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
    const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
    const [rememberCredentials, setRememberCredentials] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);

    // 1. Inicializar useForm
    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            correo: '',
            password: '',
        }
    });

    useEffect(() => {
        const savedCredentials = readSavedLoginCredentials();
        if (!savedCredentials) return;

        form.reset({
            correo: savedCredentials.correo,
            password: savedCredentials.password,
        });
        setRememberCredentials(true);
    }, [form]);

    useEffect(() => {
        const fetchPublicLogo = async (): Promise<void> => {
            try {
                const logoRes = await fetchSplashLogo(false);
                const nextLogoUrl = resolveSplashLogoUrl(logoRes?.logo);
                if (nextLogoUrl) setLogoUrl(nextLogoUrl);
            } catch (error) {
                console.warn('No se pudo cargar el logo publico para login:', error);
                setLogoUrl(null);
            }
        };

        fetchPublicLogo();
    }, []);

    useEffect(() => {
        const fetchLoginBackground = async (): Promise<void> => {
            try {
                const branding = await obtenerBrandingPublico();
                const loginBackground = branding?.widgets?.loginBackground;
                const nextBackgroundUrl = normalizeImageRenderUrl(loginBackground?.imageUrl);

                if (loginBackground?.enabled !== false && nextBackgroundUrl) {
                    setBackgroundUrl(nextBackgroundUrl);
                }
            } catch (error) {
                console.warn('No se pudo cargar el fondo publico para login:', error);
                setBackgroundUrl(null);
            }
        };

        fetchLoginBackground();
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
            const response = await login({ correo: data.correo.trim().toLowerCase(), password: data.password }) as LoginResponse;
            if (response?.token && response?.usuario) {
                if (rememberCredentials) {
                    persistSavedLoginCredentials(data.correo, data.password);
                } else {
                    clearSavedLoginCredentials();
                }

                // Verificar si requiere actualización de contraseña
                if (response.requiereActualizacion === true) {
                    toast.info('Debes actualizar tu contraseña provisional');
                    setTimeout(() => {
                        navigate('/cambiar-contrasena-provisional');
                    }, 1000);
                    return;
                }

                // Rama exclusiva del flujo de compra. El login normal no entra aquí.
                const checkoutFlow = consumeCheckoutLoginFlow();
                if (checkoutFlow) {
                    toast.success('¡Acceso exitoso! Retomando tu compra...');
                    navigate(checkoutFlow.returnUrl, {
                        replace: true,
                        state: {
                            ...checkoutFlow.returnState,
                            checkoutFlowId: checkoutFlow.flowId,
                        },
                    });
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
        <div
            className="relative flex justify-center items-center min-h-screen bg-background bg-center bg-cover p-4 sm:p-6"
            style={{
                backgroundImage: backgroundUrl
                    ? `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.18)), url("${backgroundUrl}")`
                    : undefined
            }}
        >
            {backgroundUrl && <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />}

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
            <Card className="relative z-10 w-full max-w-md shadow-2xl border-border bg-card/95 backdrop-blur">
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
                                                autoComplete="username"
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
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    autoComplete="current-password"
                                                    placeholder="Tu contraseña secreta"
                                                    className="bg-background border-input pr-10 focus:border-primary focus:ring-primary"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((prev) => !prev)}
                                                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Guardar credenciales y recuperación de contraseña */}
                            <div className="flex items-center justify-between gap-3 pt-1 pb-3">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember-credentials"
                                        checked={rememberCredentials}
                                        onCheckedChange={(checked) => setRememberCredentials(checked === true)}
                                    />
                                    <Label
                                        htmlFor="remember-credentials"
                                        className="cursor-pointer text-sm font-normal text-muted-foreground"
                                    >
                                        Guardar credenciales
                                    </Label>
                                </div>
                                <Link
                                    to={getGovernedForgotPasswordPath()}
                                    className="text-sm text-primary hover:underline font-medium transition-colors shrink-0"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            {/* Botón de Acceder */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold transition-colors"
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
                                    to={`${getGovernedRegisterPath()}?rolCorporativo=INVITADO`}
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
