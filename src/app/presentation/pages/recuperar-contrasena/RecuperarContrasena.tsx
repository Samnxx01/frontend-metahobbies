import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';

// Services
import { requestPasswordRecovery } from '../../../services/authService';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Lucide icons
import { Mail, Loader2 } from 'lucide-react';

const LOGO_URL = '/assets/logo.png';

// Definición del esquema Zod
const recoverySchema = z.object({
    correo: z.string().email('Debe ser un correo electrónico válido'),
});

interface RecoveryFormData {
    correo: string;
}

export default function RecuperarContrasena(): React.ReactElement {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Inicializar useForm con el resolver de Zod
    const form = useForm<RecoveryFormData>({
        resolver: zodResolver(recoverySchema),
        defaultValues: {
            correo: '',
        }
    });

    // Obtener handleSubmit de la instancia de form
    const { handleSubmit } = form;

    const onSubmit = async (data: RecoveryFormData): Promise<void> => {
        setIsLoading(true);
        try {
            const response = await requestPasswordRecovery(data);
            toast.success(response.msg || 'Se ha enviado un enlace de recuperación a tu correo.');
            form.reset();
            setTimeout(() => navigate('/login'), 2000);
        } catch (error: any) {
            toast.error(error.message || 'Error al solicitar recuperación de contraseña.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 sm:p-6">

            {/* Card principal con adaptación dark/light */}
            <Card className="w-full max-w-lg shadow-2xl border-border bg-card">
                <CardHeader className="flex flex-col items-center text-center pb-4">
                    {/* Logo con adaptación para modo oscuro */}
                    <div className="mb-4 p-4 rounded-full bg-primary/10 dark:bg-primary/20">
                        <img
                            src={LOGO_URL}
                            alt="Mabs Logo"
                            className="h-12 w-auto filter dark:brightness-110"
                        />
                    </div>

                    {/* Título */}
                    <CardTitle className="text-3xl font-bold mb-2 text-foreground">
                        Recuperar Contraseña
                    </CardTitle>
                    
                    {/* Icono decorativo */}
                    <div className="mt-2 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 pt-4">
                    {/* Descripción */}
                    <p className="text-muted-foreground text-center mb-6">
                        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </p>

                    {/* Formulario con Form de Shadcn */}
                    <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">

                            {/* Campo de Email */}
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

                            {/* Botón de Enviar */}
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar enlace de recuperación'
                                )}
                            </Button>

                            {/* Enlace de Navegación */}
                            <p className="text-sm text-center text-muted-foreground pt-2">
                                ¿Recordaste tu contraseña?{' '}
                                <Link 
                                    to="/login" 
                                    className="text-primary font-semibold hover:underline transition-colors"
                                >
                                    Volver a Iniciar Sesión
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
