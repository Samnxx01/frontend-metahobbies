import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
    getTenantsSuperAdmin,
    describeTenantSuperAdminOption,
    type CreateUsuarioSuperAdminData,
    type TenantSuperAdminOption,
} from '@/app/services/tenantUsuariosService';
import { RH_OPTIONS } from './catalogos';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'react-toastify';
import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

interface UsuarioSuperAdminModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateUsuarioSuperAdminData) => Promise<any>;
    isSubmitting?: boolean;
    submitError?: Error | null;
    renderMode?: 'modal' | 'page';
    /** Scope del usuario autenticado */
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
    /** Función para sincronizar canReferir globalmente en todos los tenants */
    onSincronizarGlobalCanReferir?: (canReferir: boolean) => Promise<any>;
    isSincronizandoGlobal?: boolean;
    sincronizarGlobalError?: Error | null;
}

interface FormState {
    tenantSuperAdminId: string;
    correo: string;
    password: string;
    nombre: string;
    apellido: string;
    cc: string;
    telefono: string;
    direccion: string;
    rh: string;
    fecha_nacimiento: string;
    canReferir: boolean;
}

const EMPTY_FORM: FormState = {
    tenantSuperAdminId: '',
    correo: '',
    password: '',
    nombre: '',
    apellido: '',
    cc: '',
    telefono: '',
    direccion: '',
    rh: '',
    fecha_nacimiento: '',
    canReferir: true,
};

export const UsuarioSuperAdminModal = ({
    open,
    onClose,
    onSubmit,
    isSubmitting = false,
    submitError,
    renderMode = 'modal',
    scope,
    onSincronizarGlobalCanReferir,
    isSincronizandoGlobal = false,
    sincronizarGlobalError,
}: UsuarioSuperAdminModalProps): React.ReactElement => {
    const { token, user } = useAuth();
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [publicTenants, setPublicTenants] = useState<TenantSuperAdminOption[]>([]);
    const [loadingPublicTenants, setLoadingPublicTenants] = useState(false);
    const [publicTenantsError, setPublicTenantsError] = useState(false);

    const tenantSuperAdminIdFromJwt = useMemo(() => {
        const fromUser = String(
            user?.tenantSuperAdminId ||
            user?.auth?.tenantScope?.tenantSuperAdminId ||
            ''
        ).trim();

        if (fromUser) return fromUser;
        if (!token) return '';

        try {
            const [, payloadBase64] = token.split('.');
            if (!payloadBase64) return '';
            const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
            const payload = JSON.parse(globalThis.atob(padded));
            return String(
                payload?.auth?.tenantScope?.tenantSuperAdminId ||
                payload?.tenantScope?.tenantSuperAdminId ||
                ''
            ).trim();
        } catch {
            return '';
        }
    }, [token, user]);

    useEffect(() => {
        if (!open) {
            setForm(EMPTY_FORM);
            setPublicTenantsError(false);
            return;
        }

        const debeElegirTenant =
            (scope === 'SUPER_ADMIN' && !tenantSuperAdminIdFromJwt) || !token;

        if (!debeElegirTenant) {
            setPublicTenants([]);
            setPublicTenantsError(false);
            return;
        }

        setLoadingPublicTenants(true);
        setPublicTenantsError(false);
        getTenantsSuperAdmin(Boolean(token))
            .then((res) => setPublicTenants(Array.isArray(res?.tenants) ? res.tenants : []))
            .catch(() => {
                setPublicTenants([]);
                setPublicTenantsError(true);
            })
            .finally(() => setLoadingPublicTenants(false));
    }, [open, token, scope, tenantSuperAdminIdFromJwt]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelect = (field: keyof FormState) => (value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const payload: CreateUsuarioSuperAdminData = {
            correo: form.correo,
            password: form.password,
            nombre: form.nombre,
            apellido: form.apellido,
            cc: form.cc,
            telefono: form.telefono,
            direccion: form.direccion,
            rh: form.rh,
            fecha_nacimiento: form.fecha_nacimiento,
            canReferir: form.canReferir,
        };

        const tenantDestino = normalizePublicIdForApi(
            tenantSuperAdminIdFromJwt || form.tenantSuperAdminId,
        );
        const esBootstrapDiosPublico =
            !token &&
            !loadingPublicTenants &&
            !publicTenantsError &&
            publicTenants.length === 0;

        if (!tenantDestino && !esBootstrapDiosPublico) {
            toast.error(
                loadingPublicTenants
                    ? 'Espera a que carguen los tenants activos.'
                    : publicTenants.length === 0
                        ? 'No hay tenants SuperAdmin activos disponibles.'
                        : 'Selecciona el tenant SuperAdmin (corporativo asociado) donde se creará el usuario.',
            );
            return;
        }

        if (tenantDestino) {
            payload.tenantSuperAdminId = tenantDestino;
        }
        try {
            await onSubmit(payload);
            onClose();
        } catch {
            // error manejado en el hook
        }
    };

    const handleSincronizarGlobalCanReferir = async (canReferir: boolean) => {
        if (!onSincronizarGlobalCanReferir) return;
        try {
            await onSincronizarGlobalCanReferir(canReferir);
        } catch {
            // error manejado en el hook
        }
    };

    const muestraSelectorTenant =
        (scope === 'SUPER_ADMIN' && !tenantSuperAdminIdFromJwt) || !token;

    const contenidoFormulario = (
        <>
            {renderMode === 'modal' ? (
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Nuevo Usuario SuperAdmin
                    </DialogTitle>
                </DialogHeader>
            ) : (
                <div className="mb-5 flex items-center justify-between gap-3 border-b pb-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                            <Shield className="h-6 w-6 text-primary" />
                            Nuevo Usuario SuperAdmin
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Registro jerarquico de usuario tenant.
                        </p>
                    </div>
                </div>
            )}

                <form onSubmit={handleSubmit}>
                    <div className="py-4 space-y-4">
                        {muestraSelectorTenant && (
                            <div className="space-y-2">
                                <Label>Tenant SuperAdmin activo *</Label>
                                {loadingPublicTenants ? (
                                    <p className="text-sm text-muted-foreground">Cargando tenants activos…</p>
                                ) : publicTenantsError ? (
                                    <p className="text-sm text-destructive">
                                        No se pudo cargar la lista de tenants activos. Intenta actualizar antes de crear.
                                    </p>
                                ) : publicTenants.length === 0 ? (
                                    <p className="text-sm text-destructive">
                                        No hay tenants SuperAdmin activos. Este registro se creara como administrador DIOS inicial.
                                    </p>
                                ) : (
                                    <Select
                                        value={form.tenantSuperAdminId}
                                        onValueChange={handleSelect('tenantSuperAdminId')}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el corporativo asociado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {publicTenants.map((tenant) => {
                                                const { primary, principalLine } =
                                                    describeTenantSuperAdminOption(tenant);
                                                return (
                                                    <SelectItem key={resolveEntityPublicId(tenant)} value={resolveEntityPublicId(tenant)}>
                                                        <div className="flex flex-col gap-0.5 py-0.5 text-left">
                                                            <span className="font-medium leading-tight">{primary}</span>
                                                            {principalLine ? (
                                                                <span className="text-xs text-muted-foreground leading-snug">
                                                                    {principalLine}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}

                        {scope === 'SUPER_ADMIN' && tenantSuperAdminIdFromJwt ? (
                            <div className="space-y-2">
                                <Label>Tenant SuperAdmin</Label>
                                <div className="flex min-h-10 items-center rounded-md border border-input bg-muted/40 px-3">
                                    <Badge variant="outline" className="max-w-full border-primary/30 bg-primary/10 text-primary">
                                        <span className="mr-1 font-semibold">tenantSuperAdmin</span>
                                        <span className="truncate font-mono">{tenantSuperAdminIdFromJwt}</span>
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Alcance tomado del JWT: solo puedes crear usuarios en tu rama y sub-ramas de tenant.
                                </p>
                            </div>
                        ) : null}

                        {/* Correo */}
                        <div className="space-y-2">
                            <Label htmlFor="sa-correo">Correo Electrónico *</Label>
                            <Input
                                id="sa-correo"
                                name="correo"
                                type="email"
                                placeholder="ejemplo@correo.com"
                                value={form.correo}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Contraseña */}
                        <div className="space-y-2">
                            <Label htmlFor="sa-password">Contraseña *</Label>
                            <Input
                                id="sa-password"
                                name="password"
                                type="password"
                                placeholder="Contraseña inicial"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Nombre y Apellido */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="sa-nombre">Nombre *</Label>
                                <Input
                                    id="sa-nombre"
                                    name="nombre"
                                    placeholder="Nombre"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sa-apellido">Apellido *</Label>
                                <Input
                                    id="sa-apellido"
                                    name="apellido"
                                    placeholder="Apellido"
                                    value={form.apellido}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* CC y Teléfono */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="sa-cc">C.C. / Documento *</Label>
                                <Input
                                    id="sa-cc"
                                    name="cc"
                                    placeholder="Nro. documento"
                                    value={form.cc}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sa-telefono">Teléfono *</Label>
                                <Input
                                    id="sa-telefono"
                                    name="telefono"
                                    placeholder="Teléfono"
                                    value={form.telefono}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Dirección */}
                        <div className="space-y-2">
                            <Label htmlFor="sa-direccion">Dirección *</Label>
                            <Input
                                id="sa-direccion"
                                name="direccion"
                                placeholder="Dirección"
                                value={form.direccion}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* RH y Fecha de nacimiento */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>RH *</Label>
                                <Select value={form.rh} onValueChange={handleSelect('rh')} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="RH" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RH_OPTIONS.map(rh => (
                                            <SelectItem key={rh} value={rh}>{rh}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sa-fecha">Fecha de Nacimiento *</Label>
                                <Input
                                    id="sa-fecha"
                                    name="fecha_nacimiento"
                                    type="date"
                                    value={form.fecha_nacimiento}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Puede generar referidos */}
                        <div className="flex items-center justify-between rounded-md border px-3 py-3">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Puede generar referidos</Label>
                                <p className="text-xs text-muted-foreground">
                                    Permite que este usuario genere enlaces de referido en el sistema multinivel.
                                </p>
                            </div>
                            <Switch
                                checked={form.canReferir}
                                onCheckedChange={(checked) =>
                                    setForm(prev => ({ ...prev, canReferir: checked }))
                                }
                            />
                        </div>

                        {submitError && (
                            <p className="text-sm text-destructive">
                                Error: {submitError.message}
                            </p>
                        )}

                        {sincronizarGlobalError && (
                            <p className="text-sm text-destructive">
                                Error de sincronización global: {sincronizarGlobalError.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="pt-4 flex justify-end gap-3">
                        {onSincronizarGlobalCanReferir && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSincronizarGlobalCanReferir(form.canReferir)}
                                disabled={isSincronizandoGlobal || isSubmitting}
                            >
                                {isSincronizandoGlobal ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sincronizando...</>
                                ) : (
                                    <><RefreshCw className="h-4 w-4 mr-2" /> Sincronizar</>
                                )}
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
                                : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                </form>
        </>
    );

    if (renderMode === 'page') {
        return (
            <div className="min-h-full bg-background px-4 py-6 md:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-3xl rounded-lg border bg-card p-6 shadow-sm">
                    {contenidoFormulario}
                </div>
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                {contenidoFormulario}
            </DialogContent>
        </Dialog>
    );
};
