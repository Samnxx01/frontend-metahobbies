import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { swalFire as Swal } from '@/lib/sweetalert';
import { apiFetch } from '@/app/services/api';
import productosService, { type BackendTipoProducto } from '@/app/services/productosService';
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
import {
    Popover, PopoverContent, PopoverDescription, PopoverHeader,
    PopoverTitle, PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, Plus, RefreshCw, Tag, AlertCircle, Pencil,
    CheckCircle2, XCircle, DollarSign, ListFilter, CircleHelp, Trash2,
} from 'lucide-react';
import {
    MEMBRESIA_PRECIO_CREATE_URL,
    MEMBRESIA_PRECIO_LIST_URL,
    MEMBRESIA_OPCIONES_PAGO_URL,
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
    tipoProducto: string;
    monedasId: string;
    metodoPagoCodigo: string;
}

interface EditarForm {
    nombreMembresia: string;
    descripcion: string;
    precioMembresia: string;
    tipoPagos: string;
    tipoProducto: string;
    monedasId: string;
    metodoPagoCodigo: string;
}

const INITIAL_CREAR: CrearForm = {
    emailInvitado: '',
    nombreMembresia: '',
    descripcion: '',
    precioMembresia: '',
    tipoPagos: '',
    tipoProducto: '',
    monedasId: '',
    metodoPagoCodigo: '',
};

const INITIAL_EDITAR: EditarForm = {
    nombreMembresia: '',
    descripcion: '',
    precioMembresia: '',
    tipoPagos: '',
    tipoProducto: '',
    monedasId: '',
    metodoPagoCodigo: '',
};

interface MetodoPagoOption {
    codigo: string;
    nombre: string;
    descripcion?: string;
}
interface TipoPagoOption {
    codigo: string;
    nombre: string;
    descripcion?: string;
    estado?: boolean;
    /** Vigencia parametrizable en horas (ej: Diario=24, Quincenal=360, Mensual=720, Anual=8760). */
    duracionHoras?: number | null;
}

/** Presets de vigencia sugeridos para no tener que calcular las horas a mano. */
const PRESETS_DURACION_PAGO: { label: string; horas: number }[] = [
    { label: 'Diario', horas: 24 },
    { label: 'Quincenal', horas: 15 * 24 },
    { label: 'Mensual', horas: 30 * 24 },
    { label: 'Anual', horas: 365 * 24 },
];

const formatearDuracion = (horas: number | null | undefined): string => {
    if (!horas || horas <= 0) return 'Sin vigencia definida';
    if (horas % 24 === 0) {
        const dias = horas / 24;
        return `${dias} ${dias === 1 ? 'día' : 'días'} (${horas} h)`;
    }
    return `${horas} h`;
};

const normalizarTipoPago = (raw: unknown): TipoPagoOption | null => {
    if (typeof raw === 'string') {
        const nombre = raw.trim();
        return nombre ? { codigo: nombre, nombre, estado: true, duracionHoras: null } : null;
    }
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const nombre = String(row.nombre ?? row.tipo ?? row.tipoPagos ?? '').trim();
    if (!nombre) return null;
    const duracionRaw = row.duracionHoras;
    const duracionHoras = duracionRaw === null || duracionRaw === undefined || duracionRaw === ''
        ? null
        : Number(duracionRaw);
    return {
        codigo: String(row.codigo ?? row.id ?? row.iud ?? nombre).trim(),
        nombre,
        descripcion: String(row.descripcion ?? '').trim(),
        estado: row.estado !== false && row.activo !== false,
        duracionHoras: Number.isFinite(duracionHoras) ? duracionHoras : null,
    };
};

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
    const [tiposPago, setTiposPago] = useState<TipoPagoOption[]>([]);
    const [tiposProducto, setTiposProducto] = useState<BackendTipoProducto[]>([]);
    const [metodosPago, setMetodosPago] = useState<MetodoPagoOption[]>([]);
    const [loadingOpcionesPago, setLoadingOpcionesPago] = useState(false);
    const [modalTipoPago, setModalTipoPago] = useState(false);
    const [tipoPagoDraft, setTipoPagoDraft] = useState<TipoPagoOption>({ codigo: '', nombre: '', descripcion: '', estado: true, duracionHoras: null });
    const [duracionUnidad, setDuracionUnidad] = useState<'HORAS' | 'DIAS'>('DIAS');
    const [guardandoTipoPago, setGuardandoTipoPago] = useState(false);
    const [eliminandoTipoPagoCodigo, setEliminandoTipoPagoCodigo] = useState<string | null>(null);

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
                    .filter((m): m is MonedaRow =>
                        m !== null && m.estadoMoneda && m.activoWompi === true
                    );
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
            const rows = raw.map(normalizeMembresiaPrecioFromApi).filter((m): m is MembresiaPrecioRow => m !== null);
            setMembresias(rows);
        } catch { /* no bloqueante */ }
        finally { setLoadingMembresias(false); }
    }, []);

    const cargarOpcionesPago = useCallback(async () => {
        setLoadingOpcionesPago(true);
        try {
            const res = await apiFetch(MEMBRESIA_OPCIONES_PAGO_URL, { method: 'GET' });
            const data = res?.data ?? res ?? {};
            const tiposRaw = Array.isArray(data)
                ? data
                : (data.tiposPago ?? data.tipos ?? data.items ?? []);
            const tipos = (Array.isArray(tiposRaw) ? tiposRaw : [])
                .map(normalizarTipoPago)
                .filter((tipo): tipo is TipoPagoOption => tipo !== null);
            setTiposPago(tipos);
            setMetodosPago(Array.isArray(data.metodosPago) ? data.metodosPago : []);
        } catch {
            setTiposPago([]);
        } finally {
            setLoadingOpcionesPago(false);
        }
    }, []);

    const cargarTiposProducto = useCallback(async () => {
        try {
            const rows = await productosService.listarTiposProducto();
            setTiposProducto(rows.filter(tipo => tipo.estado !== false));
        } catch {
            setTiposProducto([]);
        }
    }, []);

    const guardarTipoPago = async () => {
        if (!tipoPagoDraft.nombre.trim()) {
            mostrarError('El nombre del tipo de pago es obligatorio.');
            return;
        }
        setGuardandoTipoPago(true);
        try {
            const codigo = tipoPagoDraft.codigo.trim();
            await apiFetch(
                codigo
                    ? `/api/membresia/seguridad/parametrizacion/tipos-pago/${encodeURIComponent(codigo)}`
                    : '/api/membresia/seguridad/parametrizacion/tipos-pago',
                {
                    method: codigo ? 'PUT' : 'POST',
                    body: {
                        codigo: codigo || undefined,
                        nombre: tipoPagoDraft.nombre.trim(),
                        descripcion: tipoPagoDraft.descripcion?.trim() || '',
                        duracionHoras: tipoPagoDraft.duracionHoras || null,
                        estado: tipoPagoDraft.estado !== false,
                    },
                }
            );
            toast.success('Tipo de pago guardado.');
            setTipoPagoDraft({ codigo: '', nombre: '', descripcion: '', estado: true, duracionHoras: null });
            setDuracionUnidad('DIAS');
            await cargarOpcionesPago();
        } catch (error: any) {
            mostrarError(error.message || 'No se pudo guardar el tipo de pago.');
        } finally {
            setGuardandoTipoPago(false);
        }
    };

    const eliminarTipoPago = async (tipo: TipoPagoOption) => {
        if (!tipo.codigo || eliminandoTipoPagoCodigo) return;
        const confirmacion = await Swal({
            title: '¿Eliminar tipo de pago?',
            text: `Se eliminará "${tipo.nombre}". Si alguna membresía ya lo usa, no se podrá eliminar hasta reasignarla.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
        });
        if (!confirmacion.isConfirmed) return;
        setEliminandoTipoPagoCodigo(tipo.codigo);
        try {
            await apiFetch(`/api/membresia/seguridad/parametrizacion/tipos-pago/${encodeURIComponent(tipo.codigo)}`, {
                method: 'DELETE',
            });
            toast.success('Tipo de pago eliminado.');
            setTiposPago(actuales => actuales.filter(t => t.codigo !== tipo.codigo));
            if (tipoPagoDraft.codigo === tipo.codigo) {
                setTipoPagoDraft({ codigo: '', nombre: '', descripcion: '', estado: true, duracionHoras: null });
                setDuracionUnidad('DIAS');
            }
        } catch (error: any) {
            mostrarError(error.message || 'No se pudo eliminar el tipo de pago.');
        } finally {
            setEliminandoTipoPagoCodigo(null);
        }
    };

    useEffect(() => {
        cargarMonedas();
        cargarMembresias();
        cargarOpcionesPago();
        cargarTiposProducto();
    }, [cargarMonedas, cargarMembresias, cargarOpcionesPago, cargarTiposProducto]);

    const abrirEditar = (m: MembresiaPrecioRow) => {
        setEditandoId(m.id);
        setFormEditar({
            nombreMembresia: m.nombreMembresia,
            descripcion: m.descripcion ?? '',
            precioMembresia: String(normalizarPrecioDesdeCentavos(m.precioMembresia)),
            tipoPagos: m.tipoPagos ?? '',
            tipoProducto: m.tipoProducto ?? '',
            monedasId: m.monedaId ?? '',
            metodoPagoCodigo: m.metodoPagoCodigo,
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
        if (!formCrear.monedasId) {
            mostrarError('Selecciona una moneda para crear la membresía.');
            return;
        }
        setLoadingAccion('parametrizar');
        try {
            const body: Record<string, unknown> = {
                nombreMembresia: formCrear.nombreMembresia.trim(),
                descripcion: formCrear.descripcion.trim(),
                precioMembresia: Number(formCrear.precioMembresia),
                tipoPagos: formCrear.tipoPagos || null,
                tipoProducto: formCrear.tipoProducto || null,
                metodoPagoCodigo: formCrear.metodoPagoCodigo || null,
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
        if (!formEditar.monedasId) {
            mostrarError('Selecciona una moneda para guardar la membresía.');
            return;
        }
        setLoadingEditar(true);
        try {
            const body: Record<string, unknown> = {
                nombreMembresia: formEditar.nombreMembresia.trim(),
                descripcion: formEditar.descripcion.trim(),
                precioMembresia: Number(formEditar.precioMembresia),
                tipoPagos: formEditar.tipoPagos || null,
                tipoProducto: formEditar.tipoProducto || null,
                metodoPagoCodigo: formEditar.metodoPagoCodigo || null,
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
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-foreground">Comprar membresía</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Genera la membresía para un usuario usando el token de la sesión activa.
                                </p>
                            </div>
                            <WidgetHelpButton
                                title="¿Cómo comprar una membresía?"
                                description="Crea una membresía para el usuario invitado utilizando tu sesión activa."
                                steps={[
                                    'Escribe el correo electrónico del usuario que recibirá la membresía.',
                                    'Verifica que el correo sea correcto y que tu sesión continúe activa.',
                                    'Pulsa Comprar membresía para completar la asignación.',
                                ]}
                            />
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
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-foreground">Parametrizar membresía</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Define el precio y condiciones de una nueva parametrización en el sistema.
                                </p>
                            </div>
                            <WidgetHelpButton
                                title="¿Cómo parametrizar una membresía?"
                                description="Define la oferta que estará disponible en el sistema y sus condiciones de cobro."
                                steps={[
                                    'Ingresa un nombre, un precio mayor a cero y una descripción clara.',
                                    'Selecciona el tipo de pago, producto, método de pago y la moneda correspondiente.',
                                    'Si el tipo de pago no existe, créalo con Parametrizar tipo de pago.',
                                    'Pulsa Crear membresía para guardar la nueva parametrización.',
                                ]}
                            />
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

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <FieldWrapper label="Tipo de pago">
                                <Button
                                    id="btn-parametrizar-tipo-pago-membresia"
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mb-2 h-8 w-full justify-start px-3 text-xs"
                                    onClick={() => setModalTipoPago(true)}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Parametrizar tipo de pago
                                </Button>
                                <SelectTipoPago
                                    value={formCrear.tipoPagos}
                                    onChange={v => updateCrear('tipoPagos', v)}
                                    options={tiposPago}
                                    loading={loadingOpcionesPago}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Tipo de producto">
                                <SelectTipoProducto
                                    value={formCrear.tipoProducto}
                                    onChange={v => updateCrear('tipoProducto', v)}
                                    options={tiposProducto}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Método de pago">
                                <SelectMetodoPago
                                    value={formCrear.metodoPagoCodigo}
                                    onChange={v => updateCrear('metodoPagoCodigo', v)}
                                    options={metodosPago}
                                    loading={loadingOpcionesPago}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Moneda" required>
                                <Select
                                    value={formCrear.monedasId}
                                    onValueChange={v => updateCrear('monedasId', v)}
                                    disabled={loadingMonedas}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder={loadingMonedas ? 'Cargando...' : 'Seleccionar moneda'} />
                                    </SelectTrigger>
                                    <SelectContent>
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
                            Crear membresía
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
                            <div className="flex shrink-0 items-center gap-2">
                                <WidgetHelpButton
                                    title="¿Cómo gestionar las parametrizaciones?"
                                    description="Consulta las membresías configuradas y mantén actualizados sus datos comerciales."
                                    steps={[
                                        'Revisa nombre, precio, periodicidad, moneda y estado de sincronización con Wompi.',
                                        'Usa Editar para modificar los datos de una membresía existente.',
                                        'Usa Recargar para consultar nuevamente la información más reciente.',
                                    ]}
                                />
                                <button
                                    type="button"
                                    onClick={cargarMembresias}
                                    disabled={loadingMembresias}
                                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Recargar tabla"
                                    aria-label="Recargar parametrizaciones"
                                >
                                    {loadingMembresias
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <RefreshCw className="w-3.5 h-3.5" />
                                    }
                                </button>
                            </div>
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

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <FieldWrapper label="Tipo de pago">
                                <SelectTipoPago
                                    value={formEditar.tipoPagos}
                                    onChange={v => updateEditar('tipoPagos', v)}
                                    options={tiposPago}
                                    loading={loadingOpcionesPago}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Tipo de producto">
                                <SelectTipoProducto
                                    value={formEditar.tipoProducto}
                                    onChange={v => updateEditar('tipoProducto', v)}
                                    options={tiposProducto}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Método de pago">
                                <SelectMetodoPago
                                    value={formEditar.metodoPagoCodigo}
                                    onChange={v => updateEditar('metodoPagoCodigo', v)}
                                    options={metodosPago}
                                    loading={loadingOpcionesPago}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Moneda" required>
                                <Select
                                    value={formEditar.monedasId}
                                    onValueChange={v => updateEditar('monedasId', v)}
                                    disabled={loadingMonedas}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Seleccionar moneda" />
                                    </SelectTrigger>
                                    <SelectContent>
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
            <Dialog open={modalTipoPago} onOpenChange={setModalTipoPago}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Parametrizar tipos de pago</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <FieldWrapper label="Nombre" required>
                            <Input
                                value={tipoPagoDraft.nombre}
                                onChange={e => setTipoPagoDraft(p => ({ ...p, nombre: e.target.value }))}
                                placeholder="Ej: Mensual"
                            />
                        </FieldWrapper>
                        <FieldWrapper label="Descripción">
                            <Input
                                value={tipoPagoDraft.descripcion || ''}
                                onChange={e => setTipoPagoDraft(p => ({ ...p, descripcion: e.target.value }))}
                            />
                        </FieldWrapper>
                        <FieldWrapper
                            label="Duración de vigencia"
                            hint="opcional"
                        >
                            <div className="flex flex-wrap gap-1.5">
                                {PRESETS_DURACION_PAGO.map(preset => (
                                    <button
                                        type="button"
                                        key={preset.label}
                                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${tipoPagoDraft.duracionHoras === preset.horas
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:bg-muted'
                                            }`}
                                        onClick={() => {
                                            setTipoPagoDraft(p => ({ ...p, duracionHoras: preset.horas }));
                                            setDuracionUnidad(preset.horas % 24 === 0 && preset.horas > 24 ? 'DIAS' : 'HORAS');
                                        }}
                                    >
                                        {preset.label} · {preset.horas % 24 === 0 ? `${preset.horas / 24} d` : `${preset.horas} h`}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    placeholder="Cantidad"
                                    value={
                                        tipoPagoDraft.duracionHoras
                                            ? String(duracionUnidad === 'DIAS' ? tipoPagoDraft.duracionHoras / 24 : tipoPagoDraft.duracionHoras)
                                            : ''
                                    }
                                    onChange={e => {
                                        const valor = e.target.value === '' ? null : Number(e.target.value);
                                        setTipoPagoDraft(p => ({
                                            ...p,
                                            duracionHoras: valor === null || !Number.isFinite(valor)
                                                ? null
                                                : (duracionUnidad === 'DIAS' ? valor * 24 : valor),
                                        }));
                                    }}
                                    className="h-9 text-sm"
                                />
                                <Select value={duracionUnidad} onValueChange={v => setDuracionUnidad(v as 'HORAS' | 'DIAS')}>
                                    <SelectTrigger className="h-9 w-28 shrink-0 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HORAS">Horas</SelectItem>
                                        <SelectItem value="DIAS">Días</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                {formatearDuracion(tipoPagoDraft.duracionHoras)} · define cada cuánto vence una membresía con este tipo de pago.
                            </p>
                        </FieldWrapper>
                        <div className="space-y-2">
                            {tiposPago.map(tipo => (
                                <div
                                    key={tipo.codigo}
                                    className="flex w-full items-center gap-2 rounded-md border p-2 text-sm"
                                >
                                    <button
                                        type="button"
                                        className="flex flex-1 items-center justify-between text-left"
                                        onClick={() => {
                                            setTipoPagoDraft(tipo);
                                            setDuracionUnidad(tipo.duracionHoras && tipo.duracionHoras % 24 === 0 ? 'DIAS' : 'HORAS');
                                        }}
                                    >
                                        <span className="flex flex-col">
                                            <span>{tipo.nombre}</span>
                                            <span className="text-[11px] text-muted-foreground">{formatearDuracion(tipo.duracionHoras)}</span>
                                        </span>
                                        <Badge variant={tipo.estado === false ? 'secondary' : 'outline'}>
                                            {tipo.estado === false ? 'Inactivo' : 'Activo'}
                                        </Badge>
                                    </button>
                                    <button
                                        type="button"
                                        title={`Eliminar ${tipo.nombre}`}
                                        aria-label={`Eliminar ${tipo.nombre}`}
                                        disabled={eliminandoTipoPagoCodigo === tipo.codigo}
                                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                        onClick={() => void eliminarTipoPago(tipo)}
                                    >
                                        {eliminandoTipoPagoCodigo === tipo.codigo
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Trash2 className="h-3.5 w-3.5" />
                                        }
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button id="btn-cerrar-parametrizacion-tipo-pago" variant="outline" onClick={() => setModalTipoPago(false)}>Cerrar</Button>
                        <Button id="btn-guardar-tipo-pago-membresia" onClick={() => void guardarTipoPago()} disabled={guardandoTipoPago}>
                            {guardandoTipoPago && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar tipo
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

function WidgetHelpButton({
    title,
    description,
    steps,
}: {
    title: string;
    description: string;
    steps: string[];
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
                    aria-label={`Ayuda: ${title}`}
                >
                    <CircleHelp className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ayuda</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
                <PopoverHeader>
                    <PopoverTitle className="text-sm">{title}</PopoverTitle>
                    <PopoverDescription asChild>
                        <div className="space-y-3 pt-1 text-xs leading-relaxed text-muted-foreground">
                            <p>{description}</p>
                            <ol className="list-decimal space-y-1.5 pl-4">
                                {steps.map(step => <li key={step}>{step}</li>)}
                            </ol>
                        </div>
                    </PopoverDescription>
                </PopoverHeader>
            </PopoverContent>
        </Popover>
    );
}

function SelectTipoPago({
    value,
    onChange,
    options,
    loading,
}: {
    value: string;
    onChange: (v: string) => void;
    options: TipoPagoOption[];
    loading: boolean;
}) {
    return (
        <Select
            value={value || '__none__'}
            onValueChange={v => onChange(v === '__none__' ? '' : v)}
            disabled={loading}
        >
            <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={loading ? 'Cargando...' : 'Seleccionar tipo'} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__none__">Sin tipo de pago</SelectItem>
                {options.map(tipo => (
                    <SelectItem key={tipo.codigo} value={tipo.nombre}>{tipo.nombre}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function SelectTipoProducto({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: BackendTipoProducto[];
}) {
    return (
        <Select value={value || '__none__'} onValueChange={v => onChange(v === '__none__' ? '' : v)}>
            <SelectTrigger id="select-tipo-producto-membresia" className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__none__">Sin tipo de producto</SelectItem>
                {options.map(tipo => (
                    <SelectItem key={tipo.codigo || tipo.iud || tipo._id} value={tipo.nombre}>
                        {tipo.nombre}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function SelectMetodoPago({
    value,
    onChange,
    options,
    loading,
}: {
    value: string;
    onChange: (v: string) => void;
    options: MetodoPagoOption[];
    loading: boolean;
}) {
    return (
        <Select
            value={value || '__none__'}
            onValueChange={v => onChange(v === '__none__' ? '' : v)}
            disabled={loading}
        >
            <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={loading ? 'Cargando...' : 'Seleccionar método'} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__none__">Sin método de pago</SelectItem>
                {options.map(metodo => (
                    <SelectItem key={metodo.codigo} value={metodo.codigo}>
                        {metodo.nombre}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
