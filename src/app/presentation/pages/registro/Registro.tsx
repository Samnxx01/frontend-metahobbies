import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';

import { registerClient } from '../../../services/clientService';

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
import { apiFetch } from '@/app/services/api';
import { getGovernedLoginPath } from '@/app/services/governedNavigation';

// Lucide icons
import { Loader2, AlertTriangle, UserPlus } from 'lucide-react';

// --- Interfaces ---
interface RegisterFormData {
    email: string;
    password: string;
    confirmPassword: string;
}

interface ClientData {
    email: string;
    password: string;
    rol: string;
}

interface RegisterError {
    status?: number;
    response?: {
        status?: number;
    };
    message?: string;
}

// --- Constantes y Esquemas ---
const EMPTY_FIELDS_MESSAGE = 'Por favor, completa todos los campos requeridos.';
const CRITICAL_ERROR_TITLE = 'Error del Servidor';

// Schema Extendido: Incluye confirmPassword y validación de coincidencia
const registerSchema = z.object({
    email: z.string().email('Debe ser un correo electrónico válido').min(1, 'El correo es obligatorio'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
})
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Las contraseñas no coinciden.',
        path: ['confirmPassword'],
    });


export default function Registro(): React.ReactElement {
    const navigate = useNavigate();

    // --- ESTADO DE CONTROL DE LA UI ---
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    // Estado para el Dialog (Errores críticos)
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [dialogMessage, setDialogMessage] = useState<string>('');

    // Inicializar useForm
    const form = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
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
                        return;
                    }
                }

                setLogoUrl(null);
            } catch (error) {
                console.warn('No se pudo cargar el logo publico para registro:', error);
                setLogoUrl(null);
            }
        };

        void fetchPublicLogo();
    }, []);

    const handleCloseDialog = (): void => {
        setDialogOpen(false);
        setDialogMessage('');
    };

    // --- FUNCIÓN PARA CAMPOS VACÍOS O VALIDACIÓN FALLIDA (onInvalid) ---
    const onFormInvalid = (errors: any): void => {
        setIsSubmitting(false);
        const errorMessage = errors.confirmPassword?.message || EMPTY_FIELDS_MESSAGE;
        toast.error(errorMessage);
    };

    // --- Lógica de envío SÓLO si el formulario es válido (onValidSubmit) ---
    const onValidSubmit = async (data: RegisterFormData): Promise<void> => {
        setIsSubmitting(true);
        setDialogOpen(false);

        // Prepara los datos para la API
        const clientData: ClientData = {
            email: data.email,
            password: data.password,
            rol: "CLIENTE"
        };

        try {
            await registerClient(clientData as any);

            // Éxito: Mostrar Toast y Redirigir
            toast.success('¡Registro exitoso! Redirigiendo a Login...');

            setTimeout(() => {
                navigate(getGovernedLoginPath());
            }, 1000);
            return;

        } catch (error) {
            console.error("Error en Registro:", error);
            setIsSubmitting(false);

            const err = error as RegisterError;
            // --- MANEJO DE ERRORES DEL API ---

            // 1. Error de Correo Existente (ej. 409 Conflict)
            const status = err.status || err.response?.status;
            const isConflictError = status === 409 || (err.message && err.message.toLowerCase().includes('correo en uso'));

            if (isConflictError) {
                toast.error('Este correo ya está registrado. Intenta iniciar sesión.');
                return;

            } else {
                // 2. Error Crítico: Usamos Dialog Minimalista
                const userFriendlyMessage = err.message || 'Error al registrar. Intenta más tarde.';
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
                        >
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Contenedor del Formulario con adaptación dark/light */}
            <Card className="w-full max-w-md shadow-2xl border-border bg-card">
                <CardContent className="p-6 sm:p-8 flex flex-col items-center">

                    {/* Logo con adaptación dark/light */}
                    {logoUrl ? (
                        <div className="mb-4 p-4 rounded-full bg-primary/10 dark:bg-primary/20">
                            <img
                                src={logoUrl}
                                alt="Logo"
                                className="h-16 w-auto object-contain"
                                onError={() => setLogoUrl(null)}
                            />
                        </div>
                    ) : null}

                    {/* Icono decorativo */}
                    <div className="mb-4 p-3 rounded-full bg-secondary/25">
                        <UserPlus className="w-6 h-6 text-secondary-foreground" />
                    </div>

                    <h1 className="text-2xl font-semibold mb-1 text-center text-foreground">
                        Regístrate
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6 text-center">
                        Únete a la comunidad Mabs by Gabs
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
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground">Correo electrónico</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="email" 
                                                placeholder="ejemplo@correo.com" 
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
                                                placeholder="Mínimo 8 caracteres" 
                                                className="bg-background border-input focus:border-primary focus:ring-primary"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Campo Confirmar Contraseña */}
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground">Confirmar Contraseña</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                placeholder="Repite la contraseña" 
                                                className="bg-background border-input focus:border-primary focus:ring-primary"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Botón de Enviar */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold mt-6 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    'Crear Mi Cuenta'
                                )}
                            </Button>

                            {/* Enlace de Navegación */}
                            <p className="text-sm text-center text-muted-foreground pt-2">
                                ¿Ya tienes una cuenta?{' '}
                                <Link 
                                    to={getGovernedLoginPath()} 
                                    className="text-primary font-semibold hover:underline transition-colors"
                                >
                                    Inicia sesión aquí
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
