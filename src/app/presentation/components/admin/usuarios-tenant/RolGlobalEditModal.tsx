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
import { Loader2, Globe, UserCog } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import type { TenantGlobalInfo } from '@/app/services/tenantUsuariosService';

interface RolGlobalEditModalProps {
    open: boolean;
    onClose: () => void;
    usuario: { iud?: string; _id?: string; correo: string; rol?: string } | null;
    tenantsGlobales?: TenantGlobalInfo[];
    tenantGlobalActual?: { iud?: string; _id?: string; razon_social?: string | null; titulo?: string | null } | null;
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
    onSave: (id: string, data: Record<string, string>) => Promise<void>;
    isUpdating?: boolean;
    updateError?: Error | null;
}

interface RolOpcion {
    nombreRol: string;
    estado: boolean;
}

interface FormState {
    rol: string;
    password: string;
    tenantGlobal: string;
}

export const RolGlobalEditModal = ({
    open,
    onClose,
    usuario,
    tenantsGlobales = [],
    tenantGlobalActual,
    scope,
    onSave,
    isUpdating = false,
    updateError,
}: RolGlobalEditModalProps): React.ReactElement => {
    const [roles, setRoles] = useState<RolOpcion[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [form, setForm] = useState<FormState>({ rol: '', password: '', tenantGlobal: '' });

    // Cargar roles y pre-rellenar form al abrir
    useEffect(() => {
        if (!open || !usuario) return;

        setForm({
            rol: usuario.rol ?? '',
            password: '',
            tenantGlobal: String(tenantGlobalActual?.iud || tenantGlobalActual?._id || ''),
        });

        setLoadingRoles(true);
        apiFetch('/api/seguridad/roles/admin', { method: 'GET' })
            .then((res: any) => {
                const lista: RolOpcion[] = Array.isArray(res?.roles) ? res.roles : [];
                setRoles(lista);
            })
            .catch(() => setRoles([]))
            .finally(() => setLoadingRoles(false));
    }, [open, usuario]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const id = String(usuario?.iud || usuario?._id || '');
        if (!id) return;

        const body: Record<string, string> = {};
        if (form.rol && form.rol !== (usuario?.rol ?? '')) body.rol = form.rol;
        if (form.password.trim()) body.password = form.password.trim();
        if (
            scope === 'SUPER_ADMIN' &&
            form.tenantGlobal &&
            form.tenantGlobal !== String(tenantGlobalActual?.iud || tenantGlobalActual?._id || '')
        ) {
            body.tenantGlobal = form.tenantGlobal;
        }

        if (!Object.keys(body).length) return;
        await onSave(id, body);
        onClose();
    };

    const tgLabel = tenantGlobalActual?.razon_social ?? tenantGlobalActual?.titulo ?? null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <UserCog className="h-5 w-5 text-primary" />
                        Editar rol — Tenant Global
                        {tgLabel && (
                            <span className="text-sm font-normal text-muted-foreground ml-1 truncate max-w-[160px]">
                                · {tgLabel}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="py-4 space-y-4">

                        {/* Usuario */}
                        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{usuario?.correo}</span>
                            {usuario?.rol && (
                                <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                    {usuario.rol}
                                </span>
                            )}
                        </div>

                        {/* Selector de Rol */}
                        <div className="space-y-2">
                            <Label>Rol Global</Label>
                            {loadingRoles ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Cargando roles...
                                </div>
                            ) : (
                                <Select value={form.rol} onValueChange={v => setForm(f => ({ ...f, rol: v }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(r => (
                                            <SelectItem key={r.nombreRol} value={r.nombreRol}>
                                                {r.nombreRol}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Nueva contraseña */}
                        <div className="space-y-2">
                            <Label htmlFor="rg-password">
                                Nueva contraseña
                                <span className="ml-1 text-xs text-muted-foreground">(opcional, mín. 6)</span>
                            </Label>
                            <Input
                                id="rg-password"
                                name="password"
                                type="password"
                                placeholder="Dejar vacío para no cambiar"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                minLength={6}
                            />
                        </div>

                        {/* Reasignar Tenant Global — solo SUPER_ADMIN */}
                        {scope === 'SUPER_ADMIN' && tenantsGlobales.length > 0 && (
                            <div className="space-y-2">
                                <Label>Reasignar Tenant Global</Label>
                                <Select
                                    value={form.tenantGlobal}
                                    onValueChange={v => setForm(f => ({ ...f, tenantGlobal: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tenant actual" />
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

                        {updateError && (
                            <p className="text-sm text-destructive">
                                Error: {updateError.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isUpdating || loadingRoles}>
                            {isUpdating
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                                : 'Guardar cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
