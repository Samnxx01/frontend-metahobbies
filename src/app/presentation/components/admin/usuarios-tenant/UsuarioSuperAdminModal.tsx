import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    filtrarTenantsSuperAdminDestinoRegistro,
    resolverTenantSuperAdminIdDesdeJwtScope,
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
    /** Si true, el bootstrap DIOS ya existe: registro público exige tenant SuperAdmin activo. */
    diosUserExists?: boolean;
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
    diosUserExists = false,
    onSincronizarGlobalCanReferir,
    isSincronizandoGlobal = false,
    sincronizarGlobalError,
}: UsuarioSuperAdminModalProps): React.ReactElement => {
    const { token, user } = useAuth();
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [publicTenants, setPublicTenants] = useState<TenantSuperAdminOption[]>([]);
    const [loadingPublicTenants, setLoadingPublicTenants] = useState(false);
    const [publicTenantsError, setPublicTenantsError] = useState(false);

    const tenantSuperAdminIdFromScope = useMemo(
        () => resolverTenantSuperAdminIdDesdeJwtScope(token, user),
        [token, user],
    );

    const bajoTenantSuperAdminIdPublico = useMemo(() => {
        if (token) return null;
        const params = new URLSearchParams(globalThis.location?.search || '');
        const raw = params.get('bajoTenantSuperAdminId') || params.get('tenantSuperAdminId');
        return raw ? normalizePublicIdForApi(raw) : null;
    }, [token]);

    const tenantSuperAdminIdFromJwt = useMemo(() => {
        if (tenantSuperAdminIdFromScope) return tenantSuperAdminIdFromScope;

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
    }, [token, user, tenantSuperAdminIdFromScope]);

    useEffect(() => {
        if (!open) {
            setForm(EMPTY_FORM);
            setPublicTenantsError(false);
            return;
        }

        const puedeListarTenants =
            !token || scope === 'SUPER_ADMIN' || scope === 'TENANT_GLOBAL';

        if (!puedeListarTenants) {
            setPublicTenants([]);
            setPublicTenantsError(false);
            return;
        }

        setLoadingPublicTenants(true);
        setPublicTenantsError(false);
        getTenantsSuperAdmin(
            Boolean(token),
            bajoTenantSuperAdminIdPublico
                ? { bajoTenantSuperAdminId: bajoTenantSuperAdminIdPublico }
                : undefined,
        )
            .then((res) => {
                const tenantsRaw = Array.isArray(res?.tenants) ? res.tenants : [];
                const tenants = filtrarTenantsSuperAdminDestinoRegistro(tenantsRaw, {
                    token,
                    tenantScopeSaId: tenantSuperAdminIdFromScope,
                });
                setPublicTenants(tenants);

                const jwtNorm = normalizePublicIdForApi(
                    tenantSuperAdminIdFromScope || tenantSuperAdminIdFromJwt,
                );
                if (jwtNorm && tenants.some((t) => resolveEntityPublicId(t) === jwtNorm)) {
                    setForm((prev) => ({ ...prev, tenantSuperAdminId: jwtNorm }));
                } else if (tenants.length === 1) {
                    setForm((prev) => ({
                        ...prev,
                        tenantSuperAdminId: resolveEntityPublicId(tenants[0]),
                    }));
                }
            })
            .catch(() => {
                setPublicTenants([]);
                setPublicTenantsError(true);
            })
            .finally(() => setLoadingPublicTenants(false));
    }, [open, token, scope, tenantSuperAdminIdFromJwt, tenantSuperAdminIdFromScope, bajoTenantSuperAdminIdPublico]);

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

        const tenantDestino = normalizePublicIdForApi(form.tenantSuperAdminId);
        const esBootstrapDiosPublico =
            !token &&
            !diosUserExists &&
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
        !token || scope === 'SUPER_ADMIN' || scope === 'TENANT_GLOBAL';

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
                                <Label>Tenant SuperAdmin destino *</Label>
                                {loadingPublicTenants ? (
                                    <p className="text-sm text-muted-foreground">Cargando tenants disponibles…</p>
                                ) : publicTenantsError ? (
                                    <p className="text-sm text-destructive">
                                        No se pudo cargar la lista de tenants. Intenta de nuevo antes de crear.
                                    </p>
                                ) : publicTenants.length === 0 ? (
                                    <p className="text-sm text-destructive">
                                        {!token && diosUserExists
                                            ? 'No hay tenants SuperAdmin activos para registro público. El usuario quedará bajo el tenant seleccionado en jerarquía (p. ej. SA-0002) cuando esté materializado en corporativo.'
                                            : !token
                                                ? 'No hay tenants SuperAdmin activos. Este registro se creará como administrador DIOS inicial.'
                                                : 'No hay tenants SuperAdmin activos en tu alcance jerárquico.'}
                                    </p>
                                ) : (
                                    <>
                                        <Select
                                            value={form.tenantSuperAdminId}
                                            onValueChange={handleSelect('tenantSuperAdminId')}
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona el tenant SuperAdmin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {publicTenants.map((tenant) => {
                                                    const { primary, principalLine } =
                                                        describeTenantSuperAdminOption(tenant, {
                                                            ocultarRamaJerarquia: true,
                                                            ocultarUsuarioPrincipal: true,
                                                        });
                                                    const id = resolveEntityPublicId(tenant);
                                                    return (
                                                        <SelectItem key={id} value={id}>
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
                                        {tenantSuperAdminIdFromScope ? (
                                            <p className="text-xs text-muted-foreground">
                                                Solo el tenant SuperAdmin de tu sesión (ancla JWT).
                                            </p>
                                        ) : tenantSuperAdminIdFromJwt ? (
                                            <p className="text-xs text-muted-foreground">
                                                Se muestran las ramas hijas de tu jerarquía (sin SA raíz).
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                Registro público bajo el tenant SuperAdmin activo (jerarquía materializada).
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

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
