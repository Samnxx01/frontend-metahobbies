import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Loader2, ShieldAlert, PowerOff, Trash2, AlertCircle, CheckCircle, RefreshCcw, Coins } from 'lucide-react';

interface ParametrizacionPrecio {
    _id: string;
    nombreMembresia: string;
    precioMembresia: number;
    tipoPagos?: string;
}

interface Moneda {
    _id: string;
    monedas: string;
    estadoMoneda: boolean;
}

type MensajeTipo = 'success' | 'error';
interface Mensaje { tipo: MensajeTipo; texto: string }

const normalizarPrecioDesdeCentavos = (valor: number | string | null | undefined) =>
    Number(valor || 0) / 100;

export default function ZonaCritica() {
    // Precios de membresía
    const [precios, setPrecios] = useState<ParametrizacionPrecio[]>([]);
    const [loadingPrecios, setLoadingPrecios] = useState(false);
    const [idDesactivar, setIdDesactivar] = useState('');
    const [idEliminar, setIdEliminar] = useState('');
    const [loadingDesactivar, setLoadingDesactivar] = useState(false);
    const [loadingEliminar, setLoadingEliminar] = useState(false);

    // Monedas
    const [monedas, setMonedas] = useState<Moneda[]>([]);
    const [loadingMonedas, setLoadingMonedas] = useState(false);
    const [idMonedaEliminar, setIdMonedaEliminar] = useState('');
    const [loadingEliminarMoneda, setLoadingEliminarMoneda] = useState(false);

    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    const mostrarMensaje = (tipo: MensajeTipo, texto: string) => {
        setMensaje({ tipo, texto });
        setTimeout(() => setMensaje(null), 5000);
    };

    const cargarPrecios = useCallback(async () => {
        setLoadingPrecios(true);
        try {
            const res = await apiFetch('/api/membresia/seguridad/crear/parametrizacion/membresia', { method: 'GET' });
            const lista: ParametrizacionPrecio[] = Array.isArray(res?.data) ? res.data : [];
            setPrecios(lista);
        } catch { /* silencioso */ }
        finally { setLoadingPrecios(false); }
    }, []);

    const cargarMonedas = useCallback(async () => {
        setLoadingMonedas(true);
        try {
            const res = await apiFetch('/api/monedas/seguridad/listar/monedas', { method: 'GET' });
            if (res?.monedas) setMonedas(res.monedas);
        } catch { /* silencioso */ }
        finally { setLoadingMonedas(false); }
    }, []);

    useEffect(() => {
        cargarPrecios();
        cargarMonedas();
    }, [cargarPrecios, cargarMonedas]);

    const handleDesactivar = async () => {
        if (!idDesactivar) return;
        setLoadingDesactivar(true);
        try {
            await apiFetch(
                `/api/membresia/seguridad/desactivar/parametrizacion/membresia/${idDesactivar}`,
                { method: 'DELETE' }
            );
            mostrarMensaje('success', 'Precio desactivado correctamente.');
            setIdDesactivar('');
            await cargarPrecios();
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al desactivar el precio.');
        } finally {
            setLoadingDesactivar(false);
        }
    };

    const handleEliminar = async () => {
        if (!idEliminar) return;
        setLoadingEliminar(true);
        try {
            await apiFetch(
                `/api/membresia/seguridad/eliminar/parametrizacion/membresia/${idEliminar}`,
                { method: 'DELETE' }
            );
            mostrarMensaje('success', 'Precio eliminado permanentemente.');
            setIdEliminar('');
            await cargarPrecios();
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al eliminar el precio.');
        } finally {
            setLoadingEliminar(false);
        }
    };

    const handleEliminarMoneda = async () => {
        if (!idMonedaEliminar) return;
        setLoadingEliminarMoneda(true);
        try {
            await apiFetch(`/api/seguridad/delete/${idMonedaEliminar}`, { method: 'DELETE' });
            mostrarMensaje('success', 'Moneda eliminada correctamente.');
            setIdMonedaEliminar('');
            await cargarMonedas();
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al eliminar la moneda.');
        } finally {
            setLoadingEliminarMoneda(false);
        }
    };

    const labelPrecio = (id: string) => {
        const p = precios.find(x => x._id === id);
        return p ? `${p.nombreMembresia} — $${Number(p.precioMembresia).toLocaleString('es-CO')}` : id;
    };
    const labelMoneda = (id: string) => {
        const m = monedas.find(x => x._id === id);
        return m ? m.monedas : id;
    };

    return (
        <Card className="border border-destructive/25 shadow-sm">
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
                            Acciones irreversibles sobre precios y monedas
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 py-5 space-y-5">
                {/* Feedback */}
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

                {/* Desactivar precio */}
                <AccionCritica
                    icono={<PowerOff className="w-3.5 h-3.5" />}
                    titulo="Desactivar precio"
                    descripcion="Borrado lógico — el registro permanece en BD marcado como inactivo. Acción reversible."
                    variante="amber"
                    onRecargar={cargarPrecios}
                    loadingRecargar={loadingPrecios}
                >
                    <div className="space-y-3">
                        <Select
                            value={idDesactivar}
                            onValueChange={setIdDesactivar}
                            disabled={loadingPrecios}
                        >
                            <SelectTrigger className="h-9 text-xs bg-background">
                                <SelectValue placeholder={
                                    loadingPrecios ? 'Cargando precios...' : 'Selecciona un precio...'
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {precios.length === 0 ? (
                                    <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                                        No hay precios disponibles
                                    </div>
                                ) : (
                                    precios.map(p => (
                                        <SelectItem key={p._id} value={p._id}>
                                            <span className="font-medium">{p.nombreMembresia}</span>
                                            <span className="ml-2 text-muted-foreground text-[11px]">
                                                ${Number(p.precioMembresia).toLocaleString('es-CO')}
                                                {p.tipoPagos ? ` · ${p.tipoPagos}` : ''}
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="sm" variant="outline"
                                    disabled={!idDesactivar || loadingDesactivar}
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
                                    <AlertDialogDescription>
                                        El precio{' '}
                                        <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                                            {labelPrecio(idDesactivar)}
                                        </code>{' '}
                                        quedará marcado como inactivo. Esta acción puede revertirse.
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

                <div className="border-t border-border/40" />

                {/* Eliminar precio */}
                <AccionCritica
                    icono={<Trash2 className="w-3.5 h-3.5" />}
                    titulo="Eliminar precio permanentemente"
                    descripcion="Borrado físico — el registro se elimina de forma definitiva e irreversible de la base de datos."
                    variante="red"
                    onRecargar={cargarPrecios}
                    loadingRecargar={loadingPrecios}
                >
                    <div className="space-y-3">
                        <Select
                            value={idEliminar}
                            onValueChange={setIdEliminar}
                            disabled={loadingPrecios}
                        >
                            <SelectTrigger className="h-9 text-xs bg-background">
                                <SelectValue placeholder={
                                    loadingPrecios ? 'Cargando precios...' : 'Selecciona un precio...'
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {precios.length === 0 ? (
                                    <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                                        No hay precios disponibles
                                    </div>
                                ) : (
                                    precios.map(p => (
                                        <SelectItem key={p._id} value={p._id}>
                                            <span className="font-medium">{p.nombreMembresia}</span>
                                            <span className="ml-2 text-muted-foreground text-[11px]">
                                                ${Number(p.precioMembresia).toLocaleString('es-CO')}
                                                {p.tipoPagos ? ` · ${p.tipoPagos}` : ''}
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="sm" variant="destructive"
                                    disabled={!idEliminar || loadingEliminar}
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
                                    <AlertDialogDescription>
                                        Estás a punto de eliminar permanentemente el precio{' '}
                                        <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                                            {labelPrecio(idEliminar)}
                                        </code>
                                        . Esta es una operación de <strong>borrado físico</strong> y no podrá revertirse bajo ninguna circunstancia.
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

                <div className="border-t border-border/40" />

                {/* Eliminar moneda */}
                <AccionCritica
                    icono={<Coins className="w-3.5 h-3.5" />}
                    titulo="Eliminar moneda del sistema"
                    descripcion="Solo disponible para administradores. Elimina permanentemente una moneda del sistema."
                    variante="red"
                    onRecargar={cargarMonedas}
                    loadingRecargar={loadingMonedas}
                >
                    <div className="space-y-3">
                        <Select
                            value={idMonedaEliminar}
                            onValueChange={setIdMonedaEliminar}
                            disabled={loadingMonedas}
                        >
                            <SelectTrigger className="h-9 text-xs bg-background">
                                <SelectValue placeholder={
                                    loadingMonedas ? 'Cargando monedas...' : 'Selecciona una moneda...'
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {monedas.length === 0 ? (
                                    <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                                        No hay monedas disponibles
                                    </div>
                                ) : (
                                    monedas.map(m => (
                                        <SelectItem key={m._id} value={m._id}>
                                            <span className="font-medium">{m.monedas}</span>
                                            <span className="ml-2 text-muted-foreground text-[11px]">
                                                {m.estadoMoneda ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="sm" variant="destructive"
                                    disabled={!idMonedaEliminar || loadingEliminarMoneda}
                                    className="gap-2"
                                >
                                    {loadingEliminarMoneda
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Trash2 className="w-3.5 h-3.5" />
                                    }
                                    Eliminar moneda
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-destructive" />
                                        ¿Eliminar esta moneda?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Estás a punto de eliminar la moneda{' '}
                                        <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                                            {labelMoneda(idMonedaEliminar)}
                                        </code>{' '}
                                        del sistema. Esta acción es <strong>irreversible</strong> y solo puede ejecutarla un administrador.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleEliminarMoneda}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Sí, eliminar moneda
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
    icono, titulo, descripcion, variante, onRecargar, loadingRecargar, children,
}: {
    icono: React.ReactNode;
    titulo: string;
    descripcion: string;
    variante: 'amber' | 'red';
    onRecargar?: () => void;
    loadingRecargar?: boolean;
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
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 shrink-0 ${colors.icon}`}>{icono}</span>
                    <div>
                        <p className={`text-xs font-semibold ${colors.title}`}>{titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{descripcion}</p>
                    </div>
                </div>
                {onRecargar && (
                    <button
                        onClick={onRecargar}
                        disabled={loadingRecargar}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                        title="Recargar lista"
                    >
                        {loadingRecargar
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RefreshCcw className="w-3.5 h-3.5" />
                        }
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}
