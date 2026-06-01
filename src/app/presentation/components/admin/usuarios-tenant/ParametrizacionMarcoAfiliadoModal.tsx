import React, { useCallback, useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RefreshCw, Save, Settings2, Shield, Sparkles, Zap } from 'lucide-react';
import { apiFetch } from '@/app/services/api';
import { useMarcoPermisosParametrizacion } from '@/app/modules/afiliado-permisos/hooks/useMarcoPermisosParametrizacion';
import { MarcoPermisosStatsCards } from '@/app/modules/afiliado-permisos/components/MarcoPermisosStatsCards';
import { MarcoPermisosCatalogCard } from '@/app/modules/afiliado-permisos/components/MarcoPermisosCatalogCard';
import { MARCO_AFILIADO_CODIGO } from '@/app/modules/afiliado-permisos/constants/catalog-filters';
import type { ListadoUsuariosRolCorporativoResponse } from '@/app/presentation/components/admin/usuarios-tenant/usuariosRolCorporativoTypes';

interface ParametrizacionMarcoAfiliadoModalProps {
    open: boolean;
    onClose: () => void;
}

export const ParametrizacionMarcoAfiliadoModal = ({
    open,
    onClose,
}: ParametrizacionMarcoAfiliadoModalProps): React.ReactElement => {
    const vm = useMarcoPermisosParametrizacion();
    const [pendientesCount, setPendientesCount] = useState(0);

    const cargarPendientes = useCallback(async () => {
        try {
            const res = await apiFetch<ListadoUsuariosRolCorporativoResponse>(
                '/api/registro/jerarquia/usuarios-rol-corporativo',
                { method: 'GET' }
            );
            setPendientesCount(
                (res?.usuarios ?? []).filter((u) => u.permisosClientePendiente).length
            );
        } catch {
            setPendientesCount(0);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        void vm.cargar();
        void cargarPendientes();
    }, [open, cargarPendientes]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSincronizarLote = async () => {
        await vm.sincronizarLote();
        await cargarPendientes();
    };

    const handleGuardar = async () => {
        await vm.guardar();
        await cargarPendientes();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="flex max-h-[92vh] w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Settings2 className="h-5 w-5 text-primary" />
                        Parametrización del marco — {MARCO_AFILIADO_CODIGO}
                    </DialogTitle>
                    <p className="text-left text-xs font-normal text-muted-foreground">
                        Define el techo de vistas y acciones HTTP para el rol corporativo{' '}
                        <strong>CLIENTE</strong>. Al guardar
                        se crea una nueva versión <strong>seq</strong> y se sincroniza automáticamente
                        la <strong>herenciaCliente</strong> en los afiliados elegibles. Use «Sincronizar
                        pendientes» para repetir el lote manualmente.
                    </p>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {vm.loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            Cargando marco…
                        </div>
                    ) : (
                        <>
                            <Alert>
                                <Shield className="h-4 w-4" />
                                <AlertTitle>Flujo automático</AlertTitle>
                                <AlertDescription className="text-xs sm:text-sm">
                                    1) Configure vistas y acciones. 2) Guarde el techo. 3) Sincronice
                                    pendientes (usuarios con pago aprobado y membresía activa). El
                                    listado de usuarios está en el modal «Usuarios rol corporativo».
                                </AlertDescription>
                            </Alert>

                            <MarcoPermisosStatsCards
                                marcoActivo={vm.marcoActivo}
                                vistasCount={vm.vistasSel.size}
                                accionesCount={vm.accionesSel.size}
                            />

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => vm.aplicarSugeridas()}
                                    disabled={vm.saving || vm.syncingLote}
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Aplicar sugeridas
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void vm.cargar()}
                                    disabled={vm.saving || vm.syncingLote}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Recargar
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => void handleSincronizarLote()}
                                    disabled={
                                        vm.syncingLote ||
                                        vm.saving ||
                                        !vm.marcoActivo ||
                                        pendientesCount === 0
                                    }
                                >
                                    {vm.syncingLote ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Zap className="mr-2 h-4 w-4" />
                                    )}
                                    Sincronizar pendientes
                                    {pendientesCount > 0 ? ` (${pendientesCount})` : ''}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void handleGuardar()}
                                    disabled={vm.saving || vm.syncingLote}
                                >
                                    {vm.saving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Guardar techo
                                </Button>
                            </div>

                            <MarcoPermisosCatalogCard
                                tab={vm.tab}
                                onTabChange={vm.setTab}
                                filtro={vm.filtro}
                                onFiltroChange={vm.setFiltro}
                                soloSugeridas={vm.soloSugeridas}
                                onSoloSugeridasChange={vm.setSoloSugeridas}
                                vistasSel={vm.vistasSel}
                                accionesSel={vm.accionesSel}
                                rutasFiltradas={vm.rutasFiltradas}
                                accionesFiltradas={vm.accionesFiltradas}
                                onToggleVista={vm.toggleVista}
                                onToggleAccion={vm.toggleAccion}
                                onSeleccionarVistasVisibles={vm.seleccionarTodasVistasVisibles}
                                onLimpiarVistasVisibles={vm.limpiarVistasVisibles}
                                onSeleccionarAccionesVisibles={vm.seleccionarTodasAccionesVisibles}
                                onLimpiarAccionesVisibles={vm.limpiarAccionesVisibles}
                            />
                        </>
                    )}
                </div>

                <div className="flex shrink-0 justify-end border-t border-border px-6 py-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ParametrizacionMarcoAfiliadoModal;
