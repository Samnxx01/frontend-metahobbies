import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Plus, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';

interface RolCorporativo {
    _id?: string;
    rol: string;
    tenantCorporativo?: string | null;
}

interface RolesCorporativosModalProps {
    open: boolean;
    onClose: () => void;
}

export const RolesCorporativosModal = ({ open, onClose }: RolesCorporativosModalProps): React.ReactElement => {
    const [roles, setRoles] = useState<RolCorporativo[]>([]);
    const [loading, setLoading] = useState(false);
    const [nuevoRol, setNuevoRol] = useState('');
    const [creando, setCreando] = useState(false);

    const cargarRoles = async () => {
        setLoading(true);
        try {
            const res: any = await apiFetch('/api/config/permisos/corporativo/listar/roles/tenant/corporativo', { method: 'GET' });
            const lista: RolCorporativo[] = Array.isArray(res?.data) ? res.data : [];
            // Deduplicar por nombre
            const unicos = lista.filter((r, i, arr) => arr.findIndex(x => x.rol === r.rol) === i);
            setRoles(unicos);
        } catch {
            toast.error('Error al cargar roles corporativos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) cargarRoles();
        else setNuevoRol('');
    }, [open]);

    const handleCrear = async () => {
        const nombre = nuevoRol.trim().toUpperCase();
        if (!nombre) { toast.error('El nombre del rol es obligatorio'); return; }
        setCreando(true);
        try {
            await apiFetch('/api/config/permisos/corporativo/guardar/roles/tenant/corporativo', {
                method: 'POST',
                body: { rol: nombre },
            });
            toast.success(`Rol corporativo "${nombre}" creado`);
            setNuevoRol('');
            await cargarRoles();
        } catch (err: any) {
            toast.error(String(err?.message || 'Error al crear rol corporativo'));
        } finally {
            setCreando(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Roles Corporativos
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Crear nuevo rol */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <p className="text-sm font-semibold">Nuevo rol corporativo</p>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ej: SUPERVISOR"
                                value={nuevoRol}
                                onChange={e => setNuevoRol(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && void handleCrear()}
                                disabled={creando}
                            />
                            <Button onClick={handleCrear} disabled={creando || !nuevoRol.trim()} size="sm">
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
                                Sin roles corporativos configurados.
                            </p>
                        ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                {roles.map((r, i) => (
                                    <div
                                        key={r._id ?? `${r.rol}-${i}`}
                                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                                    >
                                        <span className="font-mono font-medium">{r.rol}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {r.tenantCorporativo ? 'Corporativo' : 'Global'}
                                        </Badge>
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
    );
};
