import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';

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

// Lucide icons
import { Loader2, Lock } from 'lucide-react';

interface ChangePasswordFormData {
    password: string;
    confirmarPassword: string;
}

const changePasswordSchema = z.object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmarPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
}).refine((data) => data.password === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
});

export default function CambiarContrasenaProvisional(): React.ReactElement {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const form = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            password: '',
            confirmarPassword: '',
        }
    });

    const onValidSubmit = async (data: ChangePasswordFormData): Promise<void> => {
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No se encontró el token de autenticación');
            }

            // Obtener el correo del usuario logueado desde localStorage
            const userJson = localStorage.getItem('user');
            if (!userJson) {
                throw new Error('No se encontró información del usuario');
            }

            const user = JSON.parse(userJson);
            if (!user.correo) {
                throw new Error('No se encontró el correo del usuario');
            }

            const response = await apiFetch(`/api/referido/enlaceVer/${token}`, {
                method: 'PATCH',
                body: {
                    correo: user.correo,
                    password: data.password
                }
            });

            if (response) {
                toast.success('Contraseña actualizada exitosamente');
                
                // Redirigir al perfil después de 1 segundo
                setTimeout(() => {
                    navigate('/perfil');
                }, 1000);
            }
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al actualizar la contraseña';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onFormInvalid = (): void => {
        toast.warning('Por favor, completa todos los campos correctamente');
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 sm:p-6">
            <Card className="w-full max-w-md shadow-2xl border-border bg-card">
                <CardContent className="p-6 sm:p-8 flex flex-col items-center">
                    {/* Icono */}
                    <div className="mb-4 p-4 rounded-full bg-primary/10 dark:bg-primary/20">
                        <Lock className="h-16 w-16 text-primary" />
                    </div>

                    {/* Títulos */}
                    <h1 className="text-2xl font-semibold mb-1 text-center text-foreground">
                        Actualizar Contraseña
                    </h1>
                    <p className="text-sm text-muted-foreground mb-6 text-center">
                        Por seguridad, debes cambiar tu contraseña provisional
                    </p>

                    {/* Formulario */}
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onValidSubmit, onFormInvalid)}
                            className="space-y-4 w-full"
                        >
                            {/* Campo Nueva Contraseña */}
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground">Nueva Contraseña</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                placeholder="Mínimo 6 caracteres" 
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
                                name="confirmarPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground">Confirmar Contraseña</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                placeholder="Repite tu contraseña" 
                                                className="bg-background border-input focus:border-primary focus:ring-primary" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Botón de Actualizar */}
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-6"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Actualizando...
                                    </>
                                ) : (
                                    'Actualizar Contraseña'
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
