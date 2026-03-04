import { useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, RefreshCw, Tag, CheckCircle2, AlertCircle } from 'lucide-react';

interface MembresiaForm {
    emailInvitado: string;
    nombreMembresia: string;
    descripcion: string;
    precioMembresia: string;
    tipoPagos: string;
    monedasId: string;
}

interface MembresiaActualizarForm extends MembresiaForm {
    id: string;
}

const INITIAL_FORM: MembresiaForm = {
    emailInvitado: '',
    nombreMembresia: '',
    descripcion: '',
    precioMembresia: '',
    tipoPagos: '',
    monedasId: '',
};

const TIPO_PAGOS = ['Único', 'Mensual', 'Anual'] as const;

type TabActiva = 'crear' | 'actualizar';
type MensajeTipo = 'success' | 'error';

interface Mensaje {
    tipo: MensajeTipo;
    texto: string;
}


export default function ConfiguracionMembresia() {
    const [tabActiva, setTabActiva] = useState<TabActiva>('crear');
    const [loadingAccion, setLoadingAccion] = useState<string | null>(null);
    const [formCrear, setFormCrear] = useState<MembresiaForm>(INITIAL_FORM);
    const [formActualizar, setFormActualizar] = useState<MembresiaActualizarForm>({ ...INITIAL_FORM, id: '' });
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    const mostrarMensaje = (tipo: MensajeTipo, texto: string) => {
        setMensaje({ tipo, texto });
        setTimeout(() => setMensaje(null), 4000);
    };

    const handleCrear = async () => {
        if (!formCrear.emailInvitado) {
            mostrarMensaje('error', 'El email del invitado es obligatorio.');
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensaje('error', 'No hay sesión activa. Inicia sesión nuevamente.');
            return;
        }
        setLoadingAccion('crear');
        try {
            await apiFetch(`/api/membresia/seguridad/crear/crearmembresia/${token}`, {
                method: 'POST',
                body: { emailInvitado: formCrear.emailInvitado },
            });
            mostrarMensaje('success', 'Membresía creada correctamente.');
            setFormCrear(INITIAL_FORM);
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al crear la membresía.');
        } finally {
            setLoadingAccion(null);
        }
    };

    const handleCrearConMoneda = async () => {
        if (!formCrear.nombreMembresia || !formCrear.precioMembresia) {
            mostrarMensaje('error', 'Nombre y precio son obligatorios.');
            return;
        }
        setLoadingAccion('moneda');
        try {
            const body: Record<string, unknown> = {
                nombreMembresia: formCrear.nombreMembresia,
                descripcion: formCrear.descripcion,
                precioMembresia: Number(formCrear.precioMembresia),
                tipoPagos: formCrear.tipoPagos,
            };
            if (formCrear.monedasId.trim()) body.monedasId = formCrear.monedasId.trim();

            await apiFetch('/api/membresia/seguridad/crear/parametrizacion/membresia/moneda', {
                method: 'POST',
                body,
            });
            mostrarMensaje('success', 'Precio de membresía creado correctamente.');
            setFormCrear(INITIAL_FORM);
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al crear con moneda.');
        } finally {
            setLoadingAccion(null);
        }
    };

    const handleActualizar = async () => {
        if (!formActualizar.id.trim()) {
            mostrarMensaje('error', 'El ID de la membresía es obligatorio.');
            return;
        }
        setLoadingAccion('actualizar');
        try {
            await apiFetch(`/api/membresia/seguridad/crear/parametrizacion/membresia/${formActualizar.id.trim()}`, {
                method: 'PUT',
                body: {
                    nombreMembresia: formActualizar.nombreMembresia,
                    descripcion: formActualizar.descripcion,
                    precioMembresia: Number(formActualizar.precioMembresia),
                    tipoPagos: formActualizar.tipoPagos,
                },
            });
            mostrarMensaje('success', 'Membresía actualizada correctamente.');
            setFormActualizar({ ...INITIAL_FORM, id: '' });
        } catch (err: any) {
            mostrarMensaje('error', err.message || 'Error al actualizar la membresía.');
        } finally {
            setLoadingAccion(null);
        }
    };

    const updateCrear = (field: keyof MembresiaForm, value: string) =>
        setFormCrear(prev => ({ ...prev, [field]: value }));

    const updateActualizar = (field: keyof MembresiaActualizarForm, value: string) =>
        setFormActualizar(prev => ({ ...prev, [field]: value }));

    return (
        <Card className="border border-border/50 shadow-sm">
            {/* Header */}
            <CardHeader className="pb-0 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Tag className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-semibold text-foreground">
                            Configuración de Membresías
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Crear y actualizar parametrizaciones
                        </p>
                    </div>
                </div>

                {/* Tabs custom — más limpios que Shadcn TabsList */}
                <div className="flex gap-1 mt-5 border-b border-border/50">
                    {(['crear', 'actualizar'] as TabActiva[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setTabActiva(tab)}
                            className={`
                                px-4 py-2 text-xs font-medium transition-colors relative capitalize
                                ${tabActiva === tab
                                    ? 'text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }
                            `}
                        >
                            {tab === 'crear' ? 'Nueva membresía' : 'Actualizar existente'}
                            {tabActiva === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="px-6 py-5 space-y-5">
                {/* Alerta de feedback */}
                {mensaje && (
                    <div className={`
                        flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm border
                        ${mensaje.tipo === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                        }
                    `}>
                        {mensaje.tipo === 'success'
                            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                            : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        }
                        <span>{mensaje.texto}</span>
                    </div>
                )}

                {/* TAB: CREAR */}
                {tabActiva === 'crear' && (
                    <div className="space-y-5">

                        {/* Sección: Crear básica */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">Comprar membresía</span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    POST /crear/crearmembresia/:token
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground -mt-1">
                                Genera la membresía para un usuario invitado usando el token del usuario autenticado.
                            </p>
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
                                size="sm"
                                variant="outline"
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

                        {/* Sección: Crear parametrización con moneda */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">Parametrizar membresía</span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    POST /parametrizacion/membresia/moneda
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground -mt-1">
                                Crea una nueva parametrización de precio asociada a una moneda.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FieldWrapper label="Nombre de la membresía" required>
                                    <Input
                                        placeholder="Membresía Premium"
                                        value={formCrear.nombreMembresia}
                                        onChange={e => updateCrear('nombreMembresia', e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </FieldWrapper>
                                <FieldWrapper label="Precio (COP)" required>
                                    <Input
                                        type="number"
                                        placeholder="200000"
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
                                    className="text-sm resize-none"
                                    rows={2}
                                />
                            </FieldWrapper>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FieldWrapper label="Tipo de pago">
                                    <SelectTipoPago
                                        value={formCrear.tipoPagos}
                                        onChange={v => updateCrear('tipoPagos', v)}
                                    />
                                </FieldWrapper>
                                <FieldWrapper
                                    label="ID de moneda"
                                    hint="Opcional"
                                >
                                    <Input
                                        placeholder="65f9c9b7a91a2c0012e8b456"
                                        value={formCrear.monedasId}
                                        onChange={e => updateCrear('monedasId', e.target.value)}
                                        className="h-9 text-sm font-mono"
                                    />
                                </FieldWrapper>
                            </div>

                            <Button
                                size="sm"
                                onClick={handleCrearConMoneda}
                                disabled={!!loadingAccion}
                                className="gap-2"
                            >
                                {loadingAccion === 'moneda'
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Plus className="w-3.5 h-3.5" />
                                }
                                Crear parametrización
                            </Button>
                        </div>
                    </div>
                )}

                {/* TAB: ACTUALIZAR */}
                {tabActiva === 'actualizar' && (
                    <div className="space-y-4">
                        {/* ID prominente al tope */}
                        <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                            <FieldWrapper label="ID de la membresía a actualizar" required>
                                <Input
                                    placeholder="65f9c9b7a91a2c0012e8b123"
                                    value={formActualizar.id}
                                    onChange={e => updateActualizar('id', e.target.value)}
                                    className="h-9 text-sm font-mono bg-background"
                                />
                            </FieldWrapper>
                            <p className="text-xs text-muted-foreground">
                                Puedes obtener el ID desde la respuesta al crear la membresía o desde la base de datos.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FieldWrapper label="Nombre de la membresía">
                                <Input
                                    placeholder="Membresía Premium Plus"
                                    value={formActualizar.nombreMembresia}
                                    onChange={e => updateActualizar('nombreMembresia', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Precio (COP)">
                                <Input
                                    type="number"
                                    placeholder="250000"
                                    value={formActualizar.precioMembresia}
                                    onChange={e => updateActualizar('precioMembresia', e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </FieldWrapper>
                        </div>

                        <FieldWrapper label="Descripción">
                            <Textarea
                                placeholder="Acceso completo con beneficios avanzados."
                                value={formActualizar.descripcion}
                                onChange={e => updateActualizar('descripcion', e.target.value)}
                                className="text-sm resize-none"
                                rows={2}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Tipo de pago">
                            <SelectTipoPago
                                value={formActualizar.tipoPagos}
                                onChange={v => updateActualizar('tipoPagos', v)}
                            />
                        </FieldWrapper>

                        <Separator />

                        <Button
                            size="sm"
                            onClick={handleActualizar}
                            disabled={!!loadingAccion}
                            className="gap-2"
                        >
                            {loadingAccion === 'actualizar'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RefreshCw className="w-3.5 h-3.5" />
                            }
                            Guardar cambios
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FieldWrapper({
    label,
    required,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
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

function SelectTipoPago({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
                {TIPO_PAGOS.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                        {tipo}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}