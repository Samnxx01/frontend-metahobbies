import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, Coins, RefreshCcw, CheckCircle2, XCircle, AlertCircle, CheckCircle,
} from 'lucide-react';

interface Moneda {
    _id: string;
    monedas: string;
    estadoMoneda: boolean;
    usuarioId?: {
        nombre_cliente: string;
        correo: string;
    };
}

type MensajeTipo = 'success' | 'error';
interface Mensaje { tipo: MensajeTipo; texto: string }

export default function GestionMonedas() {
    const [monedas, setMonedas] = useState<Moneda[]>([]);
    const [loadingLista, setLoadingLista] = useState(false);
    const [loadingCrear, setLoadingCrear] = useState(false);
    const [loadingToggle, setLoadingToggle] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    const mostrarMensaje = (tipo: MensajeTipo, texto: string) => {
        setMensaje({ tipo, texto });
        setTimeout(() => setMensaje(null), 4500);
    };

    const listarMonedas = useCallback(async () => {
        setLoadingLista(true);
        try {
            const data = await apiFetch('/api/monedas/seguridad/listar/monedas', { method: 'GET' });
            if (data?.monedas) setMonedas(data.monedas);
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al listar monedas.');
        } finally {
            setLoadingLista(false);
        }
    }, []);

    const crearMonedas = async () => {
        setLoadingCrear(true);
        try {
            const data = await apiFetch('/api/seguridad/crear/moneda', { method: 'POST' });
            const detalle = Array.isArray(data?.detalle)
                ? data.detalle.map((d: any) => `${d.moneda}: ${d.estado}`).join('  ·  ')
                : '';
            mostrarMensaje('success', [data?.msg || 'Proceso completado.', detalle].filter(Boolean).join(' — '));
            await listarMonedas();
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al crear monedas base.');
        } finally {
            setLoadingCrear(false);
        }
    };

    const toggleEstado = async (id: string, estadoActual: boolean) => {
        setLoadingToggle(id);
        try {
            await apiFetch(`/api/seguridad/actualizar/${id}`, {
                method: 'PUT',
                body: { estadoMoneda: !estadoActual },
            });
            setMonedas(prev =>
                prev.map(m => m._id === id ? { ...m, estadoMoneda: !estadoActual } : m)
            );
            mostrarMensaje('success', `Moneda ${!estadoActual ? 'activada' : 'desactivada'} correctamente.`);
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al actualizar estado.');
        } finally {
            setLoadingToggle(null);
        }
    };

    useEffect(() => { listarMonedas(); }, [listarMonedas]);

    const activas = monedas.filter(m => m.estadoMoneda).length;

    return (
        <Card className="border border-border/50 shadow-sm">
            <CardHeader className="pb-4 px-6 pt-5 border-b border-border/40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Coins className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold text-foreground">
                                Administración de Monedas
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Monedas base del sistema y su estado
                            </p>
                        </div>
                    </div>
                    <Button
                        size="icon" variant="ghost"
                        onClick={listarMonedas}
                        disabled={loadingLista}
                        className="w-8 h-8 text-muted-foreground hover:text-foreground"
                        title="Recargar monedas"
                    >
                        {loadingLista
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RefreshCcw className="w-3.5 h-3.5" />
                        }
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="px-6 py-5 space-y-4">
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

                {/* Inicializar */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/40">
                    <div>
                        <p className="text-xs font-semibold text-foreground">Inicializar monedas base</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Crea COP, USD y EUR en el sistema</p>
                    </div>
                    <Button
                        size="sm" variant="outline"
                        onClick={crearMonedas}
                        disabled={loadingCrear}
                        className="gap-2 shrink-0"
                    >
                        {loadingCrear
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Coins className="w-3.5 h-3.5" />
                        }
                        Inicializar
                    </Button>
                </div>

                <Separator />

                {/* Lista */}
                {loadingLista && monedas.length === 0 ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Cargando monedas...</span>
                    </div>
                ) : monedas.length === 0 ? (
                    <div className="text-center py-10">
                        <Coins className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No hay monedas configuradas.</p>
                        <p className="text-xs text-muted-foreground">Usa "Inicializar" para crearlas.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Resumen */}
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground">
                                {monedas.length} moneda{monedas.length !== 1 ? 's' : ''} configurada{monedas.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <span className="text-primary font-medium">{activas} activa{activas !== 1 ? 's' : ''}</span>
                                {' · '}
                                <span>{monedas.length - activas} inactiva{(monedas.length - activas) !== 1 ? 's' : ''}</span>
                            </p>
                        </div>

                        {monedas.map(moneda => (
                            <div
                                key={moneda._id}
                                className={`
                                    flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                                    ${moneda.estadoMoneda
                                        ? 'bg-background border-border/50 hover:border-border'
                                        : 'bg-muted/20 border-border/30 opacity-70'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Badge con color del tema (primary) */}
                                    <span className="
                                        inline-flex items-center justify-center w-10 h-7 rounded-md
                                        text-xs font-bold tracking-wider
                                        bg-primary/10 text-primary border border-primary/20
                                    ">
                                        {moneda.monedas}
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            {moneda.estadoMoneda
                                                ? <CheckCircle2 className="w-3 h-3 text-primary" />
                                                : <XCircle className="w-3 h-3 text-muted-foreground/60" />
                                            }
                                            <span className={`text-xs font-medium ${moneda.estadoMoneda ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {moneda.estadoMoneda ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>
                                        {moneda.usuarioId?.nombre_cliente && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Creada por {moneda.usuarioId.nombre_cliente}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {loadingToggle === moneda._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <Switch
                                        checked={moneda.estadoMoneda}
                                        onCheckedChange={() => toggleEstado(moneda._id, moneda.estadoMoneda)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}