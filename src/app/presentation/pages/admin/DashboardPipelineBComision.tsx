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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    ArrowRight,
    Ban,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    GitBranch,
    Loader2,
    Package,
    RefreshCw,
    RotateCcw,
    TrendingUp,
    Users,
} from 'lucide-react';
import pipelineBComisionService, {
    type PipelineBComisionDashboard,
    type PipelineBComisionQuery,
    type PipelineBProductoAgregado,
} from '@/app/services/pipelineBComisionService';

const formatMoney = (value: number, currency = 'COP'): string =>
    (Number(value || 0) / 100).toLocaleString('es-CO', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    });

/** Montos de carrito / producto en pesos COP (no centavos Wompi). */
const formatPesos = (value: number, currency = 'COP'): string =>
    Number(value || 0).toLocaleString('es-CO', {
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

const reglaBadge = (producto: PipelineBProductoAgregado | null | undefined): React.ReactNode => {
    if (!producto?.reglaCodigo) {
        return <Badge variant="outline">Sin regla</Badge>;
    }
    return (
        <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">
            {producto.reglaCodigo}
            {producto.reglaValor != null ? ` · ${producto.reglaValor}%` : ''}
        </Badge>
    );
};

const TablaProductosAgregados = ({
    filas,
    conRegla,
}: {
    filas: PipelineBProductoAgregado[];
    conRegla: boolean;
}): React.ReactElement => {
    if (!filas.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                {conRegla
                    ? 'No hay productos con regla de comisión en ventas confirmadas del flujo.'
                    : 'No hay productos sin regla en ventas confirmadas del flujo.'}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>SKU</TableHead>
                        {conRegla ? <TableHead>Regla</TableHead> : <TableHead>Motivo</TableHead>}
                        <TableHead className="text-right">Unidades</TableHead>
                        <TableHead className="text-right">Cobrado</TableHead>
                        {conRegla ? (
                            <>
                                <TableHead className="text-right">Base comisión</TableHead>
                                <TableHead className="text-right">Comisión a pagar</TableHead>
                                <TableHead className="text-right">Materializada</TableHead>
                            </>
                        ) : null}
                        <TableHead className="text-right">Ventas</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filas.filter(Boolean).map((row, index) => (
                        <TableRow key={row?.productoId || `producto-${index}`}>
                            <TableCell>
                                <div className="font-medium text-slate-900">{row?.nombre || '—'}</div>
                                <div className="text-xs text-slate-500">{row?.tipo || '—'}</div>
                            </TableCell>
                            <TableCell className="text-slate-600">{row?.sku || '—'}</TableCell>
                            <TableCell>
                                {conRegla ? (
                                    reglaBadge(row)
                                ) : (
                                    <span className="text-xs text-slate-600">{row?.motivoSinRegla || 'Sin regla aplicable'}</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">{row?.cantidadUnidades ?? 0}</TableCell>
                            <TableCell className="text-right font-medium">{formatPesos(row?.montoCobradoTotal ?? 0)}</TableCell>
                            {conRegla ? (
                                <>
                                    <TableCell className="text-right">{formatPesos(row?.baseComisionableTotal ?? 0)}</TableCell>
                                    <TableCell className="text-right font-semibold text-violet-800">
                                        {formatPesos(row?.comisionPotencialTotal ?? 0)}
                                    </TableCell>
                                    <TableCell className="text-right text-emerald-700">
                                        {formatPesos(row?.comisionMaterializadaTotal ?? 0)}
                                    </TableCell>
                                </>
                            ) : null}
                            <TableCell className="text-right text-slate-600">{row?.ventasReferencias?.length ?? 0}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default function DashboardPipelineBComision(): React.ReactElement {
    const [loading, setLoading] = useState(true);
    const [reencolando, setReencolando] = useState(false);
    const [reencolarModalOpen, setReencolarModalOpen] = useState(false);
    const [dashboard, setDashboard] = useState<PipelineBComisionDashboard | null>(null);
    const [estado, setEstado] = useState<PipelineBComisionQuery['estado']>('all');
    const [page, setPage] = useState(1);

    const loadDashboard = useCallback(async (options?: { sincronizar?: boolean }): Promise<void> => {
        setLoading(true);
        try {
            const data = await pipelineBComisionService.obtenerDashboard({
                page,
                limit: 15,
                estado,
                sincronizar: options?.sincronizar === true,
            });
            setDashboard(data);
            if (options?.sincronizar && data.sincronizacionPipelineB) {
                const sync = data.sincronizacionPipelineB;
                if (sync.ok === false) {
                    const detalleA = sync.pipelineA?.msg;
                    toast.error(
                        detalleA
                            ? `${sync.msg || 'Error al sincronizar.'} (${detalleA})`
                            : sync.msg || 'Error al sincronizar Pipeline B.',
                    );
                } else if (sync.sincronizadas || sync.pipelineA?.sincronizadas) {
                    const pipelineA = sync.pipelineA;
                    const msgPipelineA = pipelineA?.sincronizadas
                        ? ` | calculocomissionsventas: ${pipelineA.sincronizadas} registro(s)`
                        : '';
                    toast.success((sync.msg || 'Sincronización completada.') + msgPipelineA);
                } else if (sync.pipelineA?.omitidas) {
                    toast.warning(
                        sync.pipelineA.msg
                        || 'No se crearon registros en calculocomissionsventas. Revisa la consola del servidor.',
                    );
                }
            }
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

    const confirmarReencolar = async (): Promise<void> => {
        setReencolando(true);
        try {
            const result = await pipelineBComisionService.reencolar({
                scan: true,
                limit: 50,
                fixOrigen: true,
            });

            if (result.evaluadas === 0) {
                toast.info(result.msg || 'No hay auditorías pendientes de comisión.');
            } else if (result.procesadas > 0) {
                toast.success(
                    `${result.procesadas} venta(s) procesada(s) · ${result.comisionesCreadas} comisión(es) creada(s).`,
                );
            } else {
                toast.warn(
                    result.msg || `${result.omitidas} venta(s) omitida(s); revisa activación de cuenta o reglas.`,
                );
            }

            setReencolarModalOpen(false);
            await loadDashboard({ sincronizar: true });
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo reencolar comisiones Pipeline B.');
        } finally {
            setReencolando(false);
        }
    };

    const kpi = dashboard?.kpi;
    const funnel = dashboard?.funnel;
    const registros = dashboard?.registros ?? [];
    const detalleProductos = dashboard?.detalleProductos;
    const kpiProductos = detalleProductos?.kpiProductos;
    const paginacion = dashboard?.paginacion;
    const flujo = dashboard?.flujo ?? [];

    const maxFlujoCount = useMemo(
        () => Math.max(...flujo.map((paso) => paso.count), 1),
        [flujo],
    );

    const resumenProductosConRegla = useMemo(() => {
        const base = Number(
            kpiProductos?.baseComisionableTotal
            ?? kpi?.montoBaseTotal
            ?? 0,
        );
        const comision = Number(
            kpiProductos?.comisionPotencialTotal
            ?? kpi?.montoComisionTotal
            ?? 0,
        );
        const materializada = Number(
            kpiProductos?.comisionMaterializadaTotal
            ?? kpi?.comisionMaterializadaTotal
            ?? 0,
        );
        return { base, comision, materializada };
    }, [kpi, kpiProductos]);

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
                    <Button
                        className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                        onClick={() => setReencolarModalOpen(true)}
                        disabled={loading || reencolando}
                    >
                        {reencolando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Reencolar
                    </Button>

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

                    <Button variant="outline" className="gap-2" onClick={() => void loadDashboard({ sincronizar: true })} disabled={loading}>
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
                            {formatPesos(resumenProductosConRegla.base)}
                        </CardTitle>
                        <p className="text-xs text-sky-700/80">
                            Suma productos con regla · {kpiProductos?.lineasConRegla ?? 0} línea(s)
                        </p>
                    </CardHeader>
                </Card>
                <Card className="border-violet-200 bg-violet-50/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Monto comisiones</CardDescription>
                        <CardTitle className="flex items-center justify-between text-xl text-violet-900">
                            {formatPesos(resumenProductosConRegla.comision)}
                            <CircleDollarSign className="h-5 w-5 text-violet-500" />
                        </CardTitle>
                        <p className="text-xs text-violet-700/80">
                            Potencial árbol · Materializada: {formatPesos(resumenProductosConRegla.materializada)}
                        </p>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-violet-200 bg-violet-50/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Productos con regla
                        </CardDescription>
                        <CardTitle className="text-2xl text-violet-900">
                            {kpiProductos?.productosUnicosConRegla ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-violet-800">
                        {kpiProductos?.lineasConRegla ?? 0} líneas · {formatPesos(kpiProductos?.montoCobradoConRegla ?? 0)} cobrado
                    </CardContent>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Comisión potencial
                        </CardDescription>
                        <CardTitle className="text-xl text-emerald-900">
                            {kpiProductos ? formatPesos(kpiProductos.comisionPotencialTotal) : '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-emerald-800">
                        Suma árbol sobre base regla producto.
                        {' '}
                        Materializada: {formatPesos(kpiProductos?.comisionMaterializadaTotal ?? 0)}
                    </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Ban className="h-4 w-4" />
                            Sin regla de comisión
                        </CardDescription>
                        <CardTitle className="text-2xl text-amber-900">
                            {kpiProductos?.productosUnicosSinRegla ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-amber-800">
                        {kpiProductos?.lineasSinRegla ?? 0} líneas · {formatPesos(kpiProductos?.montoCobradoSinRegla ?? 0)} cobrado
                    </CardContent>
                </Card>
                <Card className="border-sky-200 bg-sky-50/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Ventas en flujo Pipeline B</CardDescription>
                        <CardTitle className="text-2xl text-sky-900">
                            {kpiProductos?.ventasEnFlujo ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-sky-800">
                        Confirmadas con origen generador enlace ventas
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card className="border-emerald-200/80 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-900">
                            <CheckCircle2 className="h-5 w-5" />
                            Productos con regla de comisión
                        </CardTitle>
                        <CardDescription>
                            Cobro por producto, base comisionable y comisión a pagar cuando la regla aplica.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && !detalleProductos ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando productos...
                            </div>
                        ) : (
                            <TablaProductosAgregados
                                filas={detalleProductos?.productosConRegla ?? []}
                                conRegla
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-amber-200/80 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-900">
                            <Ban className="h-5 w-5" />
                            Productos sin regla aplicable
                        </CardTitle>
                        <CardDescription>
                            Líneas cobradas en el flujo que no generan comisión por configuración de reglas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && !detalleProductos ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando productos...
                            </div>
                        ) : (
                            <TablaProductosAgregados
                                filas={detalleProductos?.productosSinRegla ?? []}
                                conRegla={false}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Detalle por venta confirmada</CardTitle>
                    <CardDescription>
                        Desglose línea a línea: cobrado, regla y estado de comisión por referencia de pago.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading && !detalleProductos?.ventas?.length ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando ventas...
                        </div>
                    ) : !detalleProductos?.ventas?.length ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            No hay ventas confirmadas del flujo generador enlace ventas.
                        </div>
                    ) : (
                        detalleProductos.ventas.filter(Boolean).map((venta) => {
                            const lineasVenta = [
                                ...(venta?.lineasConRegla ?? []),
                                ...(venta?.lineasSinRegla ?? []),
                            ].filter(Boolean);

                            return (
                            <div
                                key={venta?.ventaReferenciaId || venta?.referenciaPago || 'venta'}
                                className="overflow-hidden rounded-xl border border-slate-200"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {venta?.referenciaPago || venta?.ventaReferencia || 'Sin referencia'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {venta?.ventaReferencia ? `Venta ${venta.ventaReferencia}` : 'Pendiente consecutivo'}
                                            {' · '}
                                            {formatDate(venta?.confirmadaEn ?? null)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <Badge variant="outline">{formatPesos(venta?.montoVenta ?? 0, venta?.moneda)}</Badge>
                                        {venta?.comisionMaterializada ? (
                                            <Badge className="bg-emerald-100 text-emerald-800">Comisión registrada</Badge>
                                        ) : (
                                            <Badge className="bg-amber-100 text-amber-800">Comisión pendiente</Badge>
                                        )}
                                    </div>
                                </div>

                                {(lineasVenta.length > 0) ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Producto</TableHead>
                                                    <TableHead>Regla</TableHead>
                                                    <TableHead className="text-right">Cant.</TableHead>
                                                    <TableHead className="text-right">Cobrado</TableHead>
                                                    <TableHead className="text-right">Base regla</TableHead>
                                                    <TableHead className="text-right">Comisión árbol</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {lineasVenta.map((linea, index) => (
                                                    <TableRow key={`${venta?.ventaReferenciaId || 'venta'}-${linea?.productoId || index}`}>
                                                        <TableCell>
                                                            <div className="font-medium">{linea?.nombre || '—'}</div>
                                                            <div className="text-xs text-slate-500">{linea?.sku || linea?.productoId || '—'}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {linea?.reglaCodigo ? (
                                                                <span className="text-xs font-medium text-violet-800">
                                                                    {linea.reglaCodigo}
                                                                    {linea.reglaValor != null ? ` (${linea.reglaValor}%)` : ''}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-amber-700">{linea?.motivoSinRegla || 'Sin regla'}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">{linea?.cantidad ?? 0}</TableCell>
                                                        <TableCell className="text-right">{formatPesos(linea?.subtotalCobrado ?? 0, linea?.moneda)}</TableCell>
                                                        <TableCell className="text-right text-slate-700">
                                                            {linea?.aplicaComision
                                                                ? formatPesos(linea?.baseComisionable ?? 0, linea?.moneda)
                                                                : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {linea?.aplicaComision ? (
                                                                <div>
                                                                    <div className="font-medium text-violet-800">
                                                                        {formatPesos(linea?.comisionPotencial ?? 0, linea?.moneda)}
                                                                    </div>
                                                                    {(linea?.desgloseArbolPorGen?.length ?? 0) > 0 ? (
                                                                        <div className="text-[10px] text-slate-500">
                                                                            {linea.desgloseArbolPorGen?.map((row) => (
                                                                                `Gen${row.gen} ${row.percent}%`
                                                                            )).join(' · ')}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ) : '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {linea?.aplicaComision ? (
                                                                (linea?.comisionMaterializada ?? 0) > 0 ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-800">Materializada</Badge>
                                                                ) : (
                                                                    <Badge className="bg-amber-100 text-amber-800">Pendiente</Badge>
                                                                )
                                                            ) : (
                                                                <Badge variant="outline">No aplica</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="p-4 text-sm text-slate-500">Sin líneas de producto en el carrito.</p>
                                )}

                                <div className="flex flex-wrap gap-4 border-t border-slate-100 bg-white px-4 py-2 text-xs text-slate-600">
                                    <span>Total cobrado: <strong>{formatPesos(venta?.totales?.montoCobrado ?? 0, venta?.moneda)}</strong></span>
                                    <span>Comisión potencial: <strong className="text-violet-800">{formatPesos(venta?.totales?.comisionPotencial ?? 0, venta?.moneda)}</strong></span>
                                    <span>Materializada: <strong className="text-emerald-700">{formatPesos(venta?.totales?.comisionMaterializada ?? 0, venta?.moneda)}</strong></span>
                                </div>
                            </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>

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
                                        <TableHead>Cadena padre → rama</TableHead>
                                        <TableHead>Comprador</TableHead>
                                        <TableHead>Base</TableHead>
                                        <TableHead>Comisión / vouchers</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registros.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="align-top font-medium">{row.referenciaPersonalizada || '—'}</TableCell>
                                            <TableCell className="align-top">{estadoBadge(row.estado)}</TableCell>
                                            <TableCell className="max-w-[220px] align-top">
                                                {row.cadenaReferidos?.length ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.cadenaReferidos.map((nodo) => (
                                                            <div key={`${row.id}-${nodo.orden}`} className="flex items-center gap-1.5">
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {nodo.rol === 'comprador' ? 'Rama' : `Gen ${nodo.gen}`}
                                                                </Badge>
                                                                <span className="truncate text-slate-700">{nodo.correo || '—'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="truncate">{row.sponsor?.correo || '—'}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[180px] align-top truncate">
                                                <div className="flex flex-col gap-1">
                                                    <span>{row.comprador?.correo || '—'}</span>
                                                    {row.comprador && !row.comprador.cuentaActiva ? (
                                                        <Badge variant="outline" className="w-fit text-[10px]">
                                                            Cuenta pendiente activación
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">{formatMoney(row.montoBase)}</TableCell>
                                            <TableCell className="align-top">
                                                <div className="space-y-1">
                                                    <p className="font-medium">{formatMoney(row.montoComisionTotal)}</p>
                                                    {row.vouchersArbol?.length ? (
                                                        <div className="space-y-0.5 text-[11px] text-slate-500">
                                                            {row.vouchersArbol.map((voucher) => (
                                                                <p key={`${row.id}-gen-${voucher.gen}`}>
                                                                    Gen {voucher.gen}: {formatMoney(voucher.montoGanado)}
                                                                    {voucher.materializado ? '' : ' (potencial)'}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">{formatDate(row.fecha)}</TableCell>
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

            <AlertDialog
                open={reencolarModalOpen}
                onOpenChange={(open) => {
                    if (!reencolando) setReencolarModalOpen(open);
                }}
            >
                <AlertDialogContent className="max-w-md border-violet-200/80 bg-background shadow-xl sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-violet-100 text-violet-700">
                            <RotateCcw className="h-5 w-5" />
                        </AlertDialogMedia>
                        <AlertDialogTitle className="text-lg font-semibold text-slate-900">
                            Reencolar comisiones Pipeline B
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-left text-sm text-slate-600">
                                <p>
                                    Se evaluarán ventas con pago <strong className="font-medium text-slate-800">APPROVED</strong> que aún no tienen registro en <code className="rounded bg-violet-50 px-1.5 py-0.5 text-xs text-violet-800">ventasComission</code>.
                                </p>
                                <ul className="list-disc space-y-1.5 pl-5 text-slate-600">
                                    <li>Hasta <strong className="font-medium text-slate-800">50</strong> auditorías por ejecución</li>
                                    <li>Backfill de <code className="rounded bg-slate-100 px-1 text-xs">origenComision</code> cuando aplique</li>
                                    <li>Disparo de comisiones si la cuenta comprador ya está activa</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="border-t border-violet-100 bg-violet-50/40">
                        <AlertDialogCancel disabled={reencolando}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={reencolando}
                            className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmarReencolar();
                            }}
                        >
                            {reencolando ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Reencolando...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="h-4 w-4" />
                                    Confirmar reencolado
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
