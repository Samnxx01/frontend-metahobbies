import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Users, Search } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { toast } from 'react-toastify';
import type { TenantUsuario } from '@/app/services/tenantUsuariosService';
import { resolveEntityPublicId } from '@/app/utils/entityPublicId';

export interface UsuarioRolCorporativoItem extends TenantUsuario {
    origen: 'TENANT_CORPORATIVO' | 'PLATAFORMA_GLOBAL';
    tenantCorporativoId: string | null;
    permisosClientePendiente?: boolean;
    marcoAfiliadoSeqAplicada?: number | null;
}

interface ListadoResponse {
    scope: string | null;
    total: number;
    resumen: {
        enTenantCorporativo: number;
        plataformaGlobal: number;
        enColumnaOrganigrama: number;
    };
    usuarios: UsuarioRolCorporativoItem[];
}

interface UsuariosRolCorporativoModalProps {
    open: boolean;
    onClose: () => void;
    onEditUsuario?: (u: UsuarioRolCorporativoItem) => void;
}

export const UsuariosRolCorporativoModal = ({
    open,
    onClose,
    onEditUsuario,
}: UsuariosRolCorporativoModalProps): React.ReactElement => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ListadoResponse | null>(null);
    const [busqueda, setBusqueda] = useState('');

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch<ListadoResponse>(
                '/api/registro/jerarquia/usuarios-rol-corporativo',
                { method: 'GET' }
            );
            setData(res);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al cargar usuarios';
            toast.error(msg);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            void cargar();
        } else {
            setBusqueda('');
        }
    }, [open, cargar]);

    const filtrados = useMemo(() => {
        const lista = data?.usuarios ?? [];
        const q = busqueda.trim().toLowerCase();
        if (!q) return lista;
        return lista.filter(
            (u) =>
                String(u.correo || '').toLowerCase().includes(q) ||
                String(u.rol || '').toLowerCase().includes(q) ||
                String(u.origen || '').toLowerCase().includes(q)
        );
    }, [data?.usuarios, busqueda]);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-primary" />
                        Usuarios con rol corporativo
                    </DialogTitle>
                    {data?.resumen ? (
                        <p className="text-xs text-muted-foreground text-left font-normal pt-1">
                            Total: <strong>{data.total}</strong>
                            {' · '}
                            En tenant corporativo: {data.resumen.enTenantCorporativo}
                            {' · '}
                            Plataforma global (CLIENTE): {data.resumen.plataformaGlobal}
                            {data.resumen.enColumnaOrganigrama !== data.total ? (
                                <>
                                    {' · '}
                                    En columna organigrama: {data.resumen.enColumnaOrganigrama}
                                </>
                            ) : null}
                        </p>
                    ) : null}
                </DialogHeader>

                <div className="px-6 py-3 flex flex-wrap gap-2 items-center border-b border-border shrink-0">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por correo o rol..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void cargar()} disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[200px]">
                    {loading && !data ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Cargando...
                        </div>
                    ) : filtrados.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8 rounded-lg border border-dashed">
                            No hay usuarios con rol corporativo en tu alcance.
                        </p>
                    ) : (
                        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                            {filtrados.map((u) => (
                                <div
                                    key={resolveEntityPublicId(u)}
                                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm bg-background hover:bg-muted/30"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-foreground">{u.correo}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {u.rol ?? '—'}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    u.origen === 'PLATAFORMA_GLOBAL' ? 'outline' : 'default'
                                                }
                                                className="text-[10px]"
                                            >
                                                {u.origen === 'PLATAFORMA_GLOBAL'
                                                    ? 'Plataforma global'
                                                    : 'Tenant corp.'}
                                            </Badge>
                                            {u.permisosClientePendiente ? (
                                                <Badge variant="destructive" className="text-[10px]">
                                                    Permisos pendientes
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                    {onEditUsuario ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0 text-xs"
                                            onClick={() => onEditUsuario(u)}
                                        >
                                            Ver / editar
                                        </Button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
