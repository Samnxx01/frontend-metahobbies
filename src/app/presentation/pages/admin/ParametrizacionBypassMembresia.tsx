import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight, Settings2 } from 'lucide-react';
import {
    getBypassMembresiaAdmin,
    upsertBypassMembresia,
    toggleBypassMembresia,
    agregarTipoAtribucion,
    eliminarTipoAtribucion,
    type BypassMembresiaConfig,
    type BypassAtribucionTipo,
} from '@/app/services/politicaBypassService';

export default function ParametrizacionBypassMembresia(): React.ReactElement {
    const [config, setConfig] = useState<BypassMembresiaConfig | null>(null);
    const [originType, setOriginType] = useState<string>('organico');
    const [referidorEmail, setReferidorEmail] = useState<string>('');
    const [tiposAtribucion, setTiposAtribucion] = useState<BypassAtribucionTipo[]>([]);
    const [nuevoValor, setNuevoValor] = useState('');
    const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
    const [loadingGet, setLoadingGet] = useState(true);
    const [loadingSave, setLoadingSave] = useState(false);
    const [loadingToggle, setLoadingToggle] = useState(false);
    const [loadingTipo, setLoadingTipo] = useState<string | null>(null); // valor del tipo en proceso

    const cargar = async (): Promise<void> => {
        setLoadingGet(true);
        try {
            const data = await getBypassMembresiaAdmin();
            setConfig(data);
            if (data?.originType) setOriginType(data.originType);
            setReferidorEmail(data?.referidorEmail ?? '');
            setTiposAtribucion(data?.tiposAtribucion ?? []);
        } catch {
            toast.error('No se pudo cargar la configuración de bypass.');
        } finally {
            setLoadingGet(false);
        }
    };

    useEffect(() => { void cargar(); }, []);

    const handleAgregarTipo = async (): Promise<void> => {
        const valor = nuevoValor.trim().toLowerCase();
        const etiqueta = nuevaEtiqueta.trim();
        if (!valor || !etiqueta) {
            toast.error('Completa el valor y la etiqueta.');
            return;
        }
        setLoadingTipo('__nuevo__');
        try {
            const tipos = await agregarTipoAtribucion({ valor, etiqueta });
            setTiposAtribucion(tipos);
            setNuevoValor('');
            setNuevaEtiqueta('');
            toast.success('Tipo de atribución guardado.');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al agregar tipo.');
        } finally {
            setLoadingTipo(null);
        }
    };

    const handleEliminarTipo = async (valor: string): Promise<void> => {
        setLoadingTipo(valor);
        try {
            const tipos = await eliminarTipoAtribucion(valor);
            setTiposAtribucion(tipos);
            if (originType === valor) setOriginType(tipos[0]?.valor ?? 'organico');
            toast.success('Tipo eliminado.');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al eliminar tipo.');
        } finally {
            setLoadingTipo(null);
        }
    };

    const handleGuardar = async (): Promise<void> => {
        setLoadingSave(true);
        try {
            await upsertBypassMembresia({
                activo: config?.activo ?? true,
                originType,
                originId: null,
                referidorEmail: referidorEmail.trim() || null,
                tiposAtribucion,
            });
            toast.success('Configuración guardada.');
            await cargar();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar.');
        } finally {
            setLoadingSave(false);
        }
    };

    const handleToggle = async (): Promise<void> => {
        const nuevoEstado = !(config?.activo ?? false);
        setLoadingToggle(true);
        try {
            await toggleBypassMembresia(nuevoEstado);
            toast.success(`Bypass ${nuevoEstado ? 'activado' : 'desactivado'}.`);
            await cargar();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al cambiar estado.');
        } finally {
            setLoadingToggle(false);
        }
    };

    if (loadingGet) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const activo = config?.activo ?? false;
    const opcionesSelect = tiposAtribucion.length > 0
        ? tiposAtribucion
        : [{ valor: 'organico', etiqueta: 'Orgánico' }];

    return (
        <div className="max-w-xl mx-auto py-4 px-2 space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-lg">Bypass de Membresía</CardTitle>
                        </div>
                        <Badge variant={activo ? 'default' : 'secondary'}>
                            {activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                    </div>
                    <CardDescription>
                        Cuando está activo, cualquier usuario público puede iniciar el flujo
                        de membresía sin necesitar un enlace de referido previo.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">

                    {/* Toggle activo/inactivo */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <p className="text-sm font-medium">Estado del bypass</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {activo
                                    ? 'Los usuarios pueden entrar sin enlace de invitación.'
                                    : 'Se requiere enlace de invitación para unirse.'}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleToggle()}
                            disabled={loadingToggle}
                            className="h-10 w-10"
                        >
                            {loadingToggle
                                ? <Loader2 className="h-5 w-5 animate-spin" />
                                : activo
                                    ? <ToggleRight className="h-7 w-7 text-primary" />
                                    : <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                            }
                        </Button>
                    </div>

                    {/* Correo del referidor orgánico */}
                    <div className="space-y-1.5">
                        <Label htmlFor="referidorEmail">Correo del referidor orgánico</Label>
                        <Input
                            id="referidorEmail"
                            type="email"
                            placeholder="referidor@ejemplo.com"
                            value={referidorEmail}
                            onChange={(e) => setReferidorEmail(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Usuario que recibe la atribución cuando alguien entra sin enlace de referido.
                        </p>
                    </div>

                    {/* Tipos de atribución — persisten inmediato en DB */}
                    <div className="space-y-2">
                        <Label>Tipos de atribución</Label>
                        <p className="text-xs text-muted-foreground">
                            Cada tipo se guarda en la colección al presionar +.
                        </p>

                        {tiposAtribucion.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">
                                Sin tipos definidos — se usará &quot;orgánico&quot; por defecto.
                            </p>
                        )}

                        {tiposAtribucion.length > 0 && (
                            <div className="rounded-lg border divide-y text-sm">
                                {tiposAtribucion.map((t) => (
                                    <div key={t.valor} className="flex items-center justify-between px-3 py-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                {t.valor}
                                            </span>
                                            <span className="text-muted-foreground">{t.etiqueta}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            disabled={loadingTipo === t.valor}
                                            onClick={() => void handleEliminarTipo(t.valor)}
                                        >
                                            {loadingTipo === t.valor
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Trash2 className="h-3.5 w-3.5" />
                                            }
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulario agregar tipo */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="valor (ej: producto)"
                                value={nuevoValor}
                                onChange={(e) => setNuevoValor(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => { if (e.key === 'Enter') void handleAgregarTipo(); }}
                            />
                            <Input
                                placeholder="etiqueta (ej: Producto)"
                                value={nuevaEtiqueta}
                                onChange={(e) => setNuevaEtiqueta(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => { if (e.key === 'Enter') void handleAgregarTipo(); }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={loadingTipo === '__nuevo__'}
                                onClick={() => void handleAgregarTipo()}
                                className="shrink-0"
                            >
                                {loadingTipo === '__nuevo__'
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Plus className="h-4 w-4" />
                                }
                            </Button>
                        </div>
                    </div>

                    {/* Atribución por defecto — select dinámico desde DB */}
                    <div className="space-y-1.5">
                        <Label htmlFor="originType">Atribución por defecto</Label>
                        <Select value={originType} onValueChange={setOriginType}>
                            <SelectTrigger id="originType">
                                <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                {opcionesSelect.map((t) => (
                                    <SelectItem key={t.valor} value={t.valor}>
                                        {t.etiqueta}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Tipo asignado a usuarios que entran sin enlace de referido.
                        </p>
                    </div>

                    {/* Guardar configuración principal */}
                    <Button
                        onClick={() => void handleGuardar()}
                        disabled={loadingSave}
                        className="w-full"
                    >
                        {loadingSave
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando…</>
                            : config ? 'Actualizar configuración' : 'Crear configuración'
                        }
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
