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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Globe, UserCog, UserX } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import type { TenantGlobalInfo } from '@/app/services/tenantUsuariosService';
import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

interface RolGlobalEditModalProps {
    open: boolean;
    onClose: () => void;
    usuario: { iud?: string; _id?: string; correo: string; rol?: string } | null;
    tenantsGlobales?: TenantGlobalInfo[];
    tenantGlobalActual?: { iud?: string; _id?: string; razon_social?: string | null; titulo?: string | null } | null;
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
    onSave: (id: string, data: Record<string, string>) => Promise<void>;
    onDeactivate?: (id: string) => Promise<void>;
    isUpdating?: boolean;
    isDeactivating?: boolean;
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
    onDeactivate,
    isUpdating = false,
    isDeactivating = false,
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
            tenantGlobal: resolveEntityPublicId(tenantGlobalActual),
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
        const id = resolveEntityPublicId(usuario);
        if (!id) return;

        const body: Record<string, string> = {};
        if (form.rol && form.rol !== (usuario?.rol ?? '')) body.rol = form.rol;
        if (form.password.trim()) body.password = form.password.trim();
        if (
            scope === 'SUPER_ADMIN' &&
            form.tenantGlobal &&
            form.tenantGlobal !== resolveEntityPublicId(tenantGlobalActual)
        ) {
            body.tenantGlobal = normalizePublicIdForApi(form.tenantGlobal);
        }

        if (!Object.keys(body).length) return;
        await onSave(normalizePublicIdForApi(id), body);
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
                                        {tenantsGlobales.map(tg => {
                                            const tgId = resolveEntityPublicId(tg);
                                            return (
                                            <SelectItem key={tgId} value={tgId}>
                                                {tg.razon_social ?? tg.titulo ?? tgId}
                                            </SelectItem>
                                            );
                                        })}
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

                    <DialogFooter className="pt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {onDeactivate ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="sm:mr-auto"
                                        disabled={isUpdating || isDeactivating}
                                    >
                                        {isDeactivating ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Desactivando…</>
                                        ) : (
                                            <><UserX className="h-4 w-4 mr-2" /> Desactivar usuario</>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Desactivar este usuario?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            El usuario <strong>{usuario?.correo}</strong> quedará inactivo
                                            (estado deshabilitado) y dejará de aparecer en listados activos.
                                            No se borra el registro de la base de datos.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={async () => {
                                                const uid = normalizePublicIdForApi(resolveEntityPublicId(usuario));
                                                if (!uid) return;
                                                await onDeactivate(uid);
                                                onClose();
                                            }}
                                        >
                                            Desactivar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                            <span className="hidden sm:block sm:flex-1" />
                        )}
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating || isDeactivating}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isUpdating || isDeactivating || loadingRoles}>
                                {isUpdating
                                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                                    : 'Guardar cambios'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
