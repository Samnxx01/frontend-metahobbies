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
import { Info, Loader2, RefreshCw, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { CreateUsuarioSuperAdminData } from '@/app/services/tenantUsuariosService';
import { getTenantsSuperAdmin } from '@/app/services/tenantUsuariosService';
import { RH_OPTIONS } from './catalogos';

interface UsuarioSuperAdminModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateUsuarioSuperAdminData) => Promise<any>;
    isSubmitting?: boolean;
    submitError?: Error | null;
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
    scope,
    onSincronizarGlobalCanReferir,
    isSincronizandoGlobal = false,
    sincronizarGlobalError,
}: UsuarioSuperAdminModalProps): React.ReactElement => {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [tenantsSA, setTenantsSA] = useState<any[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);

    useEffect(() => {
        if (!open) { setForm(EMPTY_FORM); return; }
        if (scope !== 'SUPER_ADMIN') return;
        setLoadingTenants(true);
        getTenantsSuperAdmin()
            .then(res => setTenantsSA(res.tenants ?? []))
            .catch(() => setTenantsSA([]))
            .finally(() => setLoadingTenants(false));
    }, [open, scope]);

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
        if (scope === 'SUPER_ADMIN' && form.tenantSuperAdminId) {
            payload.tenantSuperAdminId = form.tenantSuperAdminId;
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

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Nuevo Usuario SuperAdmin
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="py-4 space-y-4">

                        {/* Selector de Tenant SuperAdmin — solo visible para SUPER_ADMIN */}
                        {scope === 'SUPER_ADMIN' && (
                            <div className="space-y-2">
                                <Label>Tenant SuperAdmin</Label>
                                <Select
                                    value={form.tenantSuperAdminId}
                                    onValueChange={handleSelect('tenantSuperAdminId')}
                                    disabled={loadingTenants}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingTenants ? 'Cargando...' : 'Seleccionar tenant (opcional)'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tenantsSA.map((t: any) => {
                                            const id = String(t?.iud || t?._id || '');
                                            const nombre = t?.coporativo?.razon_social || t?.coporativo?.titulo || id;
                                            const nvl = t?.nvlGeneracionTenant?.nvl;
                                            const label = nvl ? `${nombre} — ${nvl}` : nombre;
                                            return <SelectItem key={id} value={id}>{label}</SelectItem>;
                                        })}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Si no se especifica, se usará el tenant del usuario autenticado.
                                </p>
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
            </DialogContent>
        </Dialog>
    );
};