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
import type { CreateUsuarioCorporativoData, TenantCorporativoInfo } from '@/app/services/tenantUsuariosService';
import { RH_OPTIONS, TIPO_CONTRATO_OPTIONS, NIVELES_ESTUDIO } from './catalogos';

interface UsuarioCorporativoModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateUsuarioCorporativoData) => Promise<any>;
    isSubmitting?: boolean;
    submitError?: Error | null;
    /** Nodo corporativo al que se va a asociar el usuario */
    tenantCorporativo?: TenantCorporativoInfo | null;
    /** Scope del usuario autenticado */
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
}

interface FormState {
    correo: string;
    password: string;
    nombre: string;
    apellido: string;
    cc: string;
    telefono: string;
    direccion: string;
    rh: string;
    fecha_nacimiento: string;
    cargo: string;
    tieneEstudios: string; // 'si' | 'no'
    estudios: string;
    tipoContrato: string;
}

const EMPTY_FORM: FormState = {
    correo: '',
    password: '',
    nombre: '',
    apellido: '',
    cc: '',
    telefono: '',
    direccion: '',
    rh: '',
    fecha_nacimiento: '',
    cargo: '',
    tieneEstudios: 'no',
    estudios: '',
    tipoContrato: '',
};

export const UsuarioCorporativoModal = ({
    open,
    onClose,
    onSubmit,
    isSubmitting = false,
    submitError,
    tenantCorporativo,
    scope,
}: UsuarioCorporativoModalProps): React.ReactElement => {
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
        const tieneEstudios = form.tieneEstudios === 'si';
        const payload: CreateUsuarioCorporativoData = {
            correo: form.correo,
            password: form.password,
            nombre: form.nombre,
            apellido: form.apellido,
            cc: form.cc,
            telefono: form.telefono,
            direccion: form.direccion,
            rh: form.rh,
            fecha_nacimiento: form.fecha_nacimiento,
            tieneEstudios,
            tipoContrato: form.tipoContrato,
        };
        if (form.cargo) payload.cargo = form.cargo;
        if (tieneEstudios && form.estudios) payload.estudios = form.estudios;

        // Pasar el tenantCorporativoId solo cuando no es CORPORATIVO (para el scope CORPORATIVO se resuelve por JWT)
        if (scope !== 'CORPORATIVO' && tenantCorporativo) {
            payload.tenantCorporativoId = tenantCorporativo.iud;
        }

        try {
            await onSubmit(payload);
            onClose();
        } catch {
            // error manejado en el hook
        }
    };

    const corpLabel = tenantCorporativo
        ? (tenantCorporativo.razon_social ?? tenantCorporativo.titulo ?? 'Corporativo seleccionado')
        : null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Nuevo Usuario Corporativo
                        {corpLabel && (
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                — {corpLabel}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="py-4 space-y-4">

                        {/* Correo */}
                        <div className="space-y-2">
                            <Label htmlFor="uc-correo">Correo Electrónico *</Label>
                            <Input
                                id="uc-correo"
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
                            <Label htmlFor="uc-password">Contraseña *</Label>
                            <Input
                                id="uc-password"
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
                                <Label htmlFor="uc-nombre">Nombre *</Label>
                                <Input
                                    id="uc-nombre"
                                    name="nombre"
                                    placeholder="Nombre"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="uc-apellido">Apellido *</Label>
                                <Input
                                    id="uc-apellido"
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
                                <Label htmlFor="uc-cc">C.C. / Documento *</Label>
                                <Input
                                    id="uc-cc"
                                    name="cc"
                                    placeholder="Nro. documento"
                                    value={form.cc}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="uc-telefono">Teléfono *</Label>
                                <Input
                                    id="uc-telefono"
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
                            <Label htmlFor="uc-direccion">Dirección *</Label>
                            <Input
                                id="uc-direccion"
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
                                <Label htmlFor="uc-fecha">Fecha de Nacimiento *</Label>
                                <Input
                                    id="uc-fecha"
                                    name="fecha_nacimiento"
                                    type="date"
                                    value={form.fecha_nacimiento}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Cargo */}
                        <div className="space-y-2">
                            <Label htmlFor="uc-cargo">Cargo</Label>
                            <Input
                                id="uc-cargo"
                                name="cargo"
                                placeholder="Cargo (opcional)"
                                value={form.cargo}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Tipo de Contrato */}
                        <div className="space-y-2">
                            <Label>Tipo de Contrato *</Label>
                            <Select value={form.tipoContrato} onValueChange={handleSelect('tipoContrato')} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona tipo de contrato" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIPO_CONTRATO_OPTIONS.map(tipo => (
                                        <SelectItem key={tipo} value={tipo}>{tipo.replace(/_/g, ' ')}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ¿Tiene Estudios? */}
                        <div className="space-y-2">
                            <Label>¿Tiene Estudios? *</Label>
                            <Select value={form.tieneEstudios} onValueChange={handleSelect('tieneEstudios')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="si">Sí</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Nivel de estudios — solo si tieneEstudios = 'si' */}
                        {form.tieneEstudios === 'si' && (
                            <div className="space-y-2">
                                <Label>Nivel de Estudios *</Label>
                                <Select value={form.estudios} onValueChange={handleSelect('estudios')} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona nivel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {NIVELES_ESTUDIO.map(n => (
                                            <SelectItem key={n} value={n}>{n}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
