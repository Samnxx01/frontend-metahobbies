import React, { useState } from 'react';
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

// --- Constantes y Esquemas ---
const LOGO_URL = '/assets/logo.png';
const EMPTY_FIELDS_MESSAGE = 'Por favor, completa todos los campos requeridos para acceder.';
const CREDENTIAL_ERROR_MESSAGE = 'Credenciales inválidas. Verifica tu correo y contraseña.';
const CRITICAL_ERROR_TITLE = 'Error de Conexión';

const loginSchema = z.object({
    correo: z.string().email('Correo electrónico inválido').min(1, 'Este campo es obligatorio'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
});


export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth(); // Usando el hook de autenticación

    // --- ESTADO DE CONTROL DE LA UI ---
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado para el Dialog (Errores críticos de API)
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState('');

    // 1. Inicializar useForm
    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            correo: '',
            password: '',
        }
    });

    // Función para cerrar el diálogo
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setDialogMessage('');
    };

    // --- 2. FUNCIÓN PARA VALIDACIÓN FALLIDA (onInvalid) ---
    const onFormInvalid = () => {
        setIsSubmitting(false);
        // Reemplazamos Snackbar con toast.warning
        toast.warning(EMPTY_FIELDS_MESSAGE);
    };
    // ---------------------------------------------


    // --- 3. Lógica de envío SÓLO si el formulario es válido (onValidSubmit) ---
    const onValidSubmit = async (data) => {
        setIsSubmitting(true);
        setDialogOpen(false);

        try {
            const response = await login(data);

            if (response?.token && response?.usuario) {
                // Éxito: Mostrar Toast y Redirigir
                toast.success('¡Acceso exitoso! Redirigiendo...');

                setTimeout(() => {
                    const userRole = response.usuario.rol;
                    const targetPath = (userRole === 'ADMIN' || userRole === 'DESARROLLADOR')
                        ? '/admin/dashboard'
                        : '/';
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

            // 4. Manejo de Errores de API
            const status = error.status || error.message; // A veces el error.message contiene el código HTTP
            const isCredentialError = status.includes('401') || status.includes('Unauthorized');

            if (isCredentialError) {
                // Error de Credenciales: Usamos Toast
                toast.error(CREDENTIAL_ERROR_MESSAGE);
                return;

            } else {
                // Error Crítico: Usamos Dialog Minimalista
                const userFriendlyMessage = error.message || 'No se pudo conectar al servidor. Verifica tu conexión a internet o intenta más tarde.';
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
                            className="w-full sm:w-auto"
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
                        Bienvenido/a de vuelta
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6 text-center">
                        Accede a tu cuenta
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
                                name="correo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo electrónico</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="tu.correo@ejemplo.com" {...field} />
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
                                            <Input type="password" placeholder="Tu contraseña secreta" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Enlace Olvidé mi contraseña */}
                            <div className="flex justify-end pt-1 pb-3">
                                <Link to="/recuperar-contrasena" className="text-sm text-primary hover:underline font-medium">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            {/* Botón de Acceder */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    'Acceder a mi Cuenta'
                                )}
                            </Button>

                            {/* Enlace a Registro */}
                            <p className="text-sm text-center text-muted-foreground pt-2">
                                ¿Aún no tienes cuenta?{' '}
                                <Link to="/registro" className="text-primary font-semibold hover:underline">
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