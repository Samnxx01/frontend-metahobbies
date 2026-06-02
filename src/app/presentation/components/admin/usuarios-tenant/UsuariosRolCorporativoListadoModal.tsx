import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Loader2, RefreshCw, Users, Search, Zap, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { deactivateUser } from '@/app/services/adminService';
import { sincronizarLoteAfiliadosAdmin, sincronizarUsuarioAfiliadoAdmin } from '@/app/modules/afiliado-permisos/api/marco.api';
import { HerenciaClienteRelacionCard } from '@/app/presentation/components/admin/usuarios-tenant/HerenciaClienteRelacionCard';
import type {
    ListadoUsuariosRolCorporativoResponse,
    UsuarioRolCorporativoItem,
} from '@/app/presentation/components/admin/usuarios-tenant/usuariosRolCorporativoTypes';

interface UsuariosRolCorporativoListadoModalProps {
    open: boolean;
    onClose: () => void;
    onEditUsuario?: (u: UsuarioRolCorporativoItem) => void;
}

export const UsuariosRolCorporativoListadoModal = ({
    open,
    onClose,
    onEditUsuario,
}: UsuariosRolCorporativoListadoModalProps): React.ReactElement => {
    const [loading, setLoading] = useState(false);
    const [syncingLote, setSyncingLote] = useState(false);
    const [data, setData] = useState<ListadoUsuariosRolCorporativoResponse | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [syncingUsuarioId, setSyncingUsuarioId] = useState<string | null>(null);
    const [usuarioDetalleId, setUsuarioDetalleId] = useState<string | null>(null);
    const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState<string | null>(null);
    const [eliminando, setEliminando] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch<ListadoUsuariosRolCorporativoResponse>(
                '/api/registro/jerarquia/usuarios-rol-corporativo',
                { method: 'GET' }
            );
            setData(res);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error al cargar usuarios');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) {
            setBusqueda('');
            setUsuarioDetalleId(null);
            setUsuarioSeleccionadoId(null);
            return;
        }
        void cargar();
    }, [open, cargar]);

    const filtrados = useMemo(() => {
        const lista = data?.usuarios ?? [];
        const q = busqueda.trim().toLowerCase();
        if (!q) return lista;
        return lista.filter(
            (u) =>
                String(u.correo || '').toLowerCase().includes(q) ||
                String(u.rol || '').toLowerCase().includes(q)
        );
    }, [data?.usuarios, busqueda]);

    const pendientesCount = useMemo(
        () => (data?.usuarios ?? []).filter((u) => u.permisosClientePendiente).length,
        [data?.usuarios]
    );

    const usuarioSeleccionado = useMemo(
        () => filtrados.find((u) => String(u.iud) === usuarioSeleccionadoId) ?? null,
        [filtrados, usuarioSeleccionadoId]
    );

    useEffect(() => {
        if (!open || filtrados.length !== 1) return;
        const unico = String(filtrados[0].iud);
        setUsuarioSeleccionadoId((prev) => prev ?? unico);
    }, [open, filtrados]);

    const eliminarSeleccionado = async () => {
        const id = usuarioSeleccionadoId;
        if (!id) return;
        setEliminando(true);
        try {
            await deactivateUser(id);
            toast.success('Usuario desactivado');
            setUsuarioSeleccionadoId(null);
            setUsuarioDetalleId(null);
            await cargar();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error al desactivar usuario');
        } finally {
            setEliminando(false);
        }
    };

    const sincronizarUsuario = async (usuarioId: string) => {
        setSyncingUsuarioId(usuarioId);
        try {
            const res = await sincronizarUsuarioAfiliadoAdmin(usuarioId);
            const hc = res?.herenciaCliente;
            toast.success(
                res?.msg ||
                    (hc?.herencia?.id
                        ? `Herencia cliente ${hc.herencia.id.slice(-8)} enlazada.`
                        : 'Permisos aplicados al usuario')
            );
            await cargar();
            if (hc) setUsuarioDetalleId(usuarioId);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'No se pudo sincronizar el usuario');
        } finally {
            setSyncingUsuarioId(null);
        }
    };

    const sincronizarLote = async () => {
        setSyncingLote(true);
        try {
            const res = await sincronizarLoteAfiliadosAdmin(100);
            const r = res?.resultado;
            toast.success(
                res?.msg ||
                    `Lote: ${r?.procesados ?? 0} sincronizados, ${r?.omitidos ?? 0} omitidos`
            );
            await cargar();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error al sincronizar lote');
        } finally {
            setSyncingLote(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="flex max-h-[92vh] w-[min(96vw,52rem)] flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-primary" />
                        Usuarios con rol corporativo
                    </DialogTitle>
                    {data?.resumen ? (
                        <p className="text-left text-xs font-normal text-muted-foreground">
                            Total: <strong>{data.total}</strong>
                            {' · '}
                            Tenant corporativo: {data.resumen.enTenantCorporativo}
                            {' · '}
                            Plataforma global: {data.resumen.plataformaGlobal}
                            {' · '}
                            En organigrama: {data.resumen.enColumnaOrganigrama}
                            {' · '}
                            Pendientes sync: {pendientesCount}
                        </p>
                    ) : (
                        <p className="text-left text-xs font-normal text-muted-foreground">
                            Listado en tu alcance JWT (incluye afiliados CLIENTE sin tenant
                            corporativo).
                        </p>
                    )}
                </DialogHeader>

                <div className="shrink-0 border-b border-border px-6 py-3 flex flex-wrap gap-2">
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por correo o rol…"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="h-9 pl-9"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void cargar()}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void sincronizarLote()}
                        disabled={syncingLote || pendientesCount === 0}
                    >
                        {syncingLote ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Zap className="mr-2 h-4 w-4" />
                        )}
                        Sync lote
                        {pendientesCount > 0 ? ` (${pendientesCount})` : ''}
                    </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
                    {loading && !data ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            Cargando usuarios…
                        </div>
                    ) : filtrados.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                            No hay usuarios con rol corporativo en tu alcance.
                        </p>
                    ) : (
                        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                            {filtrados.map((u) => {
                                const uid = String(u.iud);
                                const syncing = syncingUsuarioId === uid;
                                const expandido = usuarioDetalleId === uid;
                                const seleccionado = usuarioSeleccionadoId === uid;
                                return (
                                    <div
                                        key={uid}
                                        role="button"
                                        tabIndex={0}
                                        className={`cursor-pointer bg-background px-4 py-2.5 text-sm hover:bg-muted/30 ${
                                            seleccionado ? 'ring-2 ring-inset ring-primary bg-primary/5' : ''
                                        }`}
                                        onClick={() =>
                                            setUsuarioSeleccionadoId(seleccionado ? null : uid)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setUsuarioSeleccionadoId(seleccionado ? null : uid);
                                            }
                                        }}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{u.correo}</p>
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        {u.rol ?? '—'}
                                                    </Badge>
                                                    <Badge
                                                        variant={
                                                            u.origen === 'PLATAFORMA_GLOBAL'
                                                                ? 'outline'
                                                                : 'default'
                                                        }
                                                        className="text-[10px]"
                                                    >
                                                        {u.origen === 'PLATAFORMA_GLOBAL'
                                                            ? 'Plataforma'
                                                            : 'Tenant corp.'}
                                                    </Badge>
                                                    {u.permisosClientePendiente ? (
                                                        <Badge
                                                            variant="destructive"
                                                            className="text-[10px]"
                                                        >
                                                            Pendiente
                                                        </Badge>
                                                    ) : u.marcoAfiliadoSeqAplicada != null ? (
                                                        <Badge variant="outline" className="text-[10px]">
                                                            seq {u.marcoAfiliadoSeqAplicada}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                {u.herenciaCliente ? (
                                                    <div className="mt-2">
                                                        <HerenciaClienteRelacionCard
                                                            herenciaCliente={u.herenciaCliente}
                                                            compact
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div
                                                className="flex shrink-0 gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {u.origen === 'PLATAFORMA_GLOBAL' ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs"
                                                        disabled={syncing || syncingLote}
                                                        onClick={() => void sincronizarUsuario(uid)}
                                                    >
                                                        {syncing ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            'Aplicar marco'
                                                        )}
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() =>
                                                        setUsuarioDetalleId(expandido ? null : uid)
                                                    }
                                                >
                                                    {expandido ? 'Ocultar' : 'Herencia'}
                                                </Button>
                                                {onEditUsuario ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-xs"
                                                        onClick={() => onEditUsuario(u)}
                                                    >
                                                        Editar
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                        {expandido && u.herenciaCliente ? (
                                            <div className="mt-2 pb-1">
                                                <HerenciaClienteRelacionCard
                                                    herenciaCliente={u.herenciaCliente}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={!usuarioSeleccionadoId || eliminando}
                            >
                                {eliminando ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Eliminar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Se desactivará{' '}
                                    <strong>{usuarioSeleccionado?.correo ?? 'el usuario seleccionado'}</strong>.
                                    Dejará de aparecer en listados activos; el registro no se borra de la base
                                    de datos.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => void eliminarSeleccionado()}
                                >
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button type="button" variant="outline" onClick={onClose} disabled={eliminando}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UsuariosRolCorporativoListadoModal;
