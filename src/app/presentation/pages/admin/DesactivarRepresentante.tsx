import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/app/services/api';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2, Trash2, UserX } from 'lucide-react';

interface RepresentanteItem {
    _id?: string;
    iud?: string;
    nombre_representante_legal?: string;
    cargo_representante_legal?: string;
}

interface DesactivarProps {
    idRepresentante?: string;
    representantes?: RepresentanteItem[];
    onSuccess?: () => void;
    showScopeDescription?: boolean;
}

type RepresentativeAction = 'DESACTIVAR' | 'ELIMINAR';

export default function DesactivarRepresentante({
    idRepresentante,
    representantes = [],
    onSuccess,
    showScopeDescription = true,
}: DesactivarProps) {
    const { user } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRepresentativeId, setSelectedRepresentativeId] = useState('');
    const [selectedAction, setSelectedAction] = useState<RepresentativeAction>('DESACTIVAR');

    const scopeInfo = useMemo(() => {
        const tenantScope = user?.auth?.tenantScope || {};
        const tenantSuperAdminId = String(user?.tenantSuperAdminId || tenantScope?.tenantSuperAdminId || '').trim();
        const tenantGlobalId = String(user?.tenantGlobalId || tenantScope?.tenantGlobalId || '').trim();
        const tenantCorporativoId = String(user?.tenantCorporativoId || tenantScope?.tenantCorporativoId || '').trim();
        const userRol = String(user?.rol || '').toUpperCase();
        const isSystemSuperAdmin = ['DIOS', 'DESAROLLADOR'].includes(userRol);
        const isSuperAdmin = (!!tenantSuperAdminId && !tenantGlobalId) || isSystemSuperAdmin;
        const isTenantCorporativo = !!tenantCorporativoId;
        const isTenantGlobal = !!tenantGlobalId && !isTenantCorporativo;

        return {
            canManage: isSuperAdmin || isTenantGlobal,
            canDelete: isSuperAdmin,
            showDescription: isSuperAdmin,
        };
    }, [user]);

    const representativeOptions = useMemo(
        () =>
            representantes
                .map((representante) => {
                    const id = String(representante?._id || representante?.iud || '').trim();
                    if (!id) return null;

                    const nombre = representante?.nombre_representante_legal || id;
                    const cargo = representante?.cargo_representante_legal ? ` - ${representante.cargo_representante_legal}` : '';
                    return { id, label: `${nombre}${cargo}` };
                })
                .filter((item): item is { id: string; label: string } => item !== null),
        [representantes]
    );

    useEffect(() => {
        const fallbackId = String(idRepresentante || representativeOptions[0]?.id || '').trim();
        setSelectedRepresentativeId((current) => {
            if (idRepresentante) return fallbackId;
            const currentExists = representativeOptions.some((item) => item.id === current);
            return currentExists ? current : fallbackId;
        });
    }, [idRepresentante, representativeOptions]);

    useEffect(() => {
        if (!scopeInfo.canDelete && selectedAction === 'ELIMINAR') {
            setSelectedAction('DESACTIVAR');
        }
    }, [scopeInfo.canDelete, selectedAction]);

    const executeAction = async () => {
        if (!scopeInfo.canManage) {
            toast.error('Tu scope actual no puede gestionar representantes');
            return;
        }

        if (!selectedRepresentativeId) {
            toast.error('Selecciona un representante');
            return;
        }

        if (selectedAction === 'ELIMINAR' && !scopeInfo.canDelete) {
            toast.error('Solo tenantSuperAdmin puede eliminar representantes');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await apiFetch(`/api/config/parametrizacion/desactivar/repre/coporativa/${selectedRepresentativeId}`, {
                method: 'DELETE',
                body: {
                    id: selectedRepresentativeId,
                    accion: selectedAction,
                },
                useAuth: true,
            });

            if (response?.ok) {
                toast.success(
                    selectedAction === 'ELIMINAR'
                        ? 'Representante legal eliminado correctamente'
                        : 'Representante legal desactivado correctamente'
                );
                setConfirmOpen(false);
                setIsDialogOpen(false);
                onSuccess?.();
                return;
            }

            toast.error(response?.msg || 'No se pudo completar la accion');
        } catch (error) {
            console.error('Error gestionando representante:', error);
            toast.error('Error de conexion con el servidor');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!scopeInfo.canManage) {
        return (
            <Button type="button" variant="outline" className="gap-2" disabled>
                <UserX className="h-4 w-4" />
                Gestion no disponible
            </Button>
        );
    }

    return (
        <div className="space-y-3 text-foreground">
            {showScopeDescription && scopeInfo.showDescription && (
                <div className="rounded-md border border-info/20 bg-info/10 px-3 py-2 text-xs text-info">
                    <div className="font-medium">Scope activo: tenantSuperAdmin</div>
                    <div className="mt-1">Puede desactivar o eliminar representantes visibles dentro de la parametrizacion corporativa.</div>
                </div>
            )}

            <Button variant="destructive" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                <UserX className="h-4 w-4" />
                {scopeInfo.canDelete ? 'Gestionar Representante' : 'Desactivar Representante'}
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md text-foreground">
                    <DialogHeader>
                        <DialogTitle>Gestion de representante</DialogTitle>
                        <DialogDescription>
                            Selecciona el representante y la accion que deseas ejecutar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Representante objetivo</Label>
                            <Select value={selectedRepresentativeId} onValueChange={setSelectedRepresentativeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un representante" />
                                </SelectTrigger>
                                <SelectContent>
                                    {representativeOptions.map((representante) => (
                                        <SelectItem key={representante.id} value={representante.id}>
                                            {representante.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Accion</Label>
                            <div className={`grid gap-2 ${scopeInfo.canDelete ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                                <button
                                    type="button"
                                    className={`rounded-md border px-3 py-3 text-left text-sm ${selectedAction === 'DESACTIVAR' ? 'border-info/30 bg-info/10 text-info-foreground' : 'border-border bg-card text-foreground'}`}
                                    onClick={() => setSelectedAction('DESACTIVAR')}
                                >
                                    <div className="font-medium">Desactivar</div>
                                    <div className="mt-1 text-xs">Baja logica del representante.</div>
                                </button>
                                {scopeInfo.canDelete && (
                                    <button
                                        type="button"
                                        className={`rounded-md border px-3 py-3 text-left text-sm ${selectedAction === 'ELIMINAR' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border bg-card text-foreground'}`}
                                        onClick={() => setSelectedAction('ELIMINAR')}
                                    >
                                        <div className="font-medium">Eliminar</div>
                                        <div className="mt-1 text-xs">Solo tenantSuperAdmin puede eliminar fisicamente.</div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant={selectedAction === 'ELIMINAR' ? 'destructive' : 'default'}
                            className={selectedAction === 'DESACTIVAR' ? 'bg-info hover:bg-info' : ''}
                            disabled={!selectedRepresentativeId || isSubmitting}
                            onClick={() => setConfirmOpen(true)}
                        >
                            {selectedAction === 'ELIMINAR' ? <Trash2 className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                            {selectedAction === 'ELIMINAR' ? 'Continuar con eliminacion' : 'Continuar con desactivacion'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="text-foreground">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Confirmar accion sobre representante
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedAction === 'ELIMINAR'
                                ? 'Esta accion eliminara el representante seleccionado de forma permanente.'
                                : 'Esta accion desactivara el representante seleccionado de forma logica.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeAction}
                            className={selectedAction === 'ELIMINAR'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : 'bg-info text-button-foreground hover:bg-info'}
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                : selectedAction === 'ELIMINAR'
                                    ? 'Si, eliminar'
                                    : 'Si, desactivar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
