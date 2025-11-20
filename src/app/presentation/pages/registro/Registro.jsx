import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify'; // Usaremos solo react-toastify para las alertas ligeras

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

// Lucide icons
import { Loader2, AlertTriangle } from 'lucide-react';

// --- Constantes y Esquemas ---
const LOGO_URL = '/assets/logo.png';
const EMPTY_FIELDS_MESSAGE = 'Por favor, completa todos los campos requeridos.';
const CRITICAL_ERROR_TITLE = '⚠️ Error del Servidor';

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


export default function Registro() {
    const navigate = useNavigate();

    // --- ESTADO DE CONTROL DE LA UI ---
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado para el Dialog (Errores críticos)
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState('');

    // 1. Reemplazamos el estado 'snackbar' con llamadas directas a 'toast'

    // 2. Inicializar useForm
    const form = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
        }
    });

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setDialogMessage('');
    };

    // --- 3. FUNCIÓN PARA CAMPOS VACÍOS O VALIDACIÓN FALLIDA (onInvalid) ---
    const onFormInvalid = (errors) => {
        setIsSubmitting(false);
        // Usamos el error de Zod para la coincidencia de contraseñas si existe.
        const errorMessage = errors.confirmPassword?.message || EMPTY_FIELDS_MESSAGE;

        // Reemplazamos Snackbar con toast.error
        toast.error(errorMessage);
    };
    // ---------------------------------------------


    // --- 4. Lógica de envío SÓLO si el formulario es válido (onValidSubmit) ---
    const onValidSubmit = async (data) => {
        setIsSubmitting(true);
        setDialogOpen(false); // Asegura que el diálogo esté cerrado

        // Prepara los datos para la API (quitamos confirmPassword)
        const clientData = {
            correo: data.email,
            password: data.password,
            rol: "CLIENTE"
        };

        try {
            await registerClient(clientData); // Llama a la API

            // Éxito: Mostrar Toast y Redirigir
            toast.success('¡Registro exitoso! Redirigiendo a Login...');

            setTimeout(() => {
                navigate('/login');
            }, 1000);
            return;

        } catch (error) {
            console.error("Error en Registro:", error);
            setIsSubmitting(false);

            // --- MANEJO DE ERRORES DEL API ---

            // 1. Error de Correo Existente (ej. 409 Conflict)
            const status = error.status || error.response?.status;
            const isConflictError = status === 409 || (error.message && error.message.toLowerCase().includes('correo en uso'));

            if (isConflictError) {
                // Reemplazamos Snackbar con toast.error
                toast.error('Este correo ya está registrado. Intenta iniciar sesión.');
                return;

            } else {
                // 2. Error Crítico: Usamos Dialog Minimalista
                const userFriendlyMessage = error.message || 'Error al registrar. Intenta más tarde.';
                setDialogMessage(userFriendlyMessage);
                setDialogOpen(true);
            }
        }
    };


    return (
        // Reemplaza Box con la configuración de layout
        <div className="flex justify-center items-center min-h-screen bg-background p-4 sm:p-6">

            {/* --- DIALOG DE ERROR CRÍTICO (Reemplaza Dialog de MUI) --- */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="w-[300px] rounded-lg text-center p-6">
                    <DialogHeader className="flex items-center space-y-3">
                        {/* Icono de error - Reemplaza ErrorOutlineIcon */}
                        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />

                        <DialogTitle id="error-dialog-title" className="text-xl font-bold pt-2">
                            {CRITICAL_ERROR_TITLE}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Contenido */}
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
            {/* ----------------------------------------------------------------- */}

            {/* Contenedor del Formulario - Reemplaza Paper */}
            <Card className="w-full max-w-md shadow-2xl border">
                <CardContent className="p-6 sm:p-8 flex flex-col items-center">

                    {/* Logo y Títulos */}
                    <img src={LOGO_URL} alt="Mabs Logo" className="h-16 w-auto mb-4" />
                    <h1 className="text-2xl font-semibold mb-1 text-center">
                        Regístrate
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6 text-center">
                        Únete a la comunidad Mabs by Gabs
                    </p>

                    {/* Formulario - Reemplaza Box component="form" */}
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
                                        <FormLabel>Correo electrónico</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="ejemplo@correo.com" {...field} />
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
                                        <FormLabel>Contraseña</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
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
                                        <FormLabel>Confirmar Contraseña</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Repite la contraseña" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Botón de Enviar - Reemplaza ButtonPrimary y CircularProgress */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold mt-6"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    'Crear Mi Cuenta'
                                )}
                            </Button>

                            {/* Enlace de Navegación - Reemplaza Typography y MuiLink */}
                            <p className="text-sm text-center text-muted-foreground pt-2">
                                ¿Ya tienes una cuenta?{' '}
                                <Link to="/login" className="text-primary font-semibold hover:underline">
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