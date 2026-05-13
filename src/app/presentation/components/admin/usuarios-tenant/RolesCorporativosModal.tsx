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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, Globe, Plus, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';

interface RolCorporativo {
    _id?: string;
    rol: string;
    tenantCorporativo?: string | { _id?: string } | null;
}

interface TenantGlobalOpcion {
    id: string;
    label: string;
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
    const [tenantGlobales, setTenantGlobales] = useState<TenantGlobalOpcion[]>([]);
    const [cargandoTg, setCargandoTg] = useState(false);
    const [tenantGlobalId, setTenantGlobalId] = useState('');

    const mapTenantGlobalesRes = (res: any): TenantGlobalOpcion[] => {
        const raw = Array.isArray(res?.tenantsGlobales) ? res.tenantsGlobales : [];
        return raw
            .map((t: any) => {
                const id = String(t?.iud ?? t?._id ?? '').trim();
                if (!id) return null;
                const corp = String(t?.coporativo?.razon_social ?? t?.coporativo?.titulo ?? '').trim();
                const codigo = String(t?.codigoJerarquia ?? '').trim();
                const label = corp || codigo || id.slice(-8);
                return { id, label };
            })
            .filter(Boolean) as TenantGlobalOpcion[];
    };

    const cargarTenantGlobales = async () => {
        setCargandoTg(true);
        try {
            const res: any = await apiFetch('/api/registro/tenants/global/registro', { method: 'GET' });
            const opts = mapTenantGlobalesRes(res);
            setTenantGlobales(opts);
            setTenantGlobalId((prev) => {
                if (prev && opts.some((o) => o.id === prev)) return prev;
                if (opts.length === 1) return opts[0].id;
                return '';
            });
        } catch {
            toast.error('Error al cargar tenant globales');
            setTenantGlobales([]);
        } finally {
            setCargandoTg(false);
        }
    };

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
        if (open) {
            void cargarRoles();
            void cargarTenantGlobales();
        } else {
            setNuevoRol('');
            setTenantGlobalId('');
        }
    }, [open]);

    const handleCrear = async () => {
        const nombre = nuevoRol.trim().toUpperCase();
        if (!nombre) { toast.error('El nombre del rol es obligatorio'); return; }
        const tg = tenantGlobalId.trim();
        if (tenantGlobales.length > 0 && !tg) {
            toast.error('Selecciona el tenant global al que asociar el rol');
            return;
        }
        setCreando(true);
        try {
            const body: Record<string, string> = { rol: nombre };
            if (tg) body.tenantGlobalId = tg;
            await apiFetch('/api/config/permisos/corporativo/guardar/roles/tenant/corporativo', {
                method: 'POST',
                body,
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
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5" /> Tenant global
                            </Label>
                            {cargandoTg ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando tenant globales…
                                </div>
                            ) : tenantGlobales.length === 0 ? (
                                <p className="text-xs text-amber-700 dark:text-amber-500 rounded-md border border-dashed border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 px-2 py-2">
                                    No hay tenant globales en tu alcance, o el servidor usará el corporativo de tu sesión si aplica.
                                </p>
                            ) : (
                                <>
                                    <Select
                                        value={tenantGlobalId || undefined}
                                        onValueChange={setTenantGlobalId}
                                        disabled={creando}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecciona tenant global" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenantGlobales.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                        El rol se guarda sobre el tenant corporativo raíz (o el primero activo) de ese global.
                                    </p>
                                </>
                            )}
                        </div>
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
