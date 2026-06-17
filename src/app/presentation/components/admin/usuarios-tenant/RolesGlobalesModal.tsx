import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Plus, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';
import { encodePublicIdForPath, resolveEntityPublicId } from '@/app/utils/entityPublicId';

interface RolGlobal {
    iud?: string;
    _id?: string;
    nombreRol: string;
    estado: boolean;
}

interface RolesGlobalesModalProps {
    open: boolean;
    onClose: () => void;
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
}

// ─── Sub-modal de confirmación ────────────────────────────────────────────────

interface ConfirmModalProps {
    rol: RolGlobal | null;
    scope: 'SUPER_ADMIN' | 'TENANT_GLOBAL' | 'CORPORATIVO';
    onDesactivar: () => void;
    onEliminar: () => void;
    onClose: () => void;
    loading: boolean;
}

const ConfirmDeleteModal = ({
    rol,
    scope,
    onDesactivar,
    onEliminar,
    onClose,
    loading,
}: ConfirmModalProps): React.ReactElement => (
    <Dialog open={rol !== null} onOpenChange={() => !loading && onClose()}>
        <DialogContent className="sm:max-w-sm p-6">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    {scope === 'SUPER_ADMIN' ? 'Acción sobre rol' : 'Desactivar rol'}
                </DialogTitle>
            </DialogHeader>

            <div className="py-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                    Rol: <span className="font-mono font-semibold text-foreground">{rol?.nombreRol}</span>
                </p>

                {scope === 'SUPER_ADMIN' ? (
                    <p className="text-sm text-muted-foreground">
                        Selecciona la acción a realizar sobre este rol.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        El rol quedará inactivo pero podrá reactivarse.
                    </p>
                )}
            </div>

            <DialogFooter className="flex gap-2 flex-col sm:flex-row">
                <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                    className="sm:order-first"
                >
                    Cancelar
                </Button>

                {/* Desactivar — disponible para TG y SA */}
                <Button
                    variant="secondary"
                    onClick={onDesactivar}
                    disabled={loading}
                >
                    {loading
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Trash2 className="h-4 w-4 mr-2" />}
                    Desactivar
                </Button>

                {/* Eliminar definitivo — solo SA */}
                {scope === 'SUPER_ADMIN' && (
                    <Button
                        variant="destructive"
                        onClick={onEliminar}
                        disabled={loading}
                    >
                        {loading
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <Trash2 className="h-4 w-4 mr-2" />}
                        Eliminar definitivo
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

// ─── Modal principal ──────────────────────────────────────────────────────────

export const RolesGlobalesModal = ({
    open,
    onClose,
    scope,
}: RolesGlobalesModalProps): React.ReactElement => {
    const [roles, setRoles] = useState<RolGlobal[]>([]);
    const [loading, setLoading] = useState(false);
    const [nuevoRol, setNuevoRol] = useState('');
    const [creando, setCreando] = useState(false);

    // Sub-modal confirmación
    const [rolParaEliminar, setRolParaEliminar] = useState<RolGlobal | null>(null);
    const [procesando, setProcesando] = useState(false);

    const cargarRoles = async () => {
        setLoading(true);
        try {
            const res: any = await apiFetch('/api/seguridad/roles/admin', { method: 'GET' });
            setRoles(Array.isArray(res?.roles) ? res.roles : []);
        } catch {
            toast.error('Error al cargar roles globales');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) cargarRoles();
        else { setNuevoRol(''); setRolParaEliminar(null); }
    }, [open]);

    const handleCrear = async () => {
        const nombre = nuevoRol.trim().toUpperCase();
        if (!nombre) { toast.error('El nombre del rol es obligatorio'); return; }
        setCreando(true);
        try {
            await apiFetch('/api/seguridad/roles/admin', { method: 'POST', body: { rol: nombre } });
            toast.success(`Rol "${nombre}" creado`);
            setNuevoRol('');
            await cargarRoles();
        } catch (err: any) {
            toast.error(String(err?.message || 'Error al crear rol'));
        } finally {
            setCreando(false);
        }
    };

    const handleDesactivar = async () => {
        if (!rolParaEliminar) return;
        setProcesando(true);
        try {
            await apiFetch(`/api/seguridad/roles/admin/${encodePublicIdForPath(rolParaEliminar)}`, { method: 'DELETE' });
            toast.success(`Rol "${rolParaEliminar.nombreRol}" desactivado`);
            setRolParaEliminar(null);
            await cargarRoles();
        } catch (err: any) {
            toast.error(String(err?.message || 'Error al desactivar rol'));
        } finally {
            setProcesando(false);
        }
    };

    const handleEliminarDefinitivo = async () => {
        if (!rolParaEliminar) return;
        setProcesando(true);
        try {
            await apiFetch(`/api/seguridad/roles/admin/eliminar/${encodePublicIdForPath(rolParaEliminar)}`, { method: 'DELETE' });
            toast.success(`Rol "${rolParaEliminar.nombreRol}" eliminado definitivamente`);
            setRolParaEliminar(null);
            await cargarRoles();
        } catch (err: any) {
            toast.error(String(err?.message || 'Error al eliminar rol'));
        } finally {
            setProcesando(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            Roles Globales
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Crear nuevo rol */}
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                            <p className="text-sm font-semibold">Nuevo rol global</p>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ej: AUDITOR"
                                    value={nuevoRol}
                                    onChange={e => setNuevoRol(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && void handleCrear()}
                                    disabled={creando}
                                />
                                <Button
                                    onClick={handleCrear}
                                    disabled={creando || !nuevoRol.trim()}
                                    size="sm"
                                >
                                    {creando
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Plus className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* Lista */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Roles existentes</Label>
                                <Button variant="ghost" size="sm" onClick={cargarRoles} disabled={loading}>
                                    {loading
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <RefreshCw className="h-3.5 w-3.5" />}
                                </Button>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : roles.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Sin roles configurados.
                                </p>
                            ) : (
                                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                    {roles
                                        .filter(r => scope !== 'TENANT_GLOBAL' || r.nombreRol !== 'DIOS')
                                        .map(r => (
                                        <div
                                            key={resolveEntityPublicId(r)}
                                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                                        >
                                            <span className="font-mono font-medium">{r.nombreRol}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={r.estado ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {r.estado ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                                {r.estado && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setRolParaEliminar(r)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={onClose}>Cerrar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sub-modal de confirmación */}
            <ConfirmDeleteModal
                rol={rolParaEliminar}
                scope={scope}
                onDesactivar={() => void handleDesactivar()}
                onEliminar={() => void handleEliminarDefinitivo()}
                onClose={() => setRolParaEliminar(null)}
                loading={procesando}
            />
        </>
    );
};
