import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, Plus, RefreshCw, Tag, AlertCircle, Pencil,
    CheckCircle2, XCircle, DollarSign, ListFilter,
} from 'lucide-react';
import {
    MEMBRESIA_PRECIO_CREATE_URL,
    MEMBRESIA_PRECIO_LIST_URL,
    MONEDAS_LIST_URL,
    membresiaPrecioUpdatePath,
    normalizeMembresiaPrecioFromApi,
    normalizeMonedaFromApi,
    resolveMonedaIdForApiBody,
    type MembresiaPrecioApiRow,
    type MembresiaPrecioRow,
    type MonedaApiRow,
    type MonedaRow,
} from './parametrizacionMembresiaApi';

interface CrearForm {
    emailInvitado: string;
    nombreMembresia: string;
    descripcion: string;
    precioMembresia: string;
    tipoPagos: string;
    monedasId: string;
}

interface EditarForm {
    nombreMembresia: string;
    descripcion: string;
    precioMembresia: string;
    tipoPagos: string;
    monedasId: string;
}

const INITIAL_CREAR: CrearForm = {
    emailInvitado: '',
    nombreMembresia: '',
    descripcion: '',
    precioMembresia: '',
    tipoPagos: '',
    monedasId: '',
};

const INITIAL_EDITAR: EditarForm = {
    nombreMembresia: '',
    descripcion: '',
    precioMembresia: '',
    tipoPagos: '',
    monedasId: '',
};

const TIPO_PAGOS = ['Único', 'Mensual', 'Anual'] as const;

const normalizarPrecioDesdeCentavos = (valor: number | string | null | undefined) =>
    Number(valor || 0) / 100;

const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
        normalizarPrecioDesdeCentavos(n)
    );

const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

export default function ConfiguracionMembresia() {
    const [loadingAccion, setLoadingAccion] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [formCrear, setFormCrear] = useState<CrearForm>(INITIAL_CREAR);

    // Monedas
    const [monedas, setMonedas] = useState<MonedaRow[]>([]);
    const [loadingMonedas, setLoadingMonedas] = useState(false);

    // Tabla de membresías
    const [membresias, setMembresias] = useState<MembresiaPrecioRow[]>([]);
    const [loadingMembresias, setLoadingMembresias] = useState(false);

    // Modal de edición
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [formEditar, setFormEditar] = useState<EditarForm>(INITIAL_EDITAR);
    const [loadingEditar, setLoadingEditar] = useState(false);

    const mostrarError = (texto: string) => {
        setErrorMsg(texto);
        setTimeout(() => setErrorMsg(null), 5000);
    };

    const cargarMonedas = useCallback(async () => {
        setLoadingMonedas(true);
        try {
            const res = await apiFetch(MONEDAS_LIST_URL, { method: 'GET' });
            if (res?.monedas) {
                const rows = (res.monedas as MonedaApiRow[])
                    .map(normalizeMonedaFromApi)
                    .filter((m): m is MonedaRow => m !== null && m.estadoMoneda);
                setMonedas(rows);
            }
        } catch { /* no bloqueante */ }
        finally { setLoadingMonedas(false); }
    }, []);

    const cargarMembresias = useCallback(async () => {
        setLoadingMembresias(true);
        try {
            const res = await apiFetch(MEMBRESIA_PRECIO_LIST_URL, { method: 'GET' });
            const raw = Array.isArray(res?.data) ? res.data as MembresiaPrecioApiRow[] : [];
            setMembresias(raw.map(normalizeMembresiaPrecioFromApi).filter((m): m is MembresiaPrecioRow => m !== null));
        } catch { /* no bloqueante */ }
        finally { setLoadingMembresias(false); }
    }, []);

    useEffect(() => {
        cargarMonedas();
        cargarMembresias();
    }, [cargarMonedas, cargarMembresias]);

    const abrirEditar = (m: MembresiaPrecioRow) => {
        setEditandoId(m.id);
        setFormEditar({
            nombreMembresia: m.nombreMembresia,
            descripcion: m.descripcion ?? '',
            precioMembresia: String(normalizarPrecioDesdeCentavos(m.precioMembresia)),
            tipoPagos: m.tipoPagos ?? '',
            monedasId: m.monedaId ?? '',
        });
        setModalAbierto(true);
    };

    const handleCrear = async () => {
        if (!formCrear.emailInvitado.trim()) {
            mostrarError('El email del invitado es obligatorio.');
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarError('No hay sesión activa. Inicia sesión nuevamente.');
            return;
        }
        setLoadingAccion('crear');
        try {
            await apiFetch(`/api/membresia/seguridad/crear/crearmembresia/${token}`, {
                method: 'POST',
                body: { emailInvitado: formCrear.emailInvitado.trim() },
            });
            toast.success('¡Membresía creada correctamente!');
            setFormCrear(INITIAL_CREAR);
        } catch (err: any) {
            mostrarError(err.message || 'Error al crear la membresía.');
        } finally {
            setLoadingAccion(null);
        }
    };

    const handleCrearParametrizacion = async () => {
        if (!formCrear.nombreMembresia.trim()) {
            mostrarError('El nombre de la membresía es obligatorio.');
            return;
        }
        if (!formCrear.precioMembresia || Number(formCrear.precioMembresia) <= 0) {
            mostrarError('Ingresa un precio válido mayor a cero.');
            return;
        }
        setLoadingAccion('parametrizar');
        try {
            const body: Record<string, unknown> = {
                nombreMembresia: formCrear.nombreMembresia.trim(),
                descripcion: formCrear.descripcion.trim(),
                precioMembresia: Number(formCrear.precioMembresia),
                tipoPagos: formCrear.tipoPagos || undefined,
            };
            if (formCrear.monedasId && formCrear.monedasId !== '__none__') {
                body.monedasId = resolveMonedaIdForApiBody(formCrear.monedasId);
            }
            await apiFetch(MEMBRESIA_PRECIO_CREATE_URL, {
                method: 'POST',
                body,
            });
            toast.success('¡Parametrización de membresía creada exitosamente!');
            setFormCrear(prev => ({ ...INITIAL_CREAR, emailInvitado: prev.emailInvitado }));
            await cargarMembresias(); // refrescar tabla
        } catch (err: any) {
            mostrarError(err.message || 'Error al crear la parametrización.');
        } finally {
            setLoadingAccion(null);
        }
    };

    const handleGuardarEdicion = async () => {
        if (!editandoId) return;
        if (!formEditar.nombreMembresia.trim()) {
            mostrarError('El nombre es obligatorio.');
            return;
        }
        if (!formEditar.precioMembresia || Number(formEditar.precioMembresia) <= 0) {
            mostrarError('Ingresa un precio válido mayor a cero.');
            return;
        }
        setLoadingEditar(true);
        try {
            const body: Record<string, unknown> = {
                nombreMembresia: formEditar.nombreMembresia.trim(),
                descripcion: formEditar.descripcion.trim(),
                precioMembresia: Number(formEditar.precioMembresia),
                tipoPagos: formEditar.tipoPagos || undefined,
            };
            if (formEditar.monedasId && formEditar.monedasId !== '__none__') {
                body.monedasId = resolveMonedaIdForApiBody(formEditar.monedasId);
            }
            await apiFetch(membresiaPrecioUpdatePath(editandoId), {
                method: 'PUT',
                body,
            });
            toast.success('¡Membresía actualizada correctamente!');
            setModalAbierto(false);
            await cargarMembresias();
        } catch (err: any) {
            mostrarError(err.message || 'Error al actualizar.');
        } finally {
            setLoadingEditar(false);
        }
    };

    const updateCrear = (f: keyof CrearForm, v: string) => setFormCrear(p => ({ ...p, [f]: v }));
    const updateEditar = (f: keyof EditarForm, v: string) => setFormEditar(p => ({ ...p, [f]: v }));

    return (
        <>
            <Card className="border border-border/50 shadow-sm">
                {/* Header */}
                <CardHeader className="pb-4 px-6 pt-5 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold text-foreground">
                                Configuración de Membresías
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Crear parametrizaciones y gestionar las existentes
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="px-6 py-5 space-y-6">
                    {/* Error inline */}
                    {errorMsg && (
                        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-xs border bg-destructive/10 dark:bg-destructive/30 text-destructive dark:text-destructive border-destructive/20 dark:border-destructive">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Sección 1: Comprar membresía */}
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-foreground">Comprar membresía</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Genera la membresía para un usuario usando el token de la sesión activa.
                            </p>
                        </div>
                        <FieldWrapper label="Email del invitado" required>
                            <Input
                                type="email"
                                placeholder="usuario@correo.com"
                                value={formCrear.emailInvitado}
                                onChange={e => updateCrear('emailInvitado', e.target.value)}
                                className="h-9 text-sm"
                            />
                        </FieldWrapper>
                        <Button
                            size="sm" variant="outline"
                            onClick={handleCrear}
                            disabled={!!loadingAccion}
                            className="gap-2"
                        >
                            {loadingAccion === 'crear'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Plus className="w-3.5 h-3.5" />
                            }
                            Comprar membresía
                        </Button>
                    </div>

                    <Separator />

                    {/* Sección 2: Parametrizar */}
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-foreground">Parametrizar membresía</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Define el precio y condiciones de una nueva parametrización en el sistema.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FieldWrapper label="Nombre de la membresía" required>
                                <Input
                                    placeholder="Membresía Premium"
                                    value={formCrear.nombreMembresia}
                                    onChange={e => updateCrear('nombreMembresia', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Precio" required>
                                <Input
                                    type="number" min={1}
                                    placeholder="2000"
                                    value={formCrear.precioMembresia}
                                    onChange={e => updateCrear('precioMembresia', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </FieldWrapper>
                        </div>

                        <FieldWrapper label="Descripción">
                            <Textarea
                                placeholder="Acceso completo a todos los beneficios MABS."
                                value={formCrear.descripcion}
                                onChange={e => updateCrear('descripcion', e.target.value)}
                                className="text-sm resize-none" rows={2}
                            />
                        </FieldWrapper>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FieldWrapper label="Tipo de pago">
                                <SelectTipoPago
                                    value={formCrear.tipoPagos}
                                    onChange={v => updateCrear('tipoPagos', v)}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Moneda" hint="Opcional">
                                <Select
                                    value={formCrear.monedasId || '__none__'}
                                    onValueChange={v => updateCrear('monedasId', v === '__none__' ? '' : v)}
                                    disabled={loadingMonedas}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder={loadingMonedas ? 'Cargando...' : 'Sin moneda específica'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Sin moneda específica</SelectItem>
                                        {monedas.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.monedas}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FieldWrapper>
                        </div>

                        <Button
                            size="sm"
                            onClick={handleCrearParametrizacion}
                            disabled={!!loadingAccion}
                            className="gap-2"
                        >
                            {loadingAccion === 'parametrizar'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Plus className="w-3.5 h-3.5" />
                            }
                            Crear parametrización
                        </Button>
                    </div>

                    <Separator />

                    {/* Sección 3: Tabla de membresías existentes */}
                    <div className="space-y-3">
                        {/* Título + descripción */}
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ListFilter className="w-3.5 h-3.5 text-primary" />
                                    <p className="text-xs font-semibold text-foreground">
                                        Parametrizaciones existentes
                                    </p>
                                    {membresias.length > 0 && (
                                        <Badge variant="secondary" className="text-[10px]">
                                            {membresias.length}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Lista de todas las parametrizaciones de precio registradas en el sistema.
                                    Haz click en el ícono de edición para modificar una membresía.
                                </p>
                            </div>
                            <button
                                onClick={cargarMembresias}
                                disabled={loadingMembresias}
                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                                title="Recargar tabla"
                            >
                                {loadingMembresias
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <RefreshCw className="w-3.5 h-3.5" />
                                }
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto rounded-xl border border-border/50">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border/40 bg-muted/30">
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Nombre
                                        </th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Precio
                                        </th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                                            Tipo de pago
                                        </th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                                            Moneda
                                        </th>
                                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                                            Creación
                                        </th>
                                        <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Wompi
                                        </th>
                                        <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {loadingMembresias ? (
                                        /* Skeleton rows */
                                        Array.from({ length: 2 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                {Array.from({ length: 7 }).map((_, j) => (
                                                    <td key={j} className="px-4 py-3">
                                                        <div className="h-4 rounded bg-muted/50" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : membresias.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <DollarSign className="w-7 h-7 text-muted-foreground/30" />
                                                    <span className="text-xs text-muted-foreground">
                                                        No hay parametrizaciones registradas aún.
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        membresias.map(m => {
                                            const monedaLabel = m.monedaLabel;
                                            return (
                                                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-foreground max-w-[180px]">
                                                        <span className="truncate block" title={m.nombreMembresia}>
                                                            {m.nombreMembresia}
                                                        </span>
                                                        {m.esPrecioDefault && (
                                                            <Badge variant="outline" className="text-[10px] mt-0.5 py-0">
                                                                Default
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono font-medium text-foreground whitespace-nowrap">
                                                        {fmt(m.precioMembresia)}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                                        {m.tipoPagos || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        {monedaLabel ? (
                                                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold">
                                                                {monedaLabel}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                                                        {fmtFecha(m.creacionDate)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {m.esPrecioDefault ? (
                                                            <span className="inline-flex items-center gap-1 text-success dark:text-success">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                <span className="text-[11px] font-medium">Sincronizado</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                <span className="text-[11px]">No sincronizado</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => abrirEditar(m)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                                            title="Editar membresía"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Editar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de edición */}
            <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-sm">
                            <Pencil className="w-4 h-4 text-primary" />
                            Editar parametrización
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FieldWrapper label="Nombre de la membresía" required>
                                <Input
                                    placeholder="Membresía Premium Plus"
                                    value={formEditar.nombreMembresia}
                                    onChange={e => updateEditar('nombreMembresia', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Precio" required>
                                <Input
                                    type="number" min={1}
                                    placeholder="2500"
                                    value={formEditar.precioMembresia}
                                    onChange={e => updateEditar('precioMembresia', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </FieldWrapper>
                        </div>

                        <FieldWrapper label="Descripción">
                            <Textarea
                                placeholder="Descripción de la membresía."
                                value={formEditar.descripcion}
                                onChange={e => updateEditar('descripcion', e.target.value)}
                                className="text-sm resize-none" rows={2}
                            />
                        </FieldWrapper>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FieldWrapper label="Tipo de pago">
                                <SelectTipoPago
                                    value={formEditar.tipoPagos}
                                    onChange={v => updateEditar('tipoPagos', v)}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Moneda" hint="Opcional">
                                <Select
                                    value={formEditar.monedasId || '__none__'}
                                    onValueChange={v => updateEditar('monedasId', v === '__none__' ? '' : v)}
                                    disabled={loadingMonedas}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Sin moneda específica" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Sin moneda específica</SelectItem>
                                        {monedas.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.monedas}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FieldWrapper>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => setModalAbierto(false)}
                            disabled={loadingEditar}
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleGuardarEdicion}
                            disabled={loadingEditar}
                            className="gap-2"
                        >
                            {loadingEditar
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RefreshCw className="w-3.5 h-3.5" />
                            }
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function FieldWrapper({
    label, required, hint, children,
}: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                {label}
                {required && <span className="text-destructive">*</span>}
                {hint && (
                    <Badge variant="outline" className="text-[10px] font-normal ml-1 py-0">
                        {hint}
                    </Badge>
                )}
            </Label>
            {children}
        </div>
    );
}

function SelectTipoPago({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
                {TIPO_PAGOS.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
