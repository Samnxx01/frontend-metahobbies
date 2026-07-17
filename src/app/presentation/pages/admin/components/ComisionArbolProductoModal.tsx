import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import dashboardVentaService, {
    VENTA_REFERIDO_ARBOL,
    type PipelineBLevel,
} from '@/app/services/dashboardVentaService';
import { GitBranch, Loader2, Network, Plus, Save, Trash2, UserRound, Users } from 'lucide-react';

type EditableLevel = {
    key: string;
    gen: string;
    percent: string;
};

export type ComisionArbolProductoModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: () => void;
};

const makeLevel = (level?: Partial<PipelineBLevel>): EditableLevel => ({
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    gen: String(level?.gen ?? ''),
    percent: String(level?.percent ?? ''),
});

const normalizeLevels = (levels: EditableLevel[]): PipelineBLevel[] =>
    levels
        .map((level) => ({
            gen: Number(level.gen),
            percent: Number(level.percent),
        }))
        .filter((level) => Number.isFinite(level.gen) && level.gen > 0 && Number.isFinite(level.percent))
        .sort((a, b) => a.gen - b.gen);

const GEN_STYLES: Record<number, string> = {
    1: 'border-success/20 bg-success/10 text-success',
    2: 'border-info/20 bg-info/10 text-info',
    3: 'border-info/20 bg-info/10 text-info',
    4: 'border-warning/20 bg-warning/10 text-warning',
};

const GEN_LABEL: Record<number, string> = {
    1: 'Sponsor directo (Gen1)',
    2: 'Sponsor nivel 2 (Gen2)',
    3: 'Sponsor nivel 3 (Gen3)',
    4: 'Sponsor nivel 4 (Gen4)',
};

export default function ComisionArbolProductoModal({
    open,
    onOpenChange,
    onSaved,
}: ComisionArbolProductoModalProps): React.ReactElement {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
    const [configCargada, setConfigCargada] = useState(false);
    const [levels, setLevels] = useState<EditableLevel[]>([
        makeLevel({ gen: 1, percent: 10 }),
        makeLevel({ gen: 2, percent: 5 }),
    ]);

    const loadData = async (): Promise<void> => {
        setLoading(true);
        try {
            const config = await dashboardVentaService.obtenerConfiguracionArbolReferido();
            if (!config) {
                setEditingConfigId(null);
                setConfigCargada(false);
                setLevels([
                    makeLevel({ gen: 1, percent: 10 }),
                    makeLevel({ gen: 2, percent: 5 }),
                ]);
                return;
            }

            setEditingConfigId(String(config._id || config.iud || ''));
            setConfigCargada(true);
            setLevels(
                config.levels.length
                    ? config.levels.map((level) => makeLevel(level))
                    : [makeLevel({ gen: 1, percent: 10 })]
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'No se pudo cargar la configuración del árbol.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        void loadData();
    }, [open]);

    const treePreview = useMemo(() => {
        const normalized = normalizeLevels(levels);
        return [...normalized].sort((a, b) => b.gen - a.gen);
    }, [levels]);

    const addLevel = (): void => {
        setLevels((prev) => {
            const nextGen = prev.length
                ? Math.max(...prev.map((level) => Number(level.gen) || 0)) + 1
                : 1;
            return [...prev, makeLevel({ gen: nextGen, percent: 0 })];
        });
    };

    const removeLevel = (key: string): void => {
        setLevels((prev) => prev.filter((level) => level.key !== key));
    };

    const updateLevel = (key: string, field: 'gen' | 'percent', value: string): void => {
        setLevels((prev) => prev.map((level) => (
            level.key === key ? { ...level, [field]: value } : level
        )));
    };

    const handleGuardar = async (): Promise<void> => {
        const normalizedLevels = normalizeLevels(levels);
        if (!normalizedLevels.length) {
            toast.error('Configura al menos un nivel válido del árbol.');
            return;
        }

        setSaving(true);
        try {
            await dashboardVentaService.guardarNivelesOrigen({
                originType: VENTA_REFERIDO_ARBOL.originType,
                originId: VENTA_REFERIDO_ARBOL.originId,
                levels: normalizedLevels,
                estado: true,
            });
            toast.success(
                configCargada
                    ? 'Porcentajes del árbol de referidos actualizados.'
                    : 'Porcentajes del árbol de referidos creados.',
            );

            await loadData();
            setConfigCargada(true);
            onSaved?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'No se pudo guardar la configuración.';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] w-[min(920px,calc(100vw-2rem))] max-w-none overflow-y-auto border-info/20 bg-gradient-to-b from-info/80 via-white to-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <Network className="h-5 w-5 text-info" />
                        Parametrizar comisiones por árbol de referidos
                    </DialogTitle>
                    <DialogDescription className="text-slate-600">
                        Define el % por generación del sponsor en refeClient. Aplica a cualquier venta de producto
                        cuando la transacción trae referidoId y el disparador valida el sponsor.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-info/20 bg-info/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-info">
                                    <Users className="h-4 w-4" />
                                    Árbol por referido / sponsor
                                </div>
                                <Badge variant={configCargada ? 'default' : 'outline'}>
                                    {loading
                                        ? 'Cargando GET...'
                                        : configCargada
                                          ? 'Configuración cargada'
                                          : 'Sin configuración guardada'}
                                </Badge>
                            </div>
                            <p className="mt-1 text-xs text-info/80">
                                No se configura por producto. El motor sube refeClient desde el comprador:
                                Gen1 = sponsor directo, Gen2 = sponsor del sponsor, etc.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                            <p>
                                <span className="font-semibold text-slate-800">Disparo:</span> motorProductos →
                                APPROVED + tercero + invoice FAC-* + referidoId → sponsor en refeClient → comisión por árbol.
                            </p>
                            <p className="mt-2 border-t border-slate-200 pt-2">
                                <span className="font-semibold text-slate-800">Cálculo en dos pasos:</span>{' '}
                                primero la regla del producto sobre el monto cobrado (ej. $2.000 × 75% = $1.500 base);
                                luego cada % del árbol se aplica sobre esa base (ej. Gen1 20% → $300).
                            </p>
                        </div>

                        <div className="space-y-3">
                            {levels.map((level, index) => (
                                <div
                                    key={level.key}
                                    className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[0.7fr_1fr_auto]"
                                >
                                    <div className="space-y-2">
                                        <Label>Gen</Label>
                                        <Input
                                            value={level.gen}
                                            onChange={(e) => updateLevel(level.key, 'gen', e.target.value)}
                                            placeholder={`Gen ${index + 1}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Porcentaje (%)</Label>
                                        <Input
                                            value={level.percent}
                                            onChange={(e) => updateLevel(level.key, 'percent', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-500"
                                            onClick={() => removeLevel(level.key)}
                                            disabled={levels.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button variant="outline" size="sm" className="gap-2" onClick={addLevel} disabled={loading}>
                            <Plus className="h-4 w-4" />
                            Agregar generación
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Vista del árbol (refeClient)
                            </p>

                            {loading ? (
                                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Cargando configuración...
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {treePreview.map((level) => (
                                        <div key={`preview-${level.gen}`} className="flex flex-col items-center">
                                            <div
                                                className={`w-full rounded-2xl border px-4 py-3 ${GEN_STYLES[level.gen] || 'border-slate-200 bg-white text-slate-900'}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {GEN_LABEL[level.gen] || `Sponsor Gen${level.gen}`}
                                                        </p>
                                                        <p className="text-xs opacity-80">usuarioId en refeClient</p>
                                                    </div>
                                                    <Badge variant="secondary">{level.percent}%</Badge>
                                                </div>
                                            </div>
                                            <div className="my-1 h-5 w-px bg-info/30" />
                                        </div>
                                    ))}

                                    <div className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <UserRound className="h-4 w-4 text-info" />
                                            Comprador (referidoId)
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Base del árbol. La relación sponsor→comprador se materializa al aprobar el pago.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-dashed border-info/20 bg-info/50 px-4 py-3 text-xs text-info">
                                        <div className="flex items-center gap-2 font-medium">
                                            <GitBranch className="h-3.5 w-3.5" />
                                            Alcance global de ventas referidas
                                        </div>
                                        <p className="mt-1 text-info/80">
                                            originType={VENTA_REFERIDO_ARBOL.originType} · cualquier producto con sponsor válido
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-xs text-warning">
                            El disparo exige: pago APPROVED, comprador con tercero + invoice CONFIRMADA (FAC-*),
                            referidoId en auditoría y sponsor válido en refeClient.
                        </div>
                    </div>
                </div>

                <Separator />

                <DialogFooter className="gap-2 sm:justify-between">
                    <p className="text-xs text-slate-500">
                        {editingConfigId
                            ? 'Actualizando configuración global del árbol de referidos.'
                            : 'Se creará la configuración global venta-referido.'}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button className="gap-2" onClick={() => void handleGuardar()} disabled={saving || loading}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar árbol
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
