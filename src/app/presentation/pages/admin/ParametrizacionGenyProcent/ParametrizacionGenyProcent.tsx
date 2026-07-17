import { useState, useEffect, useCallback } from 'react';
import { adminEntityId, adminEntityIdForPath } from '@/app/utils/adminEntityId';
import { toast } from 'react-toastify';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, Plus, RefreshCw, AlertCircle, Pencil, Trash2, GitBranch, Percent,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NivelGeneracion {
    iud: string;
    _id?: string;
    id?: string;
    NombreLevel: string;
    GeneracionLevel: number;
    porcentaje: number; // stored as decimal: 0.25 = 25%
}

const normalizeNivelGeneracion = (row: NivelGeneracion): NivelGeneracion => {
    const id = adminEntityId(row);
    return id ? { ...row, iud: id } : row;
};

interface EditarForm {
    NombreLevel: string;
    porcentaje: string; // input as human-readable %, e.g. "25"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_EDITAR: EditarForm = { NombreLevel: '', porcentaje: '' };

const GEN_BADGE: Record<number, string> = {
    0: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    1: 'bg-success/10 text-success dark:bg-success/40 dark:text-success',
    2: 'bg-info/10 text-info dark:bg-info/40 dark:text-info',
    3: 'bg-info/10 text-info dark:bg-info/40 dark:text-info',
    4: 'bg-warning/10 text-warning dark:bg-warning/40 dark:text-warning',
};

const GEN_DOT: Record<number, string> = {
    0: 'bg-slate-400',
    1: 'bg-success',
    2: 'bg-info',
    3: 'bg-info',
    4: 'bg-warning',
};

const GEN_ROL: Record<number, string> = {
    0: 'Raíz · sin comisión',
    1: 'Referidor directo',
    2: 'Nivel 2',
    3: 'Nivel 3',
    4: 'Nivel 4 · máximo',
};

const fmtPct = (p: number) => {
    const v = p * 100;
    return `${v % 1 === 0 ? v : v.toFixed(1)}%`;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    /** 'SUPER_ADMIN' → crear + editar + eliminar. 'TENANT_GLOBAL' → solo editar. */
    scope?: 'SUPER_ADMIN' | 'TENANT_GLOBAL';
}

export default function ParametrizacionGenyProcent({ scope = 'SUPER_ADMIN' }: Props) {
    const esSoloLectura = scope === 'TENANT_GLOBAL';
    const [niveles, setNiveles] = useState<NivelGeneracion[]>([]);
    const [loading, setLoading] = useState(false);
    const [creando, setCreando] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Edit modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [formEditar, setFormEditar] = useState<EditarForm>(INITIAL_EDITAR);
    const [loadingEditar, setLoadingEditar] = useState(false);

    // Delete
    const [eliminandoId, setEliminandoId] = useState<string | null>(null);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const mostrarError = (texto: string) => {
        setErrorMsg(texto);
        setTimeout(() => setErrorMsg(null), 5000);
    };

    // ── Data ──────────────────────────────────────────────────────────────────

    const cargarNiveles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/referido/listar/comisiones', { method: 'GET' });
            const lista: NivelGeneracion[] = Array.isArray(res?.data)
                ? res.data.map(normalizeNivelGeneracion)
                : [];
            setNiveles(lista.sort((a, b) => a.GeneracionLevel - b.GeneracionLevel));
        } catch (err: any) {
            mostrarError(err.message || 'Error al cargar niveles.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarNiveles();
    }, [cargarNiveles]);

    // ── CRUD ──────────────────────────────────────────────────────────────────

    const handleCrear = async () => {
        setCreando(true);
        try {
            await apiFetch('/api/referido/comisiones', {
                method: 'POST',
                body: { NombreLevel: `Gen${niveles.length}` },
            });
            toast.success(`Nivel Gen${niveles.length} creado correctamente.`);
            await cargarNiveles();
        } catch (err: any) {
            mostrarError(err.message || 'Error al crear nivel.');
        } finally {
            setCreando(false);
        }
    };

    const abrirEditar = (n: NivelGeneracion) => {
        setEditandoId(adminEntityId(n));
        const pctVal = n.porcentaje * 100;
        setFormEditar({
            NombreLevel: n.NombreLevel,
            porcentaje: `${pctVal % 1 === 0 ? pctVal : pctVal.toFixed(2)}`,
        });
        setModalAbierto(true);
    };

    const handleGuardarEdicion = async () => {
        if (!editandoId) return;
        if (!formEditar.NombreLevel.trim()) {
            mostrarError('El nombre del nivel es obligatorio.');
            return;
        }
        const pct = parseFloat(formEditar.porcentaje);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            mostrarError('El porcentaje debe estar entre 0 y 100.');
            return;
        }
        setLoadingEditar(true);
        try {
            await apiFetch(`/api/referido/comisiones/${adminEntityIdForPath(editandoId)}`, {
                method: 'PUT',
                body: {
                    NombreLevel: formEditar.NombreLevel.trim(),
                    porcentaje: pct / 100, // back to decimal for backend
                },
            });
            toast.success('Nivel actualizado correctamente.');
            setModalAbierto(false);
            await cargarNiveles();
        } catch (err: any) {
            mostrarError(err.message || 'Error al actualizar nivel.');
        } finally {
            setLoadingEditar(false);
        }
    };

    const handleEliminar = async (id: string, nombre: string) => {
        if (!window.confirm(`¿Eliminar el nivel ${nombre}? Esta acción no se puede deshacer.`)) return;
        setEliminandoId(id);
        try {
            await apiFetch(`/api/referido/comisiones/${adminEntityIdForPath(id)}`, { method: 'DELETE' });
            toast.success(`Nivel ${nombre} eliminado.`);
            await cargarNiveles();
        } catch (err: any) {
            mostrarError(err.message || 'Error al eliminar nivel.');
        } finally {
            setEliminandoId(null);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────

    const maxAlcanzado = false; // sin límite en frontend — el backend decide
    const ultimoGen = niveles.length > 0
        ? Math.max(...niveles.map(n => n.GeneracionLevel))
        : -1;
    const siguienteGen = ultimoGen + 1;
    const nivelesConComision = niveles.filter(n => n.GeneracionLevel > 0);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <Card className="border border-border/50 shadow-sm">

                {/* Header */}
                <CardHeader className="pb-4 px-6 pt-5 border-b border-border/40">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <GitBranch className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold text-foreground">
                                    Parametrización de Generaciones y Porcentajes
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Define los niveles del sistema multinivel y sus porcentajes de comisión.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={cargarNiveles}
                            disabled={loading}
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Recargar"
                        >
                            {loading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <RefreshCw className="w-4 h-4" />
                            }
                        </button>
                    </div>
                </CardHeader>

                <CardContent className="px-6 py-5 space-y-5">

                    {/* Error */}
                    {errorMsg && (
                        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-xs border bg-destructive/10 dark:bg-destructive/30 text-destructive dark:text-destructive border-destructive/20 dark:border-destructive">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Contador + Botón crear */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                                Niveles configurados:
                                <span className="font-semibold text-foreground ml-1">
                                    {niveles.length}
                                </span>
                            </p>
                        </div>
                        {esSoloLectura ? (
                            <Badge variant="secondary" className="text-xs">
                                Solo lectura · contacta al SuperAdmin para crear o eliminar niveles
                            </Badge>
                        ) : (
                            <Button
                                size="sm"
                                onClick={handleCrear}
                                disabled={creando || maxAlcanzado}
                                className="gap-2 h-8 text-xs"
                            >
                                {creando
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Plus className="w-3.5 h-3.5" />
                                }
                                {maxAlcanzado ? 'Máximo alcanzado' : `Crear Gen${siguienteGen}`}
                            </Button>
                        )}
                    </div>

                    <Separator />

                    {/* Tabla */}
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/30">
                                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                        Generación
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                        Nombre
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                        % Comisión
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                                        Rol en red
                                    </th>
                                    <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            {Array.from({ length: 5 }).map((_, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 rounded bg-muted/50" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : niveles.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <GitBranch className="w-7 h-7 text-muted-foreground/30" />
                                                <span className="text-xs text-muted-foreground">
                                                    No hay niveles configurados. Crea el primero (Gen0).
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    niveles.map(n => {
                                        const badgeClass = GEN_BADGE[n.GeneracionLevel] ?? GEN_BADGE[4];
                                        const isEliminando = eliminandoId === n.iud;
                                        return (
                                            <tr key={n.iud} className="hover:bg-muted/20 transition-colors">

                                                {/* Gen badge */}
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeClass}`}>
                                                        {n.NombreLevel}
                                                    </span>
                                                </td>

                                                {/* Nombre */}
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {n.NombreLevel}
                                                </td>

                                                {/* Porcentaje */}
                                                <td className="px-4 py-3">
                                                    {n.GeneracionLevel === 0 ? (
                                                        <span className="text-muted-foreground italic">—</span>
                                                    ) : (
                                                        <span className="font-mono font-semibold text-foreground">
                                                            {fmtPct(n.porcentaje)}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Rol */}
                                                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                                    {GEN_ROL[n.GeneracionLevel] ?? `Nivel ${n.GeneracionLevel}`}
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => abrirEditar(n)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                            Editar
                                                        </button>
                                                        {!esSoloLectura && (
                                                            <button
                                                                onClick={() => handleEliminar(n.iud, n.NombreLevel)}
                                                                disabled={isEliminando}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/30 transition-colors disabled:opacity-50"
                                                                title="Eliminar"
                                                            >
                                                                {isEliminando
                                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                    : <Trash2 className="w-3 h-3" />
                                                                }
                                                                Eliminar
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Resumen de distribución */}
                    {nivelesConComision.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2.5">
                                <p className="text-xs font-semibold text-foreground">
                                    Distribución al registrarse un nuevo referido
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    El sistema recorre el árbol hacia arriba asignando comisiones por generación.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {nivelesConComision.map(n => (
                                        <div
                                            key={n.iud}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-muted/20"
                                        >
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${GEN_DOT[n.GeneracionLevel] ?? 'bg-muted-foreground'}`} />
                                            <span className="text-[11px] font-medium text-foreground">
                                                {n.NombreLevel}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">→</span>
                                            <span className="text-[11px] font-mono font-bold text-foreground">
                                                {fmtPct(n.porcentaje)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal editar */}
            <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-sm">
                            <Pencil className="w-4 h-4 text-primary" />
                            Editar nivel de generación
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">

                        {errorMsg && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs border bg-destructive/10 dark:bg-destructive/30 text-destructive dark:text-destructive border-destructive/20 dark:border-destructive">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Nombre */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                                Nombre del nivel
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                placeholder="Gen1"
                                value={formEditar.NombreLevel}
                                onChange={e => setFormEditar(p => ({ ...p, NombreLevel: e.target.value }))}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Porcentaje */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                                Porcentaje de comisión
                                <Badge variant="outline" className="text-[10px] py-0 font-normal ml-1">%</Badge>
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    min={0} max={100} step={0.01}
                                    placeholder="25"
                                    value={formEditar.porcentaje}
                                    onChange={e => setFormEditar(p => ({ ...p, porcentaje: e.target.value }))}
                                    className="h-9 text-sm pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">
                                    %
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Ingresa el valor como porcentaje. Ejemplo: <span className="font-mono font-medium">25</span> para 25%.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => setModalAbierto(false)}
                            disabled={loadingEditar}
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleGuardarEdicion}
                            disabled={loadingEditar}
                            className="gap-2"
                        >
                            {loadingEditar
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RefreshCw className="w-3.5 h-3.5" />
                            }
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
