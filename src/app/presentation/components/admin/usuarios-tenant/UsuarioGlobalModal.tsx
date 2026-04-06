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
import { Info, Loader2, UserPlus, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { CreateUsuarioGlobalData, TenantGlobalInfo } from '@/app/services/tenantUsuariosService';
import { RH_OPTIONS } from './catalogos';

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
    /** Función para sincronizar canReferir */
    onSincronizarCanReferir?: (canReferir: boolean) => Promise<any>;
    isSincronizando?: boolean;
    sincronizarError?: Error | null;
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
    canReferir: boolean;
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
    canReferir: true,
};

export const UsuarioGlobalModal = ({
    open,
    onClose,
    onSubmit,
    isSubmitting = false,
    submitError,
    tenantsGlobales = [],
    scope,
    onSincronizarCanReferir,
    isSincronizando = false,
    sincronizarError,
}: UsuarioGlobalModalProps): React.ReactElement => {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    useEffect(() => {
        if (!open) setForm(EMPTY_FORM);
    }, [open]);

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
            canReferir: form.canReferir,
        };
        if (scope === 'SUPER_ADMIN' && form.tenantGlobalId) {
            payload.tenantGlobalId = form.tenantGlobalId;
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

                        {/* Selector de Tenant Global — solo visible para SUPER_ADMIN */}
                        {scope === 'SUPER_ADMIN' && (
                            <div className="space-y-2">
                                <Label>Tenant Global *</Label>
                                <Select
                                    value={form.tenantGlobalId}
                                    onValueChange={handleSelect('tenantGlobalId')}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un Tenant Global" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tenantsGlobales.map(tg => (
                                            <SelectItem key={tg.iud} value={tg.iud}>
                                                {tg.razon_social ?? tg.titulo ?? tg.iud}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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

                        {/* Botones de sincronización */}
                        {scope === 'SUPER_ADMIN' && onSincronizarCanReferir && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Sincronizar referidos</Label>
                                <p className="text-xs text-muted-foreground">
                                    Ajusta el estado de "puede referir" para todos los usuarios existentes en este tenant.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSincronizarCanReferir(true)}
                                        disabled={isSincronizando}
                                        className="flex-1"
                                    >
                                        {isSincronizando ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Habilitar todos
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSincronizarCanReferir(false)}
                                        disabled={isSincronizando}
                                        className="flex-1"
                                    >
                                        {isSincronizando ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Deshabilitar todos
                                    </Button>
                                </div>
                                {sincronizarError && (
                                    <p className="text-xs text-destructive">
                                        Error al sincronizar: {sincronizarError.message}
                                    </p>
                                )}
                            </div>
                        )}

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