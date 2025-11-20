import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom'; // Usamos Link directamente

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

const LOGO_URL = '/assets/logo.png';
// Definición del esquema Zod
const recoverySchema = z.object({
    email: z.string().email('Debe ser un correo electrónico válido'),
});

export default function RecuperarContrasena() {
    const navigate = useNavigate();

    // 1. Inicializar useForm con el resolver de Zod
    const form = useForm({
        resolver: zodResolver(recoverySchema),
        defaultValues: {
            email: '',
        }
    });

    // Obtener handleSubmit y formState de la instancia de form
    const { handleSubmit } = form;

    const onSubmit = (data) => {
        console.log('Datos de recuperación:', data);
        alert('Se ha enviado un enlace de recuperación a tu correo.');
        navigate('/login');
    };

    return (
        // Reemplaza Box y Container
        <div className="flex justify-center items-center min-h-screen bg-background p-4 sm:p-6">

            {/* Reemplaza Paper y Box principales */}
            <Card className="w-full max-w-lg shadow-xl border">
                <CardHeader className="flex items-center text-center pb-2">
                    {/* Imagen del Logo - Reemplaza Box component="img" */}
                    <img
                        src={LOGO_URL}
                        alt="Mabs Logo"
                        className="h-12 w-auto mb-4"
                    />

                    {/* Título - Reemplaza Typography variant="h4" */}
                    <CardTitle className="text-3xl font-bold mb-1">
                        Recuperar Contraseña
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 pt-0">
                    {/* Descripción - Reemplaza Typography variant="body1" */}
                    <p className="text-muted-foreground text-center mb-6">
                        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </p>

                    {/* 2. Envolver el formulario con el componente Form de Shadcn */}
                    <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full"> {/* Reemplaza Box component="form" */}

                            {/* Campo de Email - Reemplaza InputField */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo electrónico</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="tu.correo@ejemplo.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Botón de Enviar - Reemplaza ButtonPrimary */}
                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold"
                            >
                                Enviar enlace de recuperación
                            </Button>

                            {/* Enlace de Navegación - Reemplaza Typography y MuiLink */}
                            <p className="text-sm text-center text-muted-foreground">
                                ¿Recordaste tu contraseña?{' '}
                                <Link to="/login" className="text-primary font-semibold hover:underline">
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