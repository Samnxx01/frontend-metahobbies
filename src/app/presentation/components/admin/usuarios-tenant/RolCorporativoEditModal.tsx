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
import { Loader2, Building2, UserCog } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { normalizePublicIdForApi, resolveEntityPublicId } from '@/app/utils/entityPublicId';

interface RolCorporativoEditModalProps {
    open: boolean;
    onClose: () => void;
    usuario: { iud?: string; _id?: string; correo: string; rol?: string } | null;
    tenantCorporativo?: { iud?: string; _id?: string; razon_social?: string | null; titulo?: string | null } | null;
    onSave: (id: string, data: Record<string, string>) => Promise<void>;
    isUpdating?: boolean;
    updateError?: Error | null;
}

interface RolCorpOpcion {
    rol: string;
}

interface FormState {
    rol: string;
    password: string;
}

export const RolCorporativoEditModal = ({
    open,
    onClose,
    usuario,
    tenantCorporativo,
    onSave,
    isUpdating = false,
    updateError,
}: RolCorporativoEditModalProps): React.ReactElement => {
    const [roles, setRoles] = useState<RolCorpOpcion[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [form, setForm] = useState<FormState>({ rol: '', password: '' });

    // Cargar roles corporativos y pre-rellenar form al abrir
    useEffect(() => {
        if (!open || !usuario) return;

        setForm({ rol: usuario.rol ?? '', password: '' });

        setLoadingRoles(true);
        apiFetch('/api/config/permisos/corporativo/listar/roles/tenant/corporativo', { method: 'GET' })
            .then((res: any) => {
                const lista: RolCorpOpcion[] = Array.isArray(res?.data)
                    ? res.data.map((r: any) => ({ rol: String(r?.rol ?? '') }))
                    : [];
                // Deduplicar por nombre de rol
                const unicos = lista.filter((r, i, arr) => arr.findIndex(x => x.rol === r.rol) === i);
                setRoles(unicos);
            })
            .catch(() => setRoles([]))
            .finally(() => setLoadingRoles(false));
    }, [open, usuario]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const id = normalizePublicIdForApi(resolveEntityPublicId(usuario));
        if (!id) return;

        const body: Record<string, string> = {};
        if (form.rol && form.rol !== (usuario?.rol ?? '')) body.rol = form.rol;
        if (form.password.trim()) body.password = form.password.trim();

        if (!Object.keys(body).length) return;
        await onSave(id, body);
        onClose();
    };

    const corpLabel = tenantCorporativo?.razon_social ?? tenantCorporativo?.titulo ?? null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <UserCog className="h-5 w-5 text-primary" />
                        Editar rol — Corporativo
                        {corpLabel && (
                            <span className="text-sm font-normal text-muted-foreground ml-1 truncate max-w-[160px]">
                                · {corpLabel}
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

                        {/* Selector de Rol Corporativo */}
                        <div className="space-y-2">
                            <Label>Rol Corporativo</Label>
                            {loadingRoles ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Cargando roles corporativos...
                                </div>
                            ) : roles.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">
                                    No hay roles corporativos configurados.
                                </p>
                            ) : (
                                <Select value={form.rol} onValueChange={v => setForm(f => ({ ...f, rol: v }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(r => (
                                            <SelectItem key={r.rol} value={r.rol}>
                                                {r.rol}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Nueva contraseña */}
                        <div className="space-y-2">
                            <Label htmlFor="rc-password">
                                Nueva contraseña
                                <span className="ml-1 text-xs text-muted-foreground">(opcional, mín. 6)</span>
                            </Label>
                            <Input
                                id="rc-password"
                                name="password"
                                type="password"
                                placeholder="Dejar vacío para no cambiar"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                minLength={6}
                            />
                        </div>

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
