import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    type CatalogoCorporativo,
    catalogoCorporativoService,
} from '@/app/services/catalogoCorporativoService';

// ─── Edit dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
    item: CatalogoCorporativo | null;
    onClose: () => void;
    onSaved: () => void;
}

function EditDialog({ item, onClose, onSaved }: EditDialogProps): React.ReactElement {
    const [tipo_comprador, setTipoComprador] = useState('');
    const [sigla, setSigla] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (item) {
            setTipoComprador(item.tipo_comprador);
            setSigla(item.sigla);
        }
    }, [item]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item) return;
        setSubmitting(true);
        try {
            const res = await catalogoCorporativoService.actualizar(item.iud, {
                tipo_comprador,
                sigla,
            });
            if (res?.ok) {
                toast.success('Catálogo actualizado');
                onSaved();
                onClose();
            } else {
                toast.error(res?.msg || 'No se pudo actualizar');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al actualizar');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={!!item} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] max-w-md overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-primary" />
                        Editar catálogo
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label>Tipo comprador *</Label>
                        <Input
                            required
                            value={tipo_comprador}
                            onChange={(e) => setTipoComprador(e.target.value)}
                            placeholder="Ej: DISTRIBUIDOR"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Sigla *</Label>
                        <Input
                            required
                            value={sigla}
                            onChange={(e) => setSigla(e.target.value)}
                            placeholder="Ej: DIST"
                            maxLength={10}
                        />
                    </div>
                    <DialogFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                : <Save className="mr-2 h-4 w-4" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CatalogosCorporativos(): React.ReactElement {
    const [catalogos, setCatalogos] = useState<CatalogoCorporativo[]>([]);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Formulario nuevo catálogo
    const [showForm, setShowForm] = useState(false);
    const [tipo_comprador, setTipoComprador] = useState('');
    const [sigla, setSigla] = useState('');

    // Edición
    const [editItem, setEditItem] = useState<CatalogoCorporativo | null>(null);

    const cargarCatalogos = useCallback(async () => {
        setLoading(true);
        try {
            const res = await catalogoCorporativoService.listar();
            setCatalogos(res?.data ?? []);
        } catch (error: any) {
            toast.error(error?.message || 'Error cargando catálogos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void cargarCatalogos();
    }, [cargarCatalogos]);

    const handleInicializar = async () => {
        setSeeding(true);
        try {
            const res = await catalogoCorporativoService.inicializarDefaults();
            toast.success(res?.msg || 'Catálogos por defecto inicializados');
            void cargarCatalogos();
        } catch (error: any) {
            toast.error(error?.message || 'Error al inicializar');
        } finally {
            setSeeding(false);
        }
    };

    const handleCrear = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await catalogoCorporativoService.crear({ tipo_comprador, sigla });
            if (res?.ok) {
                toast.success('Catálogo creado correctamente');
                if (res.defaultsGenerados?.length) {
                    toast.info(`Se generaron ${res.defaultsGenerados.length} catálogo(s) por defecto automáticamente`);
                }
                setTipoComprador('');
                setSigla('');
                setShowForm(false);
                void cargarCatalogos();
            } else {
                toast.error(res?.msg || 'No se pudo crear el catálogo');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al crear catálogo');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDesactivar = async (item: CatalogoCorporativo) => {
        if (!confirm(`¿Desactivar "${item.tipo_comprador}"?`)) return;
        try {
            const res = await catalogoCorporativoService.desactivar(item.iud);
            if (res?.ok) {
                toast.success('Catálogo desactivado');
                void cargarCatalogos();
            } else {
                toast.error(res?.msg || 'No se pudo desactivar');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al desactivar');
        }
    };

    const defaults = catalogos.filter((c) => c.esDefault);
    const custom = catalogos.filter((c) => !c.esDefault);

    return (
        <div className="space-y-6 p-6 max-w-3xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Catálogos Corporativos</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Tipos de comprador disponibles para tu organización.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleInicializar}
                        disabled={seeding}
                    >
                        {seeding
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : <RefreshCw className="mr-2 h-4 w-4" />}
                        Inicializar defaults
                    </Button>
                    <Button size="sm" onClick={() => setShowForm((v) => !v)}>
                        {showForm
                            ? <><X className="mr-2 h-4 w-4" /> Cancelar</>
                            : <><Plus className="mr-2 h-4 w-4" /> Nuevo catálogo</>}
                    </Button>
                </div>
            </div>

            {/* Formulario nuevo */}
            {showForm && (
                <form
                    onSubmit={handleCrear}
                    className="rounded-lg border bg-card p-4 space-y-4"
                >
                    <p className="text-sm font-medium text-muted-foreground">Agregar tipo personalizado</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo comprador *</Label>
                            <Input
                                required
                                value={tipo_comprador}
                                onChange={(e) => setTipoComprador(e.target.value)}
                                placeholder="Ej: DISTRIBUIDOR"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sigla *</Label>
                            <Input
                                required
                                value={sigla}
                                onChange={(e) => setSigla(e.target.value)}
                                placeholder="Ej: DIST"
                                maxLength={10}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={submitting}>
                            {submitting
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                : <Save className="mr-2 h-4 w-4" />}
                            Guardar catálogo
                        </Button>
                    </div>
                </form>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}

            {/* Defaults: CLIENTE y EMPLEADO */}
            {!loading && defaults.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                        Por defecto (no editables)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {defaults.map((item) => (
                            <div
                                key={item.iud}
                                className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium text-sm">{item.tipo_comprador}</p>
                                        <p className="text-xs text-muted-foreground">{item.sigla}</p>
                                    </div>
                                </div>
                                <Badge variant="secondary">Default</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom catalogs */}
            {!loading && custom.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                        Personalizados
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {custom.map((item) => (
                            <div
                                key={item.iud}
                                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                            >
                                <div>
                                    <p className="font-medium text-sm">{item.tipo_comprador}</p>
                                    <p className="text-xs text-muted-foreground">{item.sigla}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditItem(item)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDesactivar(item)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Estado vacío */}
            {!loading && catalogos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-3">
                    <p className="text-sm">No hay catálogos registrados aún.</p>
                    <Button variant="outline" size="sm" onClick={handleInicializar} disabled={seeding}>
                        {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Crear CLIENTE y EMPLEADO automáticamente
                    </Button>
                </div>
            )}

            {/* Edit dialog */}
            <EditDialog
                item={editItem}
                onClose={() => setEditItem(null)}
                onSaved={cargarCatalogos}
            />
        </div>
    );
}
