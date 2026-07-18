import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { getGovernedLoginPath } from '@/app/services/governedNavigation';
import { axiosClient } from '@/app/services/api';
const LOGO_URL = '/assets/logo.png';

const schema = z.object({
    correo: z.string().email('Ingresa un correo electrónico válido'),
    password: z
        .string()
        .min(8, 'Mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmar: z.string(),
}).refine(d => d.password === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
});

type FormData = z.infer<typeof schema>;

export default function RecuperarContrasenaToken() {
    const navigate = useNavigate();
    const { token } = useParams();
    const [params] = useSearchParams();

    // El backend envía el enlace con el token en un query param, p.ej. ?token=84bca...
    // Si el backend usa otro nombre de param, se ajusta aquí.
    const tokenUrl = token ?? params.get('token') ?? params.get('fantasma') ?? '';

    const [exito, setExito] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validandoToken, setValidandoToken] = useState(true);
    const [tokenValido, setTokenValido] = useState(false);
    const [errorApi, setErrorApi] = useState<string | null>(null);
    const [verPass, setVerPass] = useState(false);
    const [verConf, setVerConf] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { correo: '', password: '', confirmar: '' },
    });

    useEffect(() => {
        if (!tokenUrl) {
            setValidandoToken(false);
            setTokenValido(false);
            return;
        }

        let cancelado = false;
        const validar = async () => {
            setValidandoToken(true);
            setErrorApi(null);
            try {
                const res = await axiosClient.get('/api/recuperacion/seguridad/password/validar', {
                    headers: { fantasma: tokenUrl },
                    validateStatus: () => true,
                });
                const data = res.data ?? {};
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(data?.msg || 'El enlace expiró o no es válido.');
                }
                if (!cancelado) setTokenValido(true);
            } catch (err: unknown) {
                if (!cancelado) {
                    setTokenValido(false);
                    setErrorApi(String((err as Error)?.message || 'Enlace inválido o expirado.'));
                }
            } finally {
                if (!cancelado) setValidandoToken(false);
            }
        };

        void validar();
        return () => {
            cancelado = true;
        };
    }, [tokenUrl]);

    // Token inválido o ausente — mostrar aviso
    if (!tokenUrl || (!validandoToken && !tokenValido)) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="w-full max-w-sm text-center space-y-5">
                    <div className="flex justify-center">
                        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                            <ShieldAlert className="w-7 h-7 text-destructive" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-xl font-semibold text-foreground">Enlace inválido</h1>
                        <p className="text-sm text-muted-foreground">
                            {errorApi || 'Este enlace de recuperación no es válido o ha expirado. Solicita uno nuevo desde la pantalla de recuperación.'}
                        </p>
                    </div>
                    <Button onClick={() => navigate('/recuperar-contrasena')} variant="outline" className="gap-2 text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Solicitar nuevo enlace
                    </Button>
                </div>
            </div>
        );
    }

    if (validandoToken) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm">Validando enlace de recuperación…</p>
                </div>
            </div>
        );
    }

    // Vista de éxito
    if (exito) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="w-full max-w-sm text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/40">
                            <CheckCircle2 className="w-8 h-8 text-secondary-foreground" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-xl font-semibold text-foreground">¡Contraseña actualizada!</h1>
                        <p className="text-sm text-muted-foreground">
                            Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión.
                        </p>
                    </div>
                    <Button onClick={() => navigate(getGovernedLoginPath())} className="gap-2 text-sm">
                        Ir al inicio de sesión
                    </Button>
                </div>
            </div>
        );
    }

    const onSubmit = async ({ correo, password }: FormData) => {
        setLoading(true);
        setErrorApi(null);
        try {
            // El backend espera el token en el header "fantasma"
            // apiFetch no gestiona headers custom nativamente, así que se hace la petición manualmente aquí
            const res = await axiosClient.post(
                '/api/recuperacion/seguridad/cambio/password/todos',
                { correo, password },
                {
                    headers: { 'fantasma': tokenUrl },
                    validateStatus: () => true,
                },
            );
            const data = res.data ?? {};
            if (res.status < 200 || res.status >= 300) {
                throw new Error(data.msg || 'Error al cambiar la contraseña.');
            }
            setExito(true);
        } catch (err: any) {
            setErrorApi(err.message || 'No pudimos cambiar tu contraseña. El enlace puede haber expirado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-8">

                {/* Encabezado */}
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
                        <h1 className="text-xl font-semibold text-foreground">Nueva contraseña</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Elige una contraseña segura para tu cuenta.
                        </p>
                    </div>
                </div>

                {/* Formulario */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* Correo */}
                        <FormField
                            control={form.control}
                            name="correo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Correo electrónico</FormLabel>
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

                        {/* Nueva contraseña */}
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Nueva contraseña</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={verPass ? 'text' : 'password'}
                                                placeholder="Mínimo 8 caracteres"
                                                className="h-10 text-sm pr-10"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setVerPass(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                tabIndex={-1}
                                            >
                                                {verPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Confirmar contraseña */}
                        <FormField
                            control={form.control}
                            name="confirmar"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Confirmar contraseña</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={verConf ? 'text' : 'password'}
                                                placeholder="Repite la contraseña"
                                                className="h-10 text-sm pr-10"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setVerConf(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                tabIndex={-1}
                                            >
                                                {verConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Requisitos visuales */}
                        <ul className="space-y-1 text-[11px] text-muted-foreground">
                            {[
                                'Mínimo 8 caracteres',
                                'Al menos una letra mayúscula',
                                'Al menos un número',
                            ].map(r => (
                                <li key={r} className="flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                                    {r}
                                </li>
                            ))}
                        </ul>

                        {/* Error API */}
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
                            {loading ? 'Actualizando...' : 'Cambiar contraseña'}
                        </Button>
                    </form>
                </Form>

                <div className="text-center">
                    <Link
                        to={getGovernedLoginPath()}
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
