import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2, Users, AlertCircle, RefreshCcw,
    BarChart2, CheckCircle2, XCircle, Mail, Hash,
} from 'lucide-react';

interface UsuarioId {
    _id: string;
    correo: string;
    rol?: { rol: string };
    estado?: boolean;
}

interface MembresiaItem {
    _id: string;
    usuarioId: UsuarioId | null;
    valorMembresia: string;
    referido: string | null;
    referenciaPersonalizada: string;
    estadoMembresia: boolean;
}

interface MembresiasSinReferidoItem {
    membresia: MembresiaItem;
    padreReferidor: string | null;
}

interface RawData {
    totalGlobal: number;
    global: MembresiaItem[];
    gruposPorReferidor: Record<string, unknown>;
    membresiasSinReferido: MembresiasSinReferidoItem[];
    chartData: {
        labels: string[];
        datasets: { label: string; data: number[] }[];
    };
}

const C_PRIMARY = 'hsl(346.8 77.2% 49.8%)';
const C_SUCCESS = '#10b981';
const C_MUTED = '#94a3b8';
const C_BORDER = 'rgba(148,163,184,0.2)';

const tooltipBase = {
    backgroundColor: 'var(--background, #fff)',
    borderColor: C_BORDER,
    textStyle: { color: 'var(--foreground, #0f172a)', fontSize: 12 },
    extraCssText: 'box-shadow:0 4px 20px rgba(0,0,0,.08);border-radius:8px;',
};

const donutEstadoOption = (activas: number, inactivas: number) => ({
    tooltip: {
        trigger: 'item',
        formatter: '{b}: <b>{c}</b> ({d}%)',
        ...tooltipBase,
    },
    legend: {
        bottom: 4,
        left: 'center',
        textStyle: { color: C_MUTED, fontSize: 11 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 16,
    },
    series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
            label: { show: true, fontSize: 13, fontWeight: 'bold', color: 'var(--foreground, #0f172a)' },
        },
        data: [
            { name: 'Activas', value: activas, itemStyle: { color: C_SUCCESS } },
            { name: 'Inactivas', value: inactivas, itemStyle: { color: C_MUTED } },
        ],
    }],
});

const hBarUsuarioOption = (labels: string[], values: number[]) => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tooltipBase },
    grid: { left: 8, right: 32, top: 8, bottom: 8, containLabel: true },
    xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: C_MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: C_BORDER, type: 'dashed' } },
    },
    yAxis: {
        type: 'category',
        data: [...labels].reverse(),
        axisLabel: {
            color: C_MUTED,
            fontSize: 11,
            width: 120,
            overflow: 'truncate',
        },
        axisLine: { lineStyle: { color: C_BORDER } },
        axisTick: { show: false },
    },
    series: [{
        type: 'bar',
        data: [...values].reverse(),
        barMaxWidth: 24,
        itemStyle: { color: C_PRIMARY, borderRadius: [0, 4, 4, 0] },
        emphasis: { itemStyle: { opacity: 0.75 } },
        label: {
            show: true,
            position: 'right',
            color: C_MUTED,
            fontSize: 11,
        },
    }],
});

const abreviarCorreo = (correo: string, maxLen = 28): string =>
    correo.length > maxLen ? `${correo.slice(0, maxLen)}…` : correo;

function EstadoBadge({ activa }: { activa: boolean }) {
    return activa ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 dark:bg-success/30 text-success dark:text-success">
            <CheckCircle2 className="w-2.5 h-2.5" /> Activa
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            <XCircle className="w-2.5 h-2.5" /> Inactiva
        </span>
    );
}

function MembresiaFila({ item }: { item: MembresiasSinReferidoItem }) {
    const { membresia } = item;
    const correo = membresia.usuarioId?.correo ?? '—';
    const rol = membresia.usuarioId?.rol?.rol ?? '';

    return (
        <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate" title={correo}>
                        {abreviarCorreo(correo)}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate" title={membresia.referenciaPersonalizada}>
                        {membresia.referenciaPersonalizada}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
                {rol && (
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        {rol}
                    </span>
                )}
                <EstadoBadge activa={membresia.estadoMembresia} />
            </div>
        </div>
    );
}

interface KPIUsuarioMembresiaProps {
    filtro?: string;
    showTable?: boolean;
    showSearch?: boolean;
    onFiltroChange?: (value: string) => void;
}

export default function KPIUsuarioMembresia({
    filtro = '',
    showTable = true,
    showSearch = false,
    onFiltroChange,
}: KPIUsuarioMembresiaProps) {
    const [data, setData] = useState<RawData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagina, setPagina] = useState(1);
    const POR_PAGINA = 10;

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch('/api/membresia/seguridad/listar/membresia', { method: 'GET' });
            if (res?.success && res?.data) {
                setData(res.data);
            } else {
                setError('No se pudo obtener el detalle de membresías.');
            }
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const metricas = useMemo(() => {
        if (!data) return null;

        const items = data.global ?? [];

        // Activas / Inactivas (estadoMembresia boolean)
        const activas = items.filter(m => m.estadoMembresia).length;
        const inactivas = items.filter(m => !m.estadoMembresia).length;

        // Agrupación por correo de usuario (top 15 para la gráfica)
        const porUsuario = new Map<string, number>();
        items.forEach(m => {
            const correo = m.usuarioId?.correo ?? 'Sin usuario';
            porUsuario.set(correo, (porUsuario.get(correo) ?? 0) + 1);
        });

        const usuariosOrdenados = [...porUsuario.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        const chartLabels = usuariosOrdenados.map(([correo]) => correo);
        const chartValues = usuariosOrdenados.map(([, count]) => count);

        // Usuarios únicos con membresía activa
        const activosUnicos = new Set(
            items.filter(m => m.estadoMembresia && m.usuarioId).map(m => m.usuarioId!._id)
        ).size;

        return { activas, inactivas, chartLabels, chartValues, activosUnicos, total: items.length };
    }, [data]);

    const itemsFiltrados = useMemo(() => {
        if (!data) return [];
        const lista = data.membresiasSinReferido ?? [];
        if (!filtro.trim()) return lista;
        const q = filtro.toLowerCase();
        return lista.filter(item => {
            const correo = item.membresia.usuarioId?.correo ?? '';
            const ref = item.membresia.referenciaPersonalizada ?? '';
            return correo.toLowerCase().includes(q) || ref.toLowerCase().includes(q);
        });
    }, [data, filtro]);

    const totalPaginas = Math.max(1, Math.ceil(itemsFiltrados.length / POR_PAGINA));
    const paginaActual = Math.min(pagina, totalPaginas);
    const itemsPagina = itemsFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

    useEffect(() => {
        setPagina(1);
    }, [filtro]);

    if (loading) return (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Cargando detalle de membresías...</span>
        </div>
    );

    if (error) return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-destructive text-xs flex-1">{error}</span>
            <Button size="sm" variant="ghost" onClick={fetchData} className="gap-1.5 text-xs shrink-0">
                <RefreshCcw className="w-3.5 h-3.5" /> Reintentar
            </Button>
        </div>
    );

    if (!data || !metricas) return null;

    const barHeight = Math.max(200, metricas.chartLabels.length * 32);

    return (
        <section className="space-y-5">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">Detalle de membresías</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {metricas.total} membresía{metricas.total !== 1 ? 's' : ''} en total ·{' '}
                        {metricas.activosUnicos} usuario{metricas.activosUnicos !== 1 ? 's' : ''} con membresía activa
                    </p>
                </div>
                <Button
                    size="sm" variant="ghost"
                    onClick={fetchData}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <RefreshCcw className="w-3.5 h-3.5" /> Actualizar
                </Button>
            </div>

            {/* Fila de gráficas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Donut: activas vs inactivas */}
                <Card className="border border-border/50 shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-0">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                                Estado de membresías
                            </CardTitle>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-success inline-block" />
                                    {metricas.activas} activas
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                                    {metricas.inactivas} inactivas
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-3">
                        <ReactECharts
                            option={donutEstadoOption(metricas.activas, metricas.inactivas)}
                            style={{ height: 210 }}
                            notMerge
                            lazyUpdate
                        />
                    </CardContent>
                </Card>

                {/* Barras horizontales: membresías por usuario */}
                <Card className="border border-border/50 shadow-sm">
                    <CardHeader className="px-5 pt-4 pb-0">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                                Membresías por usuario
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-3">
                        {metricas.chartLabels.length > 0 ? (
                            <ReactECharts
                                option={hBarUsuarioOption(metricas.chartLabels, metricas.chartValues)}
                                style={{ height: Math.min(barHeight, 210) }}
                                notMerge
                                lazyUpdate
                            />
                        ) : (
                            <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
                                Sin datos para graficar.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabla de membresías */}
            {showTable && (
                <Card className="border border-border/50 shadow-sm">
                {/* Encabezado de tabla */}
                <div className="px-5 pt-4 pb-3 border-b border-border/40 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 shrink-0">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                            Registro de membresías
                        </span>
                    </div>
                    {showSearch && (
                        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/90 px-3 py-2 shadow-sm w-full sm:w-auto sm:min-w-[320px]">
                            <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <input
                                type="text"
                                value={filtro}
                                onChange={(e) => onFiltroChange?.(e.target.value)}
                                placeholder="Buscar por correo o referencia..."
                                className="
                                    h-7 w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground
                                    focus:outline-none
                                "
                            />
                        </div>
                    )}
                </div>

                {/* Tabla */}
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/20">
                                    <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-[35%]">
                                        Correo electrónico
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-[35%]">
                                        Referencia
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-[15%]">
                                        Rol
                                    </th>
                                    <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-[15%]">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {itemsPagina.length > 0 ? (
                                    itemsPagina.map((item, i) => {
                                        const m = item.membresia;
                                        const correo = m.usuarioId?.correo ?? '—';
                                        const rol = m.usuarioId?.rol?.rol ?? '—';
                                        return (
                                            <tr key={m._id ?? i} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                                                            <Mail className="w-2.5 h-2.5 text-muted-foreground" />
                                                        </div>
                                                        <span className="truncate text-foreground font-medium" title={correo}>
                                                            {correo}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-muted-foreground text-[11px] truncate block" title={m.referenciaPersonalizada}>
                                                        {m.referenciaPersonalizada}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                                                        {rol}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <EstadoBadge activa={m.estadoMembresia} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-14 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users className="w-7 h-7 text-muted-foreground/30" />
                                                <span className="text-xs text-muted-foreground">
                                                    {filtro ? 'Sin resultados para esa búsqueda.' : 'No hay membresías registradas.'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {totalPaginas > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border/40">
                            <span className="text-[11px] text-muted-foreground">
                                Página {paginaActual} de {totalPaginas} · {itemsFiltrados.length} registros
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    size="sm" variant="ghost"
                                    onClick={() => setPagina(1)}
                                    disabled={paginaActual === 1}
                                    className="h-7 w-7 p-0 text-xs"
                                >
                                    «
                                </Button>
                                <Button
                                    size="sm" variant="ghost"
                                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                                    disabled={paginaActual === 1}
                                    className="h-7 px-2.5 text-xs"
                                >
                                    Anterior
                                </Button>

                                {/* Números de página — muestra ventana de 5 */}
                                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                                    .filter(n => {
                                        if (totalPaginas <= 5) return true;
                                        if (n === 1 || n === totalPaginas) return true;
                                        return Math.abs(n - paginaActual) <= 1;
                                    })
                                    .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                                        if (idx > 0 && typeof arr[idx - 1] === 'number' && (n as number) - (arr[idx - 1] as number) > 1) {
                                            acc.push('…');
                                        }
                                        acc.push(n);
                                        return acc;
                                    }, [])
                                    .map((n, i) =>
                                        n === '…' ? (
                                            <span key={`ellipsis-${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-muted-foreground">
                                                …
                                            </span>
                                        ) : (
                                            <Button
                                                key={n}
                                                size="sm" variant={paginaActual === n ? 'default' : 'ghost'}
                                                onClick={() => setPagina(n as number)}
                                                className="h-7 w-7 p-0 text-xs"
                                            >
                                                {n}
                                            </Button>
                                        )
                                    )
                                }

                                <Button
                                    size="sm" variant="ghost"
                                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                    disabled={paginaActual === totalPaginas}
                                    className="h-7 px-2.5 text-xs"
                                >
                                    Siguiente
                                </Button>
                                <Button
                                    size="sm" variant="ghost"
                                    onClick={() => setPagina(totalPaginas)}
                                    disabled={paginaActual === totalPaginas}
                                    className="h-7 w-7 p-0 text-xs"
                                >
                                    »
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                </Card>
            )}
        </section>
    );
}
