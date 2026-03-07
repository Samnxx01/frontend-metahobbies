import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '@/app/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
const LOGO_URL = '/assets/logo.png';

const schema = z.object({
    correo: z.string().email('Ingresa un correo electrónico válido'),
});

type FormData = z.infer<typeof schema>;

export default function RecuperarContrasena() {
    const [enviado, setEnviado] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorApi, setErrorApi] = useState<string | null>(null);
    const [correoEnviado, setCorreoEnviado] = useState('');

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { correo: '' },
    });

    const onSubmit = async ({ correo }: FormData) => {
        setLoading(true);
        setErrorApi(null);
        try {
            await apiFetch('/api/recuperacion/seguridad/password/todos', {
                method: 'POST',
                body: { correo },
            });
            setCorreoEnviado(correo);
            setEnviado(true);
        } catch (err: any) {
            // El backend devuelve { msg: '...' } en errores
            setErrorApi(err.message || 'No pudimos enviar el correo. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (enviado) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="w-full max-w-sm text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-xl font-semibold text-foreground">Revisa tu correo</h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Enviamos un enlace de recuperación a{' '}
                            <span className="font-medium text-foreground">{correoEnviado}</span>.
                            El enlace expira en 15 minutos.
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        ¿No llegó?{' '}
                        <button
                            onClick={() => { setEnviado(false); setErrorApi(null); }}
                            className="text-primary hover:underline font-medium"
                        >
                            Reenviar enlace
                        </button>
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-8">

                {/* Ícono + encabezado */}
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <div className="mb-4 p-4 rounded-full bg-primary/10 dark:bg-primary/20">
                            <img
                                src={LOGO_URL}
                                alt="Mabs Logo"
                                className="h-12 w-auto filter dark:brightness-110"
                            />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Recuperar contraseña</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Ingresa tu correo y te enviaremos un enlace seguro.
                        </p>
                    </div>
                </div>

                {/* Formulario */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="correo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium text-foreground">
                                        Correo electrónico
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="tu.correo@ejemplo.com"
                                            className="h-10 text-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Error del API */}
                        {errorApi && (
                            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                                {errorApi}
                            </p>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-10 text-sm font-medium gap-2"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                        </Button>
                    </form>
                </Form>

                {/* Footer */}
                <div className="text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}