import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, Coins, RefreshCcw, CheckCircle2, XCircle, AlertCircle, CheckCircle,
} from 'lucide-react';
import {
    MONEDAS_LIST_URL,
    monedaActualizarPath,
    normalizeMonedaFromApi,
    type MonedaApiRow,
    type MonedaRow,
} from './parametrizacionMembresiaApi';
import MembresiaHelpButton from './MembresiaHelpButton';

type MensajeTipo = 'success' | 'error';
interface Mensaje { tipo: MensajeTipo; texto: string }

export default function GestionMonedas() {
    const [monedas, setMonedas] = useState<MonedaRow[]>([]);
    const [loadingLista, setLoadingLista] = useState(false);
    const [loadingCrear, setLoadingCrear] = useState(false);
    const [loadingToggle, setLoadingToggle] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    const mostrarMensaje = (tipo: MensajeTipo, texto: string) => {
        setMensaje({ tipo, texto });
        if (tipo === 'success') toast.success(texto);
        else toast.error(texto);
        setTimeout(() => setMensaje(null), 4500);
    };

    const listarMonedas = useCallback(async () => {
        setLoadingLista(true);
        try {
            const data = await apiFetch(MONEDAS_LIST_URL, { method: 'GET' });
            if (data?.monedas) {
                const rows = (data.monedas as MonedaApiRow[])
                    .map(normalizeMonedaFromApi)
                    .filter((m): m is MonedaRow => m !== null);
                setMonedas(rows);
            }
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al listar monedas.');
        } finally {
            setLoadingLista(false);
        }
    }, []);

    const crearMonedas = async () => {
        setLoadingCrear(true);
        try {
            const data = await apiFetch('/api/monedas/seguridad/crear/moneda', { method: 'POST' });
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

    const toggleEstado = async (
        id: string,
        campo: 'estadoMoneda' | 'activosInventory' | 'activoWompi',
        estadoActual: boolean
    ) => {
        setLoadingToggle(`${id}-${campo}`);
        try {
            await apiFetch(monedaActualizarPath(id), {
                method: 'PUT',
                body: { [campo]: !estadoActual },
            });
            setMonedas(prev =>
                prev.map(m => m.id === id ? { ...m, [campo]: !estadoActual } : m)
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
    const activasInventory = monedas.filter(m => m.activosInventory === true).length;
    const activasWompi = monedas.filter(m => m.activoWompi === true).length;

    return (
        <Card id="widget-administracion-monedas" className="border border-border/50 shadow-sm">
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
                    <div className="flex items-center gap-2">
                        <MembresiaHelpButton
                            id="btn-ayuda-administracion-monedas"
                            title="Administración de monedas"
                            description="Gestiona las monedas disponibles y define en qué áreas puede utilizarse cada una."
                            items={[
                                'Sistema activa o desactiva la moneda de forma general.',
                                'Inventario habilita la moneda para operaciones del módulo de inventario.',
                                'Wompi permite usarla en operaciones integradas con la pasarela de pagos.',
                                'Los cambios realizados con los interruptores se guardan inmediatamente.',
                            ]}
                        />
                        <Button
                            id="btn-recargar-administracion-monedas"
                            size="icon" variant="outline"
                            onClick={listarMonedas}
                            disabled={loadingLista}
                            className="w-8 h-8 text-muted-foreground hover:text-foreground"
                            title="Recargar monedas"
                            aria-label="Recargar monedas"
                        >
                            {loadingLista
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RefreshCcw className="w-3.5 h-3.5" />
                            }
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 py-5 space-y-4">
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

                {/* Inicializar */}
                <div id="widget-inicializar-monedas-base" className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-3.5 text-card-foreground">
                    <div>
                        <p className="text-xs font-semibold text-foreground">Inicializar monedas base</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Crea COP, USD y EUR en el sistema</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <MembresiaHelpButton
                            id="btn-ayuda-inicializar-monedas-base"
                            iconOnly
                            title="Inicializar monedas base"
                            description="Registra las monedas COP, USD y EUR que todavía no existan en el sistema."
                            items={[
                                'La operación no debe duplicar monedas que ya estén registradas.',
                                'Al finalizar se actualiza automáticamente la lista.',
                            ]}
                        />
                        <Button
                            id="btn-inicializar-monedas-base"
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
                                {' · '}
                                <span>{activasInventory} inventario</span>
                                {' · '}
                                <span>{activasWompi} Wompi</span>
                            </p>
                        </div>

                        {monedas.map(moneda => (
                            <div
                                id={`widget-moneda-${moneda.id}`}
                                key={moneda.id}
                                className={`
                                    flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                                    ${moneda.estadoMoneda
                                        ? 'bg-card border-border/50 hover:border-border'
                                        : 'bg-card border-border/30 opacity-70'
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

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground">Sistema</span>
                                        {loadingToggle === `${moneda.id}-estadoMoneda` ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        ) : (
                                            <Switch
                                                id={`switch-moneda-sistema-${moneda.id}`}
                                                checked={moneda.estadoMoneda}
                                                aria-label={`Disponibilidad general de ${moneda.monedas}`}
                                                onCheckedChange={() => toggleEstado(moneda.id, 'estadoMoneda', moneda.estadoMoneda)}
                                            />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground">Inventario</span>
                                        {loadingToggle === `${moneda.id}-activosInventory` ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        ) : (
                                            <Switch
                                                id={`switch-moneda-inventario-${moneda.id}`}
                                                checked={moneda.activosInventory === true}
                                                aria-label={`Disponibilidad de ${moneda.monedas} en inventario`}
                                                onCheckedChange={() => toggleEstado(moneda.id, 'activosInventory', moneda.activosInventory === true)}
                                            />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground">Wompi</span>
                                        {loadingToggle === `${moneda.id}-activoWompi` ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        ) : (
                                            <Switch
                                                id={`switch-moneda-wompi-${moneda.id}`}
                                                checked={moneda.activoWompi === true}
                                                aria-label={`Disponibilidad de ${moneda.monedas} en Wompi`}
                                                onCheckedChange={() => toggleEstado(moneda.id, 'activoWompi', moneda.activoWompi === true)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
