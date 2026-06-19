import React, { useState, useEffect } from 'react';
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
import { Loader2, UserPlus } from 'lucide-react';
import type { CreateUsuarioGlobalData, TenantGlobalInfo, TenantGlobalRegistroItem, TenantSuperAdminOption } from '@/app/services/tenantUsuariosService';
import { getTenantsGlobalRegistro, getTenantsSuperAdmin, describeTenantSuperAdminOption } from '@/app/services/tenantUsuariosService';
import { RH_OPTIONS } from './catalogos';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'react-toastify';
import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

interface UsuarioGlobalModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateUsuarioGlobalData) => Promise<any>;
    isSubmitting?: boolean;
    submitError?: Error | null;
    /** Lista de tenants globales disponibles (solo para SUPER_ADMIN) */
    tenantsGlobales?: TenantGlobalInfo[];
    /** Scope del usuario autenticado */
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
}

interface FormState {
    tenantGlobalId: string;
    correo: string;
    password: string;
    nombre: string;
    apellido: string;
    cc: string;
    telefono: string;
    direccion: string;
    rh: string;
    fecha_nacimiento: string;
}

const EMPTY_FORM: FormState = {
    tenantGlobalId: '',
    correo: '',
    password: '',
    nombre: '',
    apellido: '',
    cc: '',
    telefono: '',
    direccion: '',
    rh: '',
    fecha_nacimiento: '',
};

export const UsuarioGlobalModal = ({
    open,
    onClose,
    onSubmit,
    isSubmitting = false,
    submitError,
    tenantsGlobales = [],
    scope,
}: UsuarioGlobalModalProps): React.ReactElement => {
    const { token } = useAuth();
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saJerarquiaOpciones, setSaJerarquiaOpciones] = useState<TenantSuperAdminOption[]>([]);
    const [saJerarquiaAncla, setSaJerarquiaAncla] = useState('');
    const [globalesJerarquia, setGlobalesJerarquia] = useState<TenantGlobalRegistroItem[]>([]);
    const [loadingSaJerarquia, setLoadingSaJerarquia] = useState(false);
    const [loadingGlobJerarquia, setLoadingGlobJerarquia] = useState(false);

    useEffect(() => {
        if (!open) {
            setForm(EMPTY_FORM);
            setSaJerarquiaAncla('');
            setGlobalesJerarquia([]);
            return;
        }
        if (scope !== 'SUPER_ADMIN' || token) return;

        setLoadingSaJerarquia(true);
        getTenantsSuperAdmin(false)
            .then((res) => setSaJerarquiaOpciones(Array.isArray(res?.tenants) ? res.tenants : []))
            .catch(() => setSaJerarquiaOpciones([]))
            .finally(() => setLoadingSaJerarquia(false));
    }, [open, scope, token]);

    useEffect(() => {
        if (!open || scope !== 'SUPER_ADMIN' || token) return;
        const ancla = saJerarquiaAncla.trim();
        if (!ancla) {
            setGlobalesJerarquia([]);
            return;
        }
        setLoadingGlobJerarquia(true);
        getTenantsGlobalRegistro(false, ancla)
            .then((res) =>
                setGlobalesJerarquia(Array.isArray(res?.tenantsGlobales) ? res.tenantsGlobales : []),
            )
            .catch(() => setGlobalesJerarquia([]))
            .finally(() => setLoadingGlobJerarquia(false));
    }, [open, scope, token, saJerarquiaAncla]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelect = (field: keyof FormState) => (value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const payload: CreateUsuarioGlobalData = {
            correo: form.correo,
            password: form.password,
            nombre: form.nombre,
            apellido: form.apellido,
            cc: form.cc,
            telefono: form.telefono,
            direccion: form.direccion,
            rh: form.rh,
            fecha_nacimiento: form.fecha_nacimiento,
        };
        if (scope === 'SUPER_ADMIN' && form.tenantGlobalId) {
            payload.tenantGlobalId = normalizePublicIdForApi(form.tenantGlobalId);
        }
        if (scope === 'SUPER_ADMIN' && !payload.tenantGlobalId) {
            toast.error(
                !token && !saJerarquiaAncla.trim()
                    ? 'Selecciona la rama Tenant SuperAdmin y luego el Tenant Global.'
                    : 'Selecciona un Tenant Global.',
            );
            return;
        }
        try {
            await onSubmit(payload);
            onClose();
        } catch {
            // error manejado en el hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Nuevo Usuario Global
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="py-4 space-y-4">

                        {/* SUPER_ADMIN: con JWT usa lista del padre; sin JWT elige rama SA → TG vía API jerárquica */}
                        {scope === 'SUPER_ADMIN' && (
                            <div className="space-y-4">
                                {!token && (
                                    <div className="space-y-2">
                                        <Label>Tenant SuperAdmin (rama jerárquica) *</Label>
                                        {loadingSaJerarquia ? (
                                            <p className="text-sm text-muted-foreground">Cargando ramas…</p>
                                        ) : (
                                            <Select
                                                value={saJerarquiaAncla}
                                                onValueChange={(v) => {
                                                    setSaJerarquiaAncla(v);
                                                    setForm((p) => ({ ...p, tenantGlobalId: '' }));
                                                }}
                                                required
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Elige la rama (codigoJerarquia)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {saJerarquiaOpciones.map((sa) => {
                                                        const { primary, principalLine } =
                                                            describeTenantSuperAdminOption(sa);
                                                        return (
                                                            <SelectItem key={resolveEntityPublicId(sa)} value={resolveEntityPublicId(sa)}>
                                                                <div className="flex flex-col gap-0.5 py-0.5 text-left">
                                                                    <span className="font-medium leading-tight">{primary}</span>
                                                                    <span className="text-xs text-muted-foreground leading-snug">
                                                                        {principalLine}
                                                                    </span>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Sin sesión solo ves tenants acotados por jerarquía: primero raíces; puedes acotar sub-rama desde el formulario de SuperAdmin si hace falta.
                                        </p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Tenant Global *</Label>
                                    {!token && loadingGlobJerarquia ? (
                                        <p className="text-sm text-muted-foreground">Cargando Tenant Global…</p>
                                    ) : (
                                        <Select
                                            value={form.tenantGlobalId}
                                            onValueChange={handleSelect('tenantGlobalId')}
                                            required
                                            disabled={!token && !saJerarquiaAncla.trim()}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={
                                                    !token && !saJerarquiaAncla.trim()
                                                        ? 'Primero elige la rama SuperAdmin'
                                                        : 'Selecciona un Tenant Global'
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(token ? tenantsGlobales : globalesJerarquia).map((tg) => {
                                                    const iud = resolveEntityPublicId(tg);
                                                    const labelRaw = token
                                                        ? (tg as TenantGlobalInfo).razon_social
                                                            ?? (tg as TenantGlobalInfo).titulo
                                                            ?? iud
                                                        : (tg as TenantGlobalRegistroItem).coporativo?.razon_social
                                                            ?? (tg as TenantGlobalRegistroItem).coporativo?.titulo
                                                            ?? (tg as TenantGlobalRegistroItem).codigoJerarquia
                                                            ?? iud;
                                                    const codigo = !token
                                                        ? (tg as TenantGlobalRegistroItem).codigoJerarquia
                                                        : (tg as TenantGlobalInfo).codigoJerarquia;
                                                    return (
                                                        <SelectItem key={iud} value={iud}>
                                                            {codigo ? `${codigo} · ${labelRaw}` : labelRaw}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Correo */}
                        <div className="space-y-2">
                            <Label htmlFor="ug-correo">Correo Electrónico *</Label>
                            <Input
                                id="ug-correo"
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
                            <Label htmlFor="ug-password">Contraseña *</Label>
                            <Input
                                id="ug-password"
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
                                <Label htmlFor="ug-nombre">Nombre *</Label>
                                <Input
                                    id="ug-nombre"
                                    name="nombre"
                                    placeholder="Nombre"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ug-apellido">Apellido *</Label>
                                <Input
                                    id="ug-apellido"
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
                                <Label htmlFor="ug-cc">C.C. / Documento *</Label>
                                <Input
                                    id="ug-cc"
                                    name="cc"
                                    placeholder="Nro. documento"
                                    value={form.cc}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ug-telefono">Teléfono *</Label>
                                <Input
                                    id="ug-telefono"
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
                            <Label htmlFor="ug-direccion">Dirección *</Label>
                            <Input
                                id="ug-direccion"
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
                                <Label htmlFor="ug-fecha">Fecha de Nacimiento *</Label>
                                <Input
                                    id="ug-fecha"
                                    name="fecha_nacimiento"
                                    type="date"
                                    value={form.fecha_nacimiento}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {submitError && (
                            <p className="text-sm text-destructive">
                                Error: {submitError.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="pt-4 flex justify-end gap-3">
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
            </DialogContent>
        </Dialog>
    );
};