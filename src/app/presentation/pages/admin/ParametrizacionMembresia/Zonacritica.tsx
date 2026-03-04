import { useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, ShieldAlert, PowerOff, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

type MensajeTipo = 'success' | 'error';
interface Mensaje {
    tipo: MensajeTipo;
    texto: string;
}


export default function ZonaCritica() {
    const [idDesactivar, setIdDesactivar] = useState('');
    const [idEliminar, setIdEliminar] = useState('');
    const [loadingDesactivar, setLoadingDesactivar] = useState(false);
    const [loadingEliminar, setLoadingEliminar] = useState(false);
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    const mostrarMensaje = (tipo: MensajeTipo, texto: string) => {
        setMensaje({ tipo, texto });
        setTimeout(() => setMensaje(null), 5000);
    };

    const handleDesactivar = async () => {
        if (!idDesactivar.trim()) return;
        setLoadingDesactivar(true);
        try {
            await apiFetch(
                `/api/membresia/seguridad/desactivar/parametrizacion/membresia/${idDesactivar.trim()}`,
                { method: 'DELETE' }
            );
            mostrarMensaje('success', 'Precio desactivado correctamente.');
            setIdDesactivar('');
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al desactivar el precio.');
        } finally {
            setLoadingDesactivar(false);
        }
    };

    const handleEliminar = async () => {
        if (!idEliminar.trim()) return;
        setLoadingEliminar(true);
        try {
            await apiFetch(
                `/api/membresia/seguridad/eliminar/parametrizacion/membresia/${idEliminar.trim()}`,
                { method: 'DELETE' }
            );
            mostrarMensaje('success', 'Precio eliminado permanentemente.');
            setIdEliminar('');
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al eliminar el precio.');
        } finally {
            setLoadingEliminar(false);
        }
    };

    return (
        <Card className="border border-destructive/25 shadow-sm">
            {/* Header */}
            <CardHeader className="pb-4 px-6 pt-5 border-b border-destructive/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-semibold text-destructive">
                            Zona Crítica
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Acciones sobre precios de membresía · Irreversibles
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 py-5 space-y-5">
                {/* Feedback global */}
                {mensaje && (
                    <div className={`
                        flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs border
                        ${mensaje.tipo === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                        }
                    `}>
                        {mensaje.tipo === 'success'
                            ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        }
                        <span>{mensaje.texto}</span>
                    </div>
                )}

                <AccionCritica
                    icono={<PowerOff className="w-3.5 h-3.5" />}
                    titulo="Desactivar precio"
                    descripcion="Borrado lógico — el registro permanece en BD marcado como inactivo. Acción reversible."
                    variante="amber"
                >
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">ID del precio a desactivar</Label>
                            <Input
                                placeholder="65f9c9b7a91a2c0012e8b123"
                                value={idDesactivar}
                                onChange={e => setIdDesactivar(e.target.value)}
                                className="h-9 text-xs font-mono bg-background"
                            />
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!idDesactivar.trim() || loadingDesactivar}
                                    className="gap-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                >
                                    {loadingDesactivar
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <PowerOff className="w-3.5 h-3.5" />
                                    }
                                    Desactivar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Desactivar este precio?</AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-2">
                                        <span>El precio con ID </span>
                                        <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                                            {idDesactivar}
                                        </code>
                                        <span> quedará marcado como inactivo. Esta acción puede revertirse.</span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDesactivar}
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                        Sí, desactivar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </AccionCritica>

                {/* Divisor */}
                <div className="border-t border-border/40" />

                {/* ── Sección: Eliminar (hard delete) ───────────── */}
                <AccionCritica
                    icono={<Trash2 className="w-3.5 h-3.5" />}
                    titulo="Eliminar permanentemente"
                    descripcion="Borrado físico — el registro se elimina de forma definitiva e irreversible de la base de datos."
                    variante="red"
                >
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">ID del precio a eliminar</Label>
                            <Input
                                placeholder="65f9c9b7a91a2c0012e8b123"
                                value={idEliminar}
                                onChange={e => setIdEliminar(e.target.value)}
                                className="h-9 text-xs font-mono bg-background"
                            />
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={!idEliminar.trim() || loadingEliminar}
                                    className="gap-2"
                                >
                                    {loadingEliminar
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Trash2 className="w-3.5 h-3.5" />
                                    }
                                    Eliminar para siempre
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-destructive" />
                                        Esta acción no puede deshacerse
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-2">
                                        <span>Estás a punto de eliminar permanentemente el precio con ID </span>
                                        <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                                            {idEliminar}
                                        </code>
                                        <span>. Esta es una operación de <strong>borrado físico</strong> y no podrá revertirse bajo ninguna circunstancia.</span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleEliminar}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Sí, eliminar permanentemente
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </AccionCritica>
            </CardContent>
        </Card>
    );
}

function AccionCritica({
    icono,
    titulo,
    descripcion,
    variante,
    children,
}: {
    icono: React.ReactNode;
    titulo: string;
    descripcion: string;
    variante: 'amber' | 'red';
    children: React.ReactNode;
}) {
    const colors = {
        amber: {
            border: 'border-amber-200/70 dark:border-amber-800/40',
            bg: 'bg-amber-50/50 dark:bg-amber-950/10',
            icon: 'text-amber-600 dark:text-amber-400',
            title: 'text-amber-800 dark:text-amber-300',
        },
        red: {
            border: 'border-destructive/20',
            bg: 'bg-red-50/50 dark:bg-red-950/10',
            icon: 'text-destructive',
            title: 'text-destructive',
        },
    }[variante];

    return (
        <div className={`rounded-xl border p-4 space-y-3 ${colors.border} ${colors.bg}`}>
            <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 shrink-0 ${colors.icon}`}>{icono}</span>
                <div>
                    <p className={`text-xs font-semibold ${colors.title}`}>{titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{descripcion}</p>
                </div>
            </div>
            {children}
        </div>
    );
}