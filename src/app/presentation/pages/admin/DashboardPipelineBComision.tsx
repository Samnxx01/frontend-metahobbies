import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowRight,
    CircleDollarSign,
    Clock3,
    GitBranch,
    Loader2,
    RefreshCw,
    TrendingUp,
    Users,
} from 'lucide-react';
import pipelineBComisionService, {
    type PipelineBComisionDashboard,
    type PipelineBComisionQuery,
} from '@/app/services/pipelineBComisionService';

const formatMoney = (value: number, currency = 'COP'): string =>
    (Number(value || 0) / 100).toLocaleString('es-CO', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    });

const formatDate = (value: string | null): string => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
};

const estadoBadge = (estado: string): React.ReactNode => {
    const normalized = String(estado || '').toLowerCase();
    if (normalized === 'procesada') {
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Procesada</Badge>;
    }
    if (normalized === 'pendiente') {
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendiente</Badge>;
    }
    return <Badge variant="outline">{estado || '—'}</Badge>;
};

export default function DashboardPipelineBComision(): React.ReactElement {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<PipelineBComisionDashboard | null>(null);
    const [estado, setEstado] = useState<PipelineBComisionQuery['estado']>('all');
    const [page, setPage] = useState(1);

    const loadDashboard = useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            const data = await pipelineBComisionService.obtenerDashboard({
                page,
                limit: 15,
                estado,
            });
            setDashboard(data);
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo cargar el dashboard de comisiones Pipeline B.');
            setDashboard(null);
        } finally {
            setLoading(false);
        }
    }, [estado, page]);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        setPage(1);
    }, [estado]);

    const kpi = dashboard?.kpi;
    const funnel = dashboard?.funnel;
    const registros = dashboard?.registros ?? [];
    const paginacion = dashboard?.paginacion;
    const flujo = dashboard?.flujo ?? [];

    const maxFlujoCount = useMemo(
        () => Math.max(...flujo.map((paso) => paso.count), 1),
        [flujo],
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-700">
                        <GitBranch className="h-3.5 w-3.5" />
                        Flujo GET
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">Comisiones Pipeline B</h2>
                    <p className="max-w-3xl text-sm text-slate-600">
                        Seguimiento del flujo enlace ventas → atribución → checkout → pago APPROVED → ventasComission.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select value={estado} onValueChange={(value) => setEstado(value as PipelineBComisionQuery['estado'])}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <SelectValue placeholder="Estado comisión" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="procesada">Procesadas</SelectItem>
                            <SelectItem value="pendiente">Pendientes</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" className="gap-2" onClick={() => void loadDashboard()} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Actualizar
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Comisiones registradas</CardDescription>
                        <CardTitle className="text-2xl">{kpi?.comisionesRegistradas ?? '—'}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Procesadas</CardDescription>
                        <CardTitle className="flex items-center justify-between text-2xl text-emerald-800">
                            {kpi?.comisionesProcesadas ?? '—'}
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Pendientes</CardDescription>
                        <CardTitle className="flex items-center justify-between text-2xl text-amber-800">
                            {kpi?.comisionesPendientes ?? '—'}
                            <Clock3 className="h-5 w-5 text-amber-500" />
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-sky-200 bg-sky-50/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Base comisionable</CardDescription>
                        <CardTitle className="text-xl text-sky-900">
                            {kpi ? formatMoney(kpi.montoBaseTotal) : '—'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-violet-200 bg-violet-50/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Monto comisiones</CardDescription>
                        <CardTitle className="flex items-center justify-between text-xl text-violet-900">
                            {kpi ? formatMoney(kpi.montoComisionTotal) : '—'}
                            <CircleDollarSign className="h-5 w-5 text-violet-500" />
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Embudo del flujo</CardTitle>
                        <CardDescription>
                            Conteos acumulados desde atribución hasta comisión materializada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading && !dashboard ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando embudo...
                            </div>
                        ) : (
                            flujo.map((paso, index) => (
                                <div key={paso.clave} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                                {paso.paso}
                                            </span>
                                            <div>
                                                <p className="font-medium text-slate-900">{paso.label}</p>
                                                <p className="text-xs text-slate-500">{paso.descripcion}</p>
                                            </div>
                                        </div>
                                        <span className="font-semibold text-slate-900">{paso.count}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
                                            style={{ width: `${Math.max((paso.count / maxFlujoCount) * 100, paso.count > 0 ? 8 : 0)}%` }}
                                        />
                                    </div>
                                    {index < flujo.length - 1 ? (
                                        <div className="flex justify-center py-1 text-slate-300">
                                            <ArrowRight className="h-4 w-4 rotate-90" />
                                        </div>
                                    ) : null}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Atribuciones Pipeline B</CardTitle>
                        <CardDescription>Sesiones con metadata.flow=pipeline_b y originType=producto.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">{funnel?.atribuciones.total ?? 0}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Resueltas</p>
                            <p className="mt-2 text-2xl font-semibold text-emerald-900">{funnel?.atribuciones.resolved ?? 0}</p>
                        </div>
                        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-sky-700">Activas</p>
                            <p className="mt-2 text-2xl font-semibold text-sky-900">{funnel?.atribuciones.active ?? 0}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-amber-700">Expiradas</p>
                            <p className="mt-2 text-2xl font-semibold text-amber-900">{funnel?.atribuciones.expired ?? 0}</p>
                        </div>
                        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 sm:col-span-2">
                            <div className="flex items-center gap-2 text-violet-800">
                                <Users className="h-4 w-4" />
                                <p className="text-sm font-medium">Ventas confirmadas vs comisiones</p>
                            </div>
                            <p className="mt-2 text-sm text-violet-950">
                                {funnel?.ventasConfirmadas ?? 0} ventas confirmadas · {funnel?.comisionesMaterializadas ?? 0} comisiones materializadas
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Registros ventasComission</CardTitle>
                    <CardDescription>
                        Detalle GET del flujo de comisión del generador enlace ventas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading && registros.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando registros...
                        </div>
                    ) : registros.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            Aún no hay comisiones registradas para Pipeline B.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Sponsor</TableHead>
                                        <TableHead>Comprador</TableHead>
                                        <TableHead>Base</TableHead>
                                        <TableHead>Comisión</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registros.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">{row.referenciaPersonalizada || '—'}</TableCell>
                                            <TableCell>{estadoBadge(row.estado)}</TableCell>
                                            <TableCell className="max-w-[180px] truncate">{row.sponsor?.correo || '—'}</TableCell>
                                            <TableCell className="max-w-[180px] truncate">
                                                <div className="flex flex-col gap-1">
                                                    <span>{row.comprador?.correo || '—'}</span>
                                                    {row.comprador && !row.comprador.cuentaActiva ? (
                                                        <Badge variant="outline" className="w-fit text-[10px]">
                                                            Cuenta pendiente activación
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatMoney(row.montoBase)}</TableCell>
                                            <TableCell>{formatMoney(row.montoComisionTotal)}</TableCell>
                                            <TableCell>{formatDate(row.fecha)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {paginacion && paginacion.totalPages > 1 ? (
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-500">
                                Página {paginacion.page} de {paginacion.totalPages} · {paginacion.total} registros
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={loading || paginacion.page <= 1}
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={loading || paginacion.page >= paginacion.totalPages}
                                    onClick={() => setPage((prev) => prev + 1)}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
