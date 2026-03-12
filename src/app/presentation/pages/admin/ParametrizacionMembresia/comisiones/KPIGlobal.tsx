import { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { apiFetch } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2, TrendingUp, CheckCircle2, Clock,
    XCircle, DollarSign, AlertCircle, RefreshCcw,
} from 'lucide-react';


interface Dataset { label: string; data: number[] }
interface ChartBlock { labels: string[]; datasets: Dataset[] }

interface KPIGlobalData {
    kpis: {
        totalGlobal: number;
        aprobadas: number;
        pendientes: number;
        rechazadas: number;
        totalIngresos: number;
    };
    charts: {
        porReferidor: ChartBlock;
        porEstado: ChartBlock;
        mensual: ChartBlock;
    };
}

const C_PRIMARY = 'hsl(346.8 77.2% 49.8%)';
const C_SUCCESS = '#10b981';
const C_WARNING = '#f59e0b';
const C_DANGER = '#ef4444';
const C_MUTED = '#94a3b8';
const C_BORDER = 'rgba(148,163,184,0.2)';

const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0,
    }).format(n);

const tooltipBase = {
    backgroundColor: 'var(--background, #fff)',
    borderColor: C_BORDER,
    textStyle: { color: 'var(--foreground, #0f172a)', fontSize: 12 },
    extraCssText: 'box-shadow:0 4px 20px rgba(0,0,0,.08);border-radius:8px;',
};

const barOption = (labels: string[], data: number[]) => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tooltipBase },
    grid: { left: 8, right: 8, top: 8, bottom: 0, containLabel: true },
    xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: C_MUTED, fontSize: 11, interval: 0, rotate: labels.length > 5 ? 30 : 0 },
        axisLine: { lineStyle: { color: C_BORDER } },
        axisTick: { show: false },
    },
    yAxis: {
        type: 'value',
        axisLabel: { color: C_MUTED, fontSize: 11 },
        splitLine: { lineStyle: { color: C_BORDER, type: 'dashed' } },
    },
    series: [{
        type: 'bar',
        data,
        barMaxWidth: 36,
        itemStyle: { color: C_PRIMARY, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { opacity: 0.75 } },
    }],
});

const donutOption = (labels: string[], data: number[]) => {
    const colorMap: Record<string, string> = {
        APROBADA: C_SUCCESS,
        PENDIENTE: C_WARNING,
        RECHAZADA: C_DANGER,
    };
    return {
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
            itemGap: 12,
        },
        series: [{
            type: 'pie',
            radius: ['42%', '68%'],
            center: ['50%', '42%'],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: {
                label: { show: true, fontSize: 14, fontWeight: 'bold', color: 'var(--foreground, #0f172a)' },
            },
            data: labels.map((l, i) => ({
                name: l,
                value: data[i] ?? 0,
                itemStyle: { color: colorMap[l] ?? C_PRIMARY },
            })),
        }],
    };
};

const lineOption = (labels: string[], data: number[]) => {
    const hasSinglePoint = labels.length <= 1;

    return {
        tooltip: { trigger: 'axis', ...tooltipBase },
        grid: { left: 8, right: 8, top: 12, bottom: 0, containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { color: C_MUTED, fontSize: 11 },
            axisLine: { lineStyle: { color: C_BORDER } },
            axisTick: { show: false },
            boundaryGap: hasSinglePoint,
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            axisLabel: { color: C_MUTED, fontSize: 11 },
            splitLine: { lineStyle: { color: C_BORDER, type: 'dashed' } },
        },
        series: [{
            type: hasSinglePoint ? 'bar' : 'line',
            data,
            smooth: !hasSinglePoint,
            symbol: 'circle',
            showSymbol: true,
            symbolSize: 8,
            barMaxWidth: 40,
            lineStyle: { color: C_PRIMARY, width: 2 },
            itemStyle: { color: C_PRIMARY, borderRadius: hasSinglePoint ? [6, 6, 0, 0] : 0 },
            label: hasSinglePoint
                ? { show: true, position: 'top', color: C_MUTED, fontSize: 11 }
                : undefined,
            areaStyle: hasSinglePoint ? undefined : {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: `${C_PRIMARY}33` },
                        { offset: 1, color: `${C_PRIMARY}00` },
                    ],
                },
            },
        }],
    };
};

function KPICard({
    icon, label, value, sub, accent = 'default',
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    accent?: 'default' | 'success' | 'warning' | 'danger';
}) {
    const ring = {
        default: 'bg-primary/10 text-primary',
        success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-100  dark:bg-amber-900/30  text-amber-600  dark:text-amber-400',
        danger: 'bg-red-100    dark:bg-red-900/30    text-red-600    dark:text-red-400',
    }[accent];

    return (
        <div className="flex items-center gap-3.5 p-4 rounded-xl border border-border/50 bg-card hover:border-border/80 transition-colors">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ring}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-none">{label}</p>
                <p className="text-base font-bold text-foreground mt-1 leading-none truncate">{value}</p>
                {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card className="border border-border/50 shadow-sm">
            <CardHeader className="px-5 pt-4 pb-0">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-3">{children}</CardContent>
        </Card>
    );
}

export default function KPIGlobal() {
    const [data, setData] = useState<KPIGlobalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch('/api/membresia/seguridad/listar/membresia/usuario', { method: 'GET' });
            if (res?.success && res?.data) {
                setData(res.data);
            } else {
                setError('No se pudo obtener la información del dashboard.');
            }
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Cargando resumen global...</span>
        </div>
    );

    if (error) return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-destructive text-xs flex-1">{error}</span>
            <Button size="sm" variant="ghost" onClick={fetchData} className="gap-1.5 text-xs shrink-0">
                <RefreshCcw className="w-3.5 h-3.5" /> Reintentar
            </Button>
        </div>
    );

    if (!data) return null;

    const { kpis, charts } = data;
    const pctAprobadas = kpis.totalGlobal > 0
        ? `${((kpis.aprobadas / kpis.totalGlobal) * 100).toFixed(1)}% aprobación`
        : '';

    return (
        <section className="space-y-5">
            {/* Encabezado de sección */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">Resumen global</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Métricas agregadas de todas las membresías del sistema
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

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <KPICard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Total global"
                    value={kpis.totalGlobal}
                    sub={pctAprobadas}
                />
                <KPICard
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    label="Aprobadas"
                    value={kpis.aprobadas}
                    accent="success"
                />
                <KPICard
                    icon={<Clock className="w-4 h-4" />}
                    label="Pendientes"
                    value={kpis.pendientes}
                    accent="warning"
                />
                <KPICard
                    icon={<XCircle className="w-4 h-4" />}
                    label="Rechazadas"
                    value={kpis.rechazadas}
                    accent="danger"
                />
                <KPICard
                    icon={<DollarSign className="w-4 h-4" />}
                    label="Total ingresos"
                    value={fmt(kpis.totalIngresos)}
                    accent="success"
                />
            </div>

            {/* Gráficas — 3 columnas en lg */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <ChartCard title="Membresías por referidor">
                    <ReactECharts
                        option={barOption(
                            charts.porReferidor.labels,
                            charts.porReferidor.datasets[0]?.data ?? [],
                        )}
                        style={{ height: 210 }}
                        notMerge
                        lazyUpdate
                    />
                </ChartCard>

                <ChartCard title="Distribución por estado">
                    <ReactECharts
                        option={donutOption(
                            charts.porEstado.labels,
                            charts.porEstado.datasets[0]?.data ?? [],
                        )}
                        style={{ height: 210 }}
                        notMerge
                        lazyUpdate
                    />
                </ChartCard>

                <ChartCard title="Tendencia mensual">
                    <ReactECharts
                        option={lineOption(
                            charts.mensual.labels,
                            charts.mensual.datasets[0]?.data ?? [],
                        )}
                        style={{ height: 210 }}
                        notMerge
                        lazyUpdate
                    />
                </ChartCard>
            </div>
        </section>
    );
}
