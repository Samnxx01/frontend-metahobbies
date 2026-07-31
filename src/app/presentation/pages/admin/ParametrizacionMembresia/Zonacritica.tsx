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
import {
    MEMBRESIA_PRECIO_LIST_URL,
    MONEDAS_LIST_URL,
    findEntityByPublicId,
    membresiaPrecioDesactivarPath,
    membresiaPrecioEliminarPath,
    monedaEliminarPath,
    normalizeMembresiaPrecioFromApi,
    normalizeMonedaFromApi,
    type MembresiaPrecioApiRow,
    type MembresiaPrecioRow,
    type MonedaApiRow,
    type MonedaRow,
} from './parametrizacionMembresiaApi';
import MembresiaHelpButton from './MembresiaHelpButton';

type MensajeTipo = 'success' | 'error';
interface Mensaje { tipo: MensajeTipo; texto: string }

const normalizarPrecioDesdeCentavos = (valor: number | string | null | undefined) =>
    Number(valor || 0) / 100;

export default function ZonaCritica() {
    // Precios de membresía
    const [precios, setPrecios] = useState<MembresiaPrecioRow[]>([]);
    const [loadingPrecios, setLoadingPrecios] = useState(false);
    const [idDesactivar, setIdDesactivar] = useState('');
    const [idEliminar, setIdEliminar] = useState('');
    const [loadingDesactivar, setLoadingDesactivar] = useState(false);
    const [loadingEliminar, setLoadingEliminar] = useState(false);

    // Monedas
    const [monedas, setMonedas] = useState<MonedaRow[]>([]);
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
            const res = await apiFetch(MEMBRESIA_PRECIO_LIST_URL, { method: 'GET' });
            const raw = Array.isArray(res?.data) ? res.data as MembresiaPrecioApiRow[] : [];
            setPrecios(raw.map(normalizeMembresiaPrecioFromApi).filter((p): p is MembresiaPrecioRow => p !== null));
        } catch { /* silencioso */ }
        finally { setLoadingPrecios(false); }
    }, []);

    const cargarMonedas = useCallback(async () => {
        setLoadingMonedas(true);
        try {
            const res = await apiFetch(MONEDAS_LIST_URL, { method: 'GET' });
            if (res?.monedas) {
                const rows = (res.monedas as MonedaApiRow[])
                    .map(normalizeMonedaFromApi)
                    .filter((m): m is MonedaRow => m !== null);
                setMonedas(rows);
            }
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
            await apiFetch(membresiaPrecioDesactivarPath(idDesactivar), { method: 'DELETE' });
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
            await apiFetch(membresiaPrecioEliminarPath(idEliminar), { method: 'DELETE' });
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
            await apiFetch(monedaEliminarPath(idMonedaEliminar), { method: 'DELETE' });
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
        const p = findEntityByPublicId(precios, id);
        if (!p) return id;
        const precio = normalizarPrecioDesdeCentavos(p.precioMembresia);
        return `${p.nombreMembresia} — $${precio.toLocaleString('es-CO')}`;
    };
    const labelMoneda = (id: string) => {
        const m = findEntityByPublicId(monedas, id);
        return m ? m.monedas : id;
    };

    return (
        <Card id="widget-zona-critica-membresias" className="border border-border/50 bg-card text-card-foreground shadow-sm">
            <CardHeader className="pb-4 px-6 pt-5 border-b border-border/40">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold text-foreground">
                                Zona Crítica
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Acciones irreversibles sobre precios y monedas
                            </p>
                        </div>
                    </div>
                    <MembresiaHelpButton
                        id="btn-ayuda-zona-critica-membresias"
                        title="Zona Crítica"
                        description="Este panel concentra operaciones que desactivan o eliminan información sensible."
                        items={[
                            'Desactivar conserva el registro y permite una recuperación posterior.',
                            'Eliminar permanentemente borra el registro y no puede deshacerse.',
                            'Verifica cuidadosamente el elemento seleccionado antes de confirmar.',
                        ]}
                    />
                </div>
            </CardHeader>

            <CardContent className="px-6 py-5 space-y-5">
                {/* Feedback */}
                {mensaje && (
                    <div className={`
                        flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs border
                        ${mensaje.tipo === 'success'
                            ? 'bg-success/10 dark:bg-success/30 text-success dark:text-success border-success/20 dark:border-success'
                            : 'bg-destructive/10 dark:bg-destructive/30 text-destructive dark:text-destructive border-destructive/20 dark:border-destructive'
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
                    id="widget-desactivar-precio-membresia"
                    helpButtonId="btn-ayuda-desactivar-precio-membresia"
                    reloadButtonId="btn-recargar-precios-desactivar-membresia"
                    icono={<PowerOff className="w-3.5 h-3.5" />}
                    titulo="Desactivar precio"
                    descripcion="Borrado lógico — el registro permanece en BD marcado como inactivo. Acción reversible."
                    variante="amber"
                    ayuda={{
                        title: 'Desactivar un precio',
                        description: 'Realiza un borrado lógico: el precio deja de estar activo, pero continúa almacenado.',
                        items: ['Selecciona el precio.', 'Pulsa Desactivar.', 'Revisa el elemento y confirma en el diálogo de seguridad.'],
                    }}
                    onRecargar={cargarPrecios}
                    loadingRecargar={loadingPrecios}
                >
                    <div className="space-y-3">
                        <Select
                            value={idDesactivar}
                            onValueChange={setIdDesactivar}
                            disabled={loadingPrecios}
                        >
                            <SelectTrigger id="select-precio-desactivar-membresia" className="h-9 text-xs bg-background">
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
                                        <SelectItem key={p.id} value={p.id}>
                                            <span className="font-medium">{p.nombreMembresia}</span>
                                            <span className="ml-2 text-muted-foreground text-[11px]">
                                                ${normalizarPrecioDesdeCentavos(p.precioMembresia).toLocaleString('es-CO')}
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
                                    id="btn-desactivar-precio-membresia"
                                    size="sm" variant="outline"
                                    disabled={!idDesactivar || loadingDesactivar}
                                    className="gap-2"
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
                                    <AlertDialogCancel id="btn-cancelar-desactivar-precio-membresia">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        id="btn-confirmar-desactivar-precio-membresia"
                                        onClick={handleDesactivar}
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
                    id="widget-eliminar-precio-membresia"
                    helpButtonId="btn-ayuda-eliminar-precio-membresia"
                    reloadButtonId="btn-recargar-precios-eliminar-membresia"
                    icono={<Trash2 className="w-3.5 h-3.5" />}
                    titulo="Eliminar precio permanentemente"
                    descripcion="Borrado físico — el registro se elimina de forma definitiva e irreversible de la base de datos."
                    variante="red"
                    ayuda={{
                        title: 'Eliminar un precio permanentemente',
                        description: 'Borra físicamente la parametrización de precio de la base de datos.',
                        items: ['Esta operación es irreversible.', 'Selecciona el precio correcto y confirma únicamente si ya no debe recuperarse.'],
                    }}
                    onRecargar={cargarPrecios}
                    loadingRecargar={loadingPrecios}
                >
                    <div className="space-y-3">
                        <Select
                            value={idEliminar}
                            onValueChange={setIdEliminar}
                            disabled={loadingPrecios}
                        >
                            <SelectTrigger id="select-precio-eliminar-membresia" className="h-9 text-xs bg-background">
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
                                        <SelectItem key={p.id} value={p.id}>
                                            <span className="font-medium">{p.nombreMembresia}</span>
                                            <span className="ml-2 text-muted-foreground text-[11px]">
                                                ${normalizarPrecioDesdeCentavos(p.precioMembresia).toLocaleString('es-CO')}
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
                                    id="btn-eliminar-precio-membresia"
                                    size="sm" variant="default"
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
                                    <AlertDialogCancel id="btn-cancelar-eliminar-precio-membresia">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        id="btn-confirmar-eliminar-precio-membresia"
                                        onClick={handleEliminar}
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
                    id="widget-eliminar-moneda-sistema"
                    helpButtonId="btn-ayuda-eliminar-moneda-sistema"
                    reloadButtonId="btn-recargar-monedas-eliminar-sistema"
                    icono={<Coins className="w-3.5 h-3.5" />}
                    titulo="Eliminar moneda del sistema"
                    descripcion="Solo disponible para administradores. Elimina permanentemente una moneda del sistema."
                    variante="red"
                    ayuda={{
                        title: 'Eliminar una moneda',
                        description: 'Elimina permanentemente una moneda del sistema; requiere permisos de administrador.',
                        items: ['Comprueba que la moneda no sea necesaria en membresías, inventario o Wompi.', 'Selecciona la moneda y confirma la eliminación definitiva.'],
                    }}
                    onRecargar={cargarMonedas}
                    loadingRecargar={loadingMonedas}
                >
                    <div className="space-y-3">
                        <Select
                            value={idMonedaEliminar}
                            onValueChange={setIdMonedaEliminar}
                            disabled={loadingMonedas}
                        >
                            <SelectTrigger id="select-moneda-eliminar-sistema" className="h-9 text-xs bg-background">
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
                                        <SelectItem key={m.id} value={m.id}>
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
                                    id="btn-eliminar-moneda-sistema"
                                    size="sm" variant="default"
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
                                    <AlertDialogCancel id="btn-cancelar-eliminar-moneda-sistema">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        id="btn-confirmar-eliminar-moneda-sistema"
                                        onClick={handleEliminarMoneda}
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
    id, helpButtonId, reloadButtonId, icono, titulo, descripcion, variante, ayuda, onRecargar, loadingRecargar, children,
}: {
    id: string;
    helpButtonId: string;
    reloadButtonId: string;
    icono: React.ReactNode;
    titulo: string;
    descripcion: string;
    variante: 'amber' | 'red';
    ayuda?: {
        title: string;
        description: string;
        items?: string[];
    };
    onRecargar?: () => void;
    loadingRecargar?: boolean;
    children: React.ReactNode;
}) {
    const colors = {
        amber: {
            border: 'border-warning/40',
            bg: 'bg-card',
            icon: 'text-warning dark:text-warning',
            title: 'text-foreground',
        },
        red: {
            border: 'border-destructive/30',
            bg: 'bg-card',
            icon: 'text-destructive',
            title: 'text-foreground',
        },
    }[variante];

    return (
        <div id={id} className={`rounded-xl border p-4 space-y-3 ${colors.border} ${colors.bg}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 shrink-0 ${colors.icon}`}>{icono}</span>
                    <div>
                        <p className={`text-xs font-semibold ${colors.title}`}>{titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{descripcion}</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {ayuda && (
                        <MembresiaHelpButton
                            id={helpButtonId}
                            iconOnly
                            title={ayuda.title}
                            description={ayuda.description}
                            items={ayuda.items}
                        />
                    )}
                    {onRecargar && (
                        <Button
                            id={reloadButtonId}
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={onRecargar}
                            disabled={loadingRecargar}
                            className="h-8 w-8"
                            title="Recargar lista"
                            aria-label={`Recargar lista de ${titulo.toLocaleLowerCase()}`}
                        >
                            {loadingRecargar
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RefreshCcw className="w-3.5 h-3.5" />
                            }
                        </Button>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}
