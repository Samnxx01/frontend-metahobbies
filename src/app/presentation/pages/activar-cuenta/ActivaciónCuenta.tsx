import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, ArrowRight, Mail, KeyRound, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGovernedLoginPath } from '@/app/services/governedNavigation';

export default function ActivacionCuenta() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);

    const nombre = params.get('nombre') ?? '';
    const error = params.get('error'); // 'token-invalido' | 'ya-verificado' | 'servidor' | null

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 8000);
        return () => clearTimeout(t);
    }, []);

    if (error) {
        const esYaVerificado = error === 'ya-verificado';
        const esServidor = error === 'servidor';
        const titulo = esYaVerificado
            ? 'Cuenta ya verificada'
            : esServidor
              ? 'No pudimos completar la verificación'
              : 'Enlace inválido o expirado';
        const descripcion = esYaVerificado
            ? 'Esta cuenta ya fue activada anteriormente. Puedes iniciar sesión directamente.'
            : esServidor
              ? 'Ocurrió un error en el servidor al verificar tu correo. Intenta de nuevo en unos minutos o contacta a soporte.'
              : 'El enlace de activación no es válido o ha expirado. Contacta a soporte para recibir uno nuevo.';
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-sm text-center space-y-6">
                    <div className={`flex justify-center transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                            <ShieldAlert className="w-10 h-10 text-destructive" />
                        </div>
                    </div>
                    <div className={`space-y-2 transition-all duration-500 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <h1 className="text-xl font-bold text-foreground">
                            {titulo}
                        </h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {descripcion}
                        </p>
                    </div>
                    <div className={`space-y-3 transition-all duration-500 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <Button onClick={() => navigate(getGovernedLoginPath())} className="w-full gap-2 h-11 text-sm font-semibold">
                            Ir al inicio de sesión
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                        {!esYaVerificado && (
                            <p className="text-[11px] text-muted-foreground">
                                ¿Necesitas ayuda?{' '}
                                <a href="mailto:soporte@mabs.com" className="text-primary hover:underline font-medium">
                                    Contacta soporte
                                </a>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm text-center space-y-7">

                <div className={`flex justify-center transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/10 scale-[2] blur-2xl opacity-60" />
                        <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <CheckCircle2 className="w-12 h-12 text-primary" />
                        </div>
                        <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-primary/70" />
                    </div>
                </div>

                <div className={`space-y-3 transition-all duration-500 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <h1 className="text-2xl font-bold text-foreground leading-tight">
                        {nombre ? `¡Bienvenido a Mabs, ${nombre}!` : '¡Tu cuenta ha sido activada!'}
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                        Tu cuenta fue verificada correctamente. Ya puedes ingresar a la plataforma
                        con la contraseña temporal que recibiste en tu correo electrónico.
                    </p>
                </div>

                <div className={`flex items-center gap-3 transition-all duration-500 delay-150 ${visible ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[11px] text-muted-foreground uppercase tracking-widest">próximos pasos</span>
                    <div className="flex-1 h-px bg-border/50" />
                </div>

                <div className={`rounded-xl border border-border/50 bg-card p-5 text-left space-y-4 transition-all duration-500 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {[
                        { icon: <Mail className="w-3.5 h-3.5 text-primary" />, texto: 'Ingresa con tu correo y la contraseña temporal que enviamos a tu bandeja de entrada' },
                        { icon: <KeyRound className="w-3.5 h-3.5 text-primary" />, texto: 'Al ingresar, el sistema te pedirá que crees una contraseña nueva y segura' },
                        { icon: <ShieldCheck className="w-3.5 h-3.5 text-primary" />, texto: 'Listo — tendrás acceso completo a tu membresía y red de referidos' },
                    ].map((paso, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                {paso.icon}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{paso.texto}</p>
                        </div>
                    ))}
                </div>

                <div className={`space-y-3 transition-all duration-500 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <Button onClick={() => navigate(getGovernedLoginPath())} className="w-full gap-2 h-11 text-sm font-semibold">
                        Ir a Mabs
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                        ¿No recibiste la contraseña temporal?{' '}
                        <a href="mailto:soporte@mabs.com" className="text-primary hover:underline font-medium">
                            Contacta soporte
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
