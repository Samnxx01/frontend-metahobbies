import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ModuleHelpButton from '@/app/presentation/components/common/ModuleHelpButton';
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
    type PipelineBProductoConfigurado,
    type PipelineBComisionLineaProducto,
    type PipelineBComisionRegistro,
} from '@/app/services/pipelineBComisionService';

const formatMoney = (value: number, currency = 'COP'): string =>
    Number(value || 0).toLocaleString('es-CO', {
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
        return <Badge className="bg-success/10 text-success-foreground hover:bg-success/10">Procesada</Badge>;
    }
    if (normalized === 'pendiente') {
        return <Badge className="bg-warning/10 text-warning-foreground hover:bg-warning/10">Pendiente</Badge>;
    }
    return <Badge variant="outline">{estado || '—'}</Badge>;
};

const reglaBadge = (producto: PipelineBProductoAgregado | null | undefined): React.ReactNode => {
    if (!producto?.reglaCodigo) {
        return <Badge variant="outline">Sin regla</Badge>;
    }
    return (
        <Badge className="bg-info/10 text-info-foreground hover:bg-info/10">
            {producto.reglaCodigo}
            {producto.reglaValor != null ? ` · ${producto.reglaValor}%` : ''}
        </Badge>
    );
};

const TablaProductosConfigurados = ({ filas }: { filas: PipelineBProductoConfigurado[] }): React.ReactElement => {
    if (!filas.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
                No hay productoVentaRelaciones activas con reglas de venta parametrizadas.
            </div>
        );
    }
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead>Regla de venta</TableHead>
                        <TableHead className="text-right">Porcentaje</TableHead><TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filas.flatMap((producto) => producto.reglasVentas.map((regla, index) => (
                        <TableRow key={`${producto.relacionId}-${regla.codigo}-${index}`}>
                            <TableCell><div className="font-medium">{producto.nombre || '—'}</div><div className="text-xs text-muted-foreground">{producto.tipo || '—'}</div></TableCell>
                            <TableCell>{producto.sku || '—'}</TableCell>
                            <TableCell><Badge className="bg-info/10 text-info-foreground hover:bg-info/10">{regla.codigo}</Badge></TableCell>
                            <TableCell className="text-right font-semibold text-success-foreground">{regla.porcentaje != null ? `${regla.porcentaje}%` : 'Sin porcentaje'}</TableCell>
                            <TableCell className="text-right">{formatPesos(producto.precio, producto.moneda)}</TableCell>
                        </TableRow>
                    )))}
                </TableBody>
            </Table>
        </div>
    );
};

const TablaLineasSinRegla = ({ filas }: { filas: PipelineBComisionLineaProducto[] }): React.ReactElement => {
    const pageSize = 5;
    const [pagina, setPagina] = useState(1);
    const totalPaginas = Math.max(1, Math.ceil(filas.length / pageSize));
    const paginaActual = Math.min(pagina, totalPaginas);
    const visibles = filas.slice((paginaActual - 1) * pageSize, paginaActual * pageSize);

    if (!filas.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
                No hay productos sin regla en ventas confirmadas del flujo.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
                <Table className="min-w-[1100px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead><TableHead>Referidor</TableHead><TableHead>Comprador</TableHead>
                            <TableHead>Venta</TableHead><TableHead className="text-right">Valor</TableHead>
                            <TableHead>Fecha</TableHead><TableHead>Motivo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibles.map((linea, index) => (
                            <TableRow key={`${linea.ventaReferenciaId || 'venta'}-${linea.productoId}-${index}`}>
                                <TableCell><div className="font-medium">{linea.nombre || '—'}</div><div className="text-xs text-muted-foreground">{linea.sku || 'Sin SKU'}</div></TableCell>
                                <TableCell><div>{linea.generadorVenta?.nombre || linea.generadorVenta?.correo || 'Sin referidor'}</div>{linea.generadorVenta?.nombre && linea.generadorVenta?.correo ? <div className="text-xs text-muted-foreground">{linea.generadorVenta.correo}</div> : null}</TableCell>
                                <TableCell><div>{linea.terceroFacturado?.nombre || 'Sin comprador'}</div><div className="text-xs text-muted-foreground">{linea.terceroFacturado?.correo || ''}</div>{linea.terceroFacturado?.documento ? <div className="text-xs text-muted-foreground">{linea.terceroFacturado.tipoDocumento || 'Documento'} {linea.terceroFacturado.documento}</div> : null}</TableCell>
                                <TableCell><div className="font-medium">{linea.ventaReferencia || 'Pendiente'}</div><div className="font-mono text-xs text-muted-foreground">{linea.referenciaPago || '—'}</div></TableCell>
                                <TableCell className="whitespace-nowrap text-right font-semibold">{formatPesos(linea.subtotalCobrado, linea.moneda)}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatDate(linea.confirmadaEn || null)}</TableCell>
                                <TableCell className="max-w-64 text-xs text-muted-foreground">{linea.motivoSinRegla || 'Sin regla aplicable'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">{filas.length} registro(s) · Página {paginaActual} de {totalPaginas}</span>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={paginaActual <= 1} onClick={() => setPagina((prev) => Math.max(1, prev - 1))}>Anterior</Button>
                    <Button type="button" variant="outline" size="sm" disabled={paginaActual >= totalPaginas} onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}>Siguiente</Button>
                </div>
            </div>
        </div>
    );
};

const TablaTrazabilidadVentasComission = ({ filas, aprobandoId, onAprobar }: {
    filas: PipelineBComisionRegistro[];
    aprobandoId: string | null;
    onAprobar: (row: PipelineBComisionRegistro) => void;
}): React.ReactElement => {
    if (!filas.length) return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No hay documentos ventasComission para Pipeline B.</div>;
    return (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
            <Table className="min-w-[1050px]">
                <TableHeader><TableRow><TableHead>Venta / pago</TableHead><TableHead>Comprador</TableHead><TableHead>Referidor y rama</TableHead><TableHead className="text-right">Base</TableHead><TableHead className="text-right">Distribuido</TableHead><TableHead>Distribución por nivel</TableHead><TableHead>Estado / fecha</TableHead><TableHead>Aprobación</TableHead></TableRow></TableHeader>
                <TableBody>{filas.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell className="align-top"><div className="font-medium">{row.referenciaPersonalizada || 'Sin referencia'}</div><div className="font-mono text-xs text-muted-foreground">{row.id}</div></TableCell>
                        <TableCell className="max-w-[180px] align-top"><div className="truncate">{row.comprador?.correo || 'Sin comprador'}</div></TableCell>
                        <TableCell className="min-w-[230px] align-top"><div className="mb-1 text-xs font-medium">Directo: {row.sponsor?.correo || 'Sin referidor'}</div><div className="space-y-1">{(row.cadenaReferidos || []).map((nodo) => <div key={`${row.id}-${nodo.orden}`} className="flex items-center gap-1.5 text-xs"><Badge variant="outline" className="text-[10px]">{nodo.rol === 'comprador' ? 'Comprador' : `Gen ${nodo.gen}`}</Badge><span className="max-w-[170px] truncate">{nodo.correo || nodo.userId || '—'}</span></div>)}</div></TableCell>
                        <TableCell className="whitespace-nowrap text-right align-top">{formatMoney(row.montoBase)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right align-top font-semibold text-success-foreground">{formatMoney(row.montoComisionTotal)}</TableCell>
                        <TableCell className="min-w-[220px] align-top">{(row.vouchersArbol || []).length ? <div className="space-y-1 text-xs">{row.vouchersArbol?.map((voucher) => <div key={`${row.id}-${voucher.gen}-${voucher.sponsorUserId || ''}`}>Gen {voucher.gen} · {voucher.percent}% · {formatMoney(voucher.montoGanado)}<span className="text-muted-foreground"> · {voucher.sponsorCorreo || 'Sin correo'}</span></div>)}</div> : <span className="text-xs text-muted-foreground">Pendiente de distribución</span>}</TableCell>
                        <TableCell className="whitespace-nowrap align-top">{estadoBadge(row.estado)}<div className="mt-1 text-xs text-muted-foreground">{formatDate(row.fecha)}</div></TableCell>
                        <TableCell className="min-w-[190px] align-top">
                            {row.aprobacion?.estado === 'APROBADA' ? (
                                <div className="space-y-2"><Badge className="bg-success/10 text-success-foreground">Aprobada</Badge><div className="text-xs font-semibold">{formatMoney(row.aprobacion.comisionCalculada)}</div><Button variant="outline" size="sm" onClick={() => onAprobar(row)} disabled={aprobandoId === row.id}>{aprobandoId === row.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Recalcular Gen 1</Button></div>
                            ) : row.omisionCodigo === 'AUTORREFERENCIA' ? (
                                <div className="space-y-2"><Badge className="bg-warning/10 text-warning-foreground">Requiere aprobación</Badge><Button size="sm" onClick={() => onAprobar(row)} disabled={aprobandoId === row.id}>{aprobandoId === row.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Aprobar y calcular</Button></div>
                            ) : <span className="text-xs text-muted-foreground">No aplica</span>}
                        </TableCell>
                    </TableRow>
                ))}</TableBody>
            </Table>
        </div>
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
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
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
                                <TableHead>Facturada a</TableHead>
                                <TableHead>Generada por</TableHead>
                            </>
                        ) : null}
                        <TableHead className="text-right">Ventas</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filas.filter(Boolean).map((row, index) => (
                        <TableRow key={row?.productoId || `producto-${index}`}>
                            <TableCell>
                                <div className="font-medium text-foreground">{row?.nombre || '—'}</div>
                                <div className="text-xs text-muted-foreground">{row?.tipo || '—'}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row?.sku || '—'}</TableCell>
                            <TableCell>
                                {conRegla ? (
                                    reglaBadge(row)
                                ) : (
                                    <span className="text-xs text-muted-foreground">{row?.motivoSinRegla || 'Sin regla aplicable'}</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">{row?.cantidadUnidades ?? 0}</TableCell>
                            <TableCell className="text-right font-medium">{formatPesos(row?.montoCobradoTotal ?? 0)}</TableCell>
                            {conRegla ? (
                                <>
                                    <TableCell className="text-right">{formatPesos(row?.baseComisionableTotal ?? 0)}</TableCell>
                                    <TableCell className="text-right font-semibold text-info-foreground">
                                        {formatPesos(row?.comisionPotencialTotal ?? 0)}
                                    </TableCell>
                                    <TableCell>
                                        {row?.tercerosFacturados?.length ? (
                                            <div className="space-y-1 text-xs">
                                                {row.tercerosFacturados.map((tercero, terceroIndex) => (
                                                    <div key={tercero.id || tercero.documento || tercero.correo || terceroIndex}>
                                                        <div className="font-medium text-foreground">
                                                            {tercero.nombre || 'Tercero sin nombre'}
                                                        </div>
                                                        <div className="text-muted-foreground">{tercero.correo || 'Sin correo'}</div>
                                                        {tercero.documento ? (
                                                            <div className="text-muted-foreground">
                                                                {tercero.tipoDocumento || 'Documento'} {tercero.documento}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sin tercero facturado</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {row?.generadoresVenta?.length ? (
                                            <div className="space-y-0.5 text-xs">
                                                {row.generadoresVenta.map((generador) => (
                                                    <div key={generador.id}>
                                                        <div className="font-medium text-foreground">
                                                            {generador.nombre || generador.correo || 'Tercero sin nombre'}
                                                        </div>
                                                        {generador.nombre && generador.correo ? (
                                                            <div className="text-muted-foreground">{generador.correo}</div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sin tercero atribuido</span>
                                        )}
                                    </TableCell>
                                </>
                            ) : null}
                            <TableCell className="text-right text-muted-foreground">{row?.ventasReferencias?.length ?? 0}</TableCell>
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
    const [aprobandoId, setAprobandoId] = useState<string | null>(null);
    const [voucherDetalle, setVoucherDetalle] = useState<PipelineBComisionRegistro | null>(null);
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
            } else if (result.afectadas > 0) {
                toast.success(
                    `${result.evaluadas} reencolamiento(s): ${result.afectadas} con afectación y ${result.sinAfectacion} sin cambios.`,
                );
            } else {
                toast.info(
                    result.msg || `${result.evaluadas} reencolamiento(s), ninguno produjo cambios.`,
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

    const aprobarComision = async (row: PipelineBComisionRegistro): Promise<void> => {
        setAprobandoId(row.id);
        try {
            const result = await pipelineBComisionService.aprobar(row.id);
            toast.success(`Comisión calculada: ${formatPesos(result.comisionCalculada)} (${result.porcentajeTotal}%).`);
            await loadDashboard();
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo aprobar y calcular la comisión.');
        } finally {
            setAprobandoId(null);
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
        const base = Number(kpi?.montoBaseTotal ?? 0);
        const comision = Number(kpi?.montoComisionTotal ?? 0);
        const materializada = Number(kpi?.comisionMaterializadaTotal ?? 0);
        return { base, comision, materializada };
    }, [kpi]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-info-foreground">
                        <GitBranch className="h-3.5 w-3.5" />
                        Flujo GET
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-start">
                        <h2 className="text-xl font-semibold text-foreground">Comisiones Pipeline B</h2>
                        <ModuleHelpButton id="btn-ayuda-modulo-pipeline-b" title="Ayuda de Comisiones Pipeline B" description="Sigue la venta referenciada desde la atribución hasta el cálculo y distribución de la comisión." details={["Reencolar recupera ventas aprobadas incompletas.", "Pendiente indica que falta aprobación o distribución.", "La base proviene de productos con regla activa.", "La trazabilidad identifica comprador, referidor y rama."]} />
                    </div>
                    <p className="max-w-3xl text-sm text-muted-foreground">
                        Seguimiento del flujo enlace ventas → atribución → checkout → pago APPROVED → ventasComission.
                    </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                    <Button
                        className="gap-2 bg-info text-button-foreground hover:bg-info"
                        onClick={() => setReencolarModalOpen(true)}
                        disabled={loading || reencolando}
                    >
                        {reencolando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Reencolar
                    </Button>

                    <Select value={estado} onValueChange={(value) => setEstado(value as PipelineBComisionQuery['estado'])}>
                        <SelectTrigger className="w-[180px] bg-card">
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
                <Card className="border-success/20 bg-success/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Procesadas</CardDescription>
                        <CardTitle className="flex items-center justify-between text-2xl text-success-foreground">
                            {kpi?.comisionesProcesadas ?? '—'}
                            <TrendingUp className="h-5 w-5 text-success-foreground" />
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-warning/20 bg-warning/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Pendientes</CardDescription>
                        <CardTitle className="flex items-center justify-between text-2xl text-warning-foreground">
                            {kpi?.comisionesPendientes ?? '—'}
                            <Clock3 className="h-5 w-5 text-warning-foreground" />
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="border-info/20 bg-info/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Base comisionable</CardDescription>
                        <CardTitle className="text-xl text-info-foreground">
                            {formatPesos(resumenProductosConRegla.base)}
                        </CardTitle>
                        <p className="text-xs text-info-foreground/80">
                            Suma productos con regla · {kpiProductos?.lineasConRegla ?? 0} línea(s)
                        </p>
                    </CardHeader>
                </Card>
                <Card className="border-info/20 bg-info/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Monto comisiones</CardDescription>
                        <CardTitle className="flex items-center justify-between text-xl text-info-foreground">
                            {formatPesos(resumenProductosConRegla.comision)}
                            <CircleDollarSign className="h-5 w-5 text-info-foreground" />
                        </CardTitle>
                        <p className="text-xs text-info-foreground/80">
                            {resumenProductosConRegla.base > 0 && resumenProductosConRegla.comision === 0
                                ? (detalleProductos?.arbolComision?.configurado
                                    ? 'Sin niveles elegibles en el árbol para esta venta'
                                    : 'Sin niveles configurados en el árbol venta-referido')
                                : `Potencial del árbol · Registrada: ${formatPesos(resumenProductosConRegla.materializada)}`}
                        </p>
                    </CardHeader>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-info/20 bg-info/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Productos con regla
                        </CardDescription>
                        <CardTitle className="text-2xl text-info-foreground">
                            {kpiProductos?.productosConfiguradosConRegla ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-info-foreground">
                        {kpiProductos?.reglasVentasConfiguradas ?? 0} regla(s) de venta parametrizada(s)
                    </CardContent>
                </Card>
                <Card className="border-success/20 bg-success/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Comisión potencial
                        </CardDescription>
                        <CardTitle className="text-xl text-success-foreground">
                            {kpiProductos ? formatPesos(kpiProductos.comisionPotencialTotal) : '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-success-foreground">
                        Suma árbol sobre base regla producto.
                        {' '}
                        {Number(kpiProductos?.baseComisionableTotal ?? 0) > 0
                            && Number(kpiProductos?.comisionPotencialTotal ?? 0) === 0
                            ? (detalleProductos?.arbolComision?.configurado
                                ? 'Sin niveles elegibles para la venta.'
                                : 'Falta configurar el árbol venta-referido.')
                            : `Registrada: ${formatPesos(kpiProductos?.comisionMaterializadaTotal ?? 0)}`}
                    </CardContent>
                </Card>
                <Card className="border-warning/20 bg-warning/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Ban className="h-4 w-4" />
                            Sin regla de comisión
                        </CardDescription>
                        <CardTitle className="text-2xl text-warning-foreground">
                            {kpiProductos?.productosUnicosSinRegla ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-warning-foreground">
                        {kpiProductos?.lineasSinRegla ?? 0} líneas · {formatPesos(kpiProductos?.montoCobradoSinRegla ?? 0)} cobrado
                    </CardContent>
                </Card>
                <Card className="border-info/20 bg-info/50 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Ventas en flujo Pipeline B</CardDescription>
                        <CardTitle className="text-2xl text-info-foreground">
                            {kpiProductos?.ventasEnFlujo ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-info-foreground">
                        Confirmadas con origen generador enlace ventas
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card className="border-success/80 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-success-foreground">
                            <CheckCircle2 className="h-5 w-5" />
                            Productos con regla de venta parametrizada
                            <ModuleHelpButton compact id="btn-ayuda-productos-regla-pipeline-b" title="Productos con regla" description="Lista los productos habilitados para generar comisión y el porcentaje configurado." />
                        </CardTitle>
                        <CardDescription>
                            productoVentaRelaciones activas, regla de venta y porcentaje configurado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && !detalleProductos ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando productos...
                            </div>
                        ) : (
                            <TablaProductosConfigurados filas={detalleProductos?.productosConfiguradosConRegla ?? []} />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-info/80 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-info-foreground">
                            <GitBranch className="h-5 w-5" />
                            Trazabilidad ventasComission
                            <ModuleHelpButton compact id="btn-ayuda-trazabilidad-pipeline-b" title="Trazabilidad de comisiones" description="Muestra comprador, referidor, rama, base, distribución y estado de cada comisión." />
                        </CardTitle>
                        <CardDescription>
                            Comprador, referidor, rama y valor distribuido para cada comisión Pipeline B.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && registros.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando trazabilidad...
                            </div>
                        ) : (
                            <TablaTrazabilidadVentasComission
                                filas={registros}
                                aprobandoId={aprobandoId}
                                onAprobar={(row) => void aprobarComision(row)}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">Detalle por venta confirmada<ModuleHelpButton compact id="btn-ayuda-detalle-venta-pipeline-b" title="Detalle por venta" description="Desglosa productos cobrados, reglas aplicadas y comisión potencial o materializada." /></CardTitle>
                    <CardDescription>
                        Desglose línea a línea: cobrado, regla y estado de comisión por referencia de pago.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading && !detalleProductos?.ventas?.length ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando ventas...
                        </div>
                    ) : !detalleProductos?.ventas?.length ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
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
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-muted/80 px-4 py-3">
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {venta?.referenciaPago || venta?.ventaReferencia || 'Sin referencia'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {venta?.ventaReferencia ? `Venta ${venta.ventaReferencia}` : 'Pendiente consecutivo'}
                                            {' · '}
                                            {formatDate(venta?.confirmadaEn ?? null)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <Badge variant="outline">{formatPesos(venta?.montoVenta ?? 0, venta?.moneda)}</Badge>
                                        {venta?.comisionMaterializada ? (
                                            <Badge className="bg-success/10 text-success-foreground">Comisión registrada</Badge>
                                        ) : (
                                            <Badge className="bg-warning/10 text-warning-foreground">Comisión pendiente</Badge>
                                        )}
                                        {venta?.reencolamiento ? (
                                            <Badge variant="outline">
                                                Reencolamientos: {venta.reencolamiento.total}
                                                {' · '}
                                                {venta.reencolamiento.conAfectacion} afectó
                                                {' · '}
                                                {venta.reencolamiento.sinAfectacion} sin cambios
                                            </Badge>
                                        ) : null}
                                        {(venta?.distribucion?.asignaciones?.length ?? 0) > 0 ? (
                                            <Badge className="bg-info/10 text-info-foreground">
                                                Distribución{venta?.distribucion?.codigo ? ` ${venta.distribucion.codigo}` : ''}:
                                                {' '}
                                                {venta?.distribucion?.asignaciones.map((asignacion) => (
                                                    `Gen${asignacion.gen} (${asignacion.percent}%) → ${formatPesos(asignacion.montoAsignado, venta?.moneda)}`
                                                )).join(' · ')}
                                            </Badge>
                                        ) : venta?.aprobacion ? (
                                            <Badge className="bg-warning/10 text-warning-foreground">
                                                Aprobación {venta.aprobacion.estado.toLowerCase()}
                                                {' · '}
                                                {formatPesos(venta.aprobacion.comisionCalculada, venta?.moneda)}
                                            </Badge>
                                        ) : null}
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
                                                            <div className="text-xs text-muted-foreground">{linea?.sku || linea?.productoId || '—'}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {linea?.reglaCodigo ? (
                                                                <span className="text-xs font-medium text-info-foreground">
                                                                    {linea.reglaCodigo}
                                                                    {linea.reglaValor != null ? ` (${linea.reglaValor}%)` : ''}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-warning-foreground">{linea?.motivoSinRegla || 'Sin regla'}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">{linea?.cantidad ?? 0}</TableCell>
                                                        <TableCell className="text-right">{formatPesos(linea?.subtotalCobrado ?? 0, linea?.moneda)}</TableCell>
                                                        <TableCell className="text-right text-foreground/85">
                                                            {linea?.aplicaComision
                                                                ? formatPesos(linea?.baseComisionable ?? 0, linea?.moneda)
                                                                : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {linea?.aplicaComision ? (
                                                                <div>
                                                                    <div className="font-medium text-info-foreground">
                                                                        {formatPesos(linea?.comisionPotencial ?? 0, linea?.moneda)}
                                                                    </div>
                                                                    {(linea?.desgloseArbolPorGen?.length ?? 0) > 0 ? (
                                                                        <div className="text-[10px] text-muted-foreground">
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
                                                                    <Badge className="bg-success/10 text-success-foreground">Materializada</Badge>
                                                                ) : (
                                                                    <Badge className="bg-warning/10 text-warning-foreground">Pendiente</Badge>
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
                                    <p className="p-4 text-sm text-muted-foreground">Sin líneas de producto en el carrito.</p>
                                )}

                                <div className="flex flex-wrap gap-4 border-t border-slate-100 bg-card px-4 py-2 text-xs text-muted-foreground">
                                    <span>Total cobrado: <strong>{formatPesos(venta?.totales?.montoCobrado ?? 0, venta?.moneda)}</strong></span>
                                    <span>Comisión potencial: <strong className="text-info-foreground">{formatPesos(venta?.totales?.comisionPotencial ?? 0, venta?.moneda)}</strong></span>
                                    <span>Materializada: <strong className="text-success-foreground">{formatPesos(venta?.totales?.comisionMaterializada ?? 0, venta?.moneda)}</strong></span>
                                    {venta?.distribucion ? (
                                        <span>
                                            Distribuido: <strong className="text-info-foreground">{formatPesos(venta.distribucion.montoDistribuido, venta?.moneda)}</strong>
                                            {venta.distribucion.asignaciones.length > 0 ? (
                                                <> ({venta.distribucion.asignaciones.map((asignacion) => (
                                                    `Gen${asignacion.gen} ${asignacion.percent}%`
                                                )).join(' · ')})</>
                                            ) : null}
                                            {venta.distribucion.estado ? ` · ${venta.distribucion.estado}` : ''}
                                        </span>
                                    ) : null}
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
                        <CardTitle className="flex items-center justify-between gap-2">Embudo del flujo<ModuleHelpButton compact id="btn-ayuda-embudo-pipeline-b" title="Embudo Pipeline B" description="Compara los conteos de atribución, checkout, pago aprobado y comisión materializada." /></CardTitle>
                        <CardDescription>
                            Conteos acumulados desde atribución hasta comisión materializada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading && !dashboard ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando embudo...
                            </div>
                        ) : (
                            flujo.map((paso, index) => (
                                <div key={paso.clave} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-button text-xs font-semibold text-button-foreground">
                                                {paso.paso}
                                            </span>
                                            <div>
                                                <p className="font-medium text-foreground">{paso.label}</p>
                                                <p className="text-xs text-muted-foreground">{paso.descripcion}</p>
                                            </div>
                                        </div>
                                        <span className="font-semibold text-foreground">{paso.count}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-info to-success transition-all"
                                            style={{ width: `${Math.max((paso.count / maxFlujoCount) * 100, paso.count > 0 ? 8 : 0)}%` }}
                                        />
                                    </div>
                                    {index < flujo.length - 1 ? (
                                        <div className="flex justify-center py-1 text-foreground/40">
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
                        <CardTitle className="flex items-center justify-between gap-2">Atribuciones Pipeline B<ModuleHelpButton compact id="btn-ayuda-atribuciones-pipeline-b" title="Atribuciones Pipeline B" description="Resume sesiones activas, resueltas y expiradas originadas en enlaces de producto." /></CardTitle>
                        <CardDescription>Sesiones con metadata.flow=pipeline_b y originType=producto.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-muted/80 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{funnel?.atribuciones.total ?? 0}</p>
                        </div>
                        <div className="rounded-2xl border border-success/20 bg-success/70 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-success-foreground">Resueltas</p>
                            <p className="mt-2 text-2xl font-semibold text-success-foreground">{funnel?.atribuciones.resolved ?? 0}</p>
                        </div>
                        <div className="rounded-2xl border border-info/20 bg-info/70 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-info-foreground">Activas</p>
                            <p className="mt-2 text-2xl font-semibold text-info-foreground">{funnel?.atribuciones.active ?? 0}</p>
                        </div>
                        <div className="rounded-2xl border border-warning/20 bg-warning/70 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-warning-foreground">Expiradas</p>
                            <p className="mt-2 text-2xl font-semibold text-warning-foreground">{funnel?.atribuciones.expired ?? 0}</p>
                        </div>
                        <div className="rounded-2xl border border-info/20 bg-info/70 p-4 sm:col-span-2">
                            <div className="flex items-center gap-2 text-info-foreground">
                                <Users className="h-4 w-4" />
                                <p className="text-sm font-medium">Ventas confirmadas vs comisiones</p>
                            </div>
                            <p className="mt-2 text-sm text-info-foreground">
                                {funnel?.ventasConfirmadas ?? 0} ventas confirmadas · {funnel?.comisionesMaterializadas ?? 0} comisiones materializadas
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">Registros ventasComission<ModuleHelpButton compact id="btn-ayuda-registros-pipeline-b" title="Registros ventasComission" description="Consulta los documentos persistidos, su estado, comprador, rama y valor distribuido." /></CardTitle>
                    <CardDescription>
                        Detalle GET del flujo de comisión del generador enlace ventas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading && registros.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando registros...
                        </div>
                    ) : registros.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
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
                                            <TableCell className="max-w-[220px] align-top">
                                                <div className="space-y-1">
                                                    {estadoBadge(row.estado)}
                                                    {row.motivoEstado ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            {row.omisionCodigo ? `${row.omisionCodigo}: ` : ''}{row.motivoEstado}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[220px] align-top">
                                                {row.cadenaReferidos?.length ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.cadenaReferidos.map((nodo) => (
                                                            <div key={`${row.id}-${nodo.orden}`} className="flex items-center gap-1.5">
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {nodo.rol === 'comprador' ? 'Rama' : `Gen ${nodo.gen}`}
                                                                </Badge>
                                                                <span className="truncate text-foreground/85">{nodo.correo || '—'}</span>
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
                                                        <div className="space-y-0.5 text-[11px] text-muted-foreground">
                                                            {row.vouchersArbol.map((voucher) => (
                                                                <p key={`${row.id}-gen-${voucher.gen}`}>
                                                                    Gen {voucher.gen}: {formatMoney(voucher.montoGanado)}
                                                                    {voucher.materializado ? '' : ' (potencial)'}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    {(row.vouchersArbol?.length || row.cadenaReferidos?.length) ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-1 h-7 px-2 text-xs"
                                                            onClick={() => setVoucherDetalle(row)}
                                                        >
                                                            <GitBranch className="mr-1 h-3.5 w-3.5" />
                                                            Ver red
                                                        </Button>
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
                            <p className="text-xs text-muted-foreground">
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
                <AlertDialogContent className="max-w-md border-info/80 bg-background shadow-xl sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-info/10 text-info-foreground">
                            <RotateCcw className="h-5 w-5" />
                        </AlertDialogMedia>
                        <AlertDialogTitle className="text-lg font-semibold text-foreground">
                            Reencolar comisiones Pipeline B
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-left text-sm text-muted-foreground">
                                <p>
                                    Se evaluarán ventas con pago <strong className="font-medium text-foreground">APPROVED</strong> sin comisión o con una distribución pendiente sin vouchers.
                                </p>
                                <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                                    <li>Hasta <strong className="font-medium text-foreground">50</strong> auditorías por ejecución</li>
                                    <li>Backfill de <code className="rounded bg-muted px-1 text-xs">origenComision</code> cuando aplique</li>
                                    <li>Reutiliza venta, auditoría, reglas, comprador, referidor y consecutivo existentes</li>
                                    <li>Dispara únicamente vouchers faltantes y evita duplicados</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="border-t border-info/10 bg-info/40">
                        <AlertDialogCancel disabled={reencolando}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={reencolando}
                            className="gap-2 bg-info text-button-foreground hover:bg-info"
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

            <AlertDialog
                open={voucherDetalle !== null}
                onOpenChange={(open) => {
                    if (!open) setVoucherDetalle(null);
                }}
            >
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-info/10">
                            <GitBranch className="h-6 w-6 text-info-foreground" />
                        </AlertDialogMedia>
                        <AlertDialogTitle className="text-lg font-semibold text-foreground">
                            Voucher {voucherDetalle?.referenciaPersonalizada || 'sin referencia'} · red de distribución
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-left text-sm text-muted-foreground">
                                <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-muted/40 px-3 py-2 text-xs">
                                    <span>Comprador: <strong className="text-foreground">{voucherDetalle?.comprador?.correo || '—'}</strong></span>
                                    <span>Base: <strong className="text-foreground">{formatMoney(voucherDetalle?.montoBase ?? 0)}</strong></span>
                                    <span>Comisión: <strong className="text-success-foreground">{formatMoney(voucherDetalle?.montoComisionTotal ?? 0)}</strong></span>
                                    <span>Estado: <strong className="text-foreground">{voucherDetalle?.estado || '—'}</strong></span>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">Red padre → rama</p>
                                    {voucherDetalle?.cadenaReferidos?.length ? (
                                        <div className="space-y-1.5">
                                            {voucherDetalle.cadenaReferidos.map((nodo) => (
                                                <div key={`red-${nodo.orden}`} className="flex items-center gap-2 text-xs">
                                                    <Badge variant="outline" className="w-24 justify-center text-[10px]">
                                                        {nodo.rol === 'comprador' ? 'Comprador' : `Gen ${nodo.gen}`}
                                                    </Badge>
                                                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                    <span className="truncate text-foreground/85">{nodo.correo || nodo.userId || '—'}</span>
                                                    {nodo.bypassMembresia ? (
                                                        <Badge variant="outline" className="text-[10px]">Bypass</Badge>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs">Sin cadena de referidos registrada.</p>
                                    )}
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">Vouchers por generación</p>
                                    {voucherDetalle?.vouchersArbol?.length ? (
                                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="text-xs">Gen</TableHead>
                                                        <TableHead className="text-xs">Beneficiario</TableHead>
                                                        <TableHead className="text-right text-xs">%</TableHead>
                                                        <TableHead className="text-right text-xs">Base</TableHead>
                                                        <TableHead className="text-right text-xs">Ganado</TableHead>
                                                        <TableHead className="text-xs">Estado</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {voucherDetalle.vouchersArbol.map((voucher) => (
                                                        <TableRow key={`voucher-${voucher.gen}-${voucher.sponsorUserId || ''}`}>
                                                            <TableCell className="text-xs font-medium">Gen {voucher.gen}</TableCell>
                                                            <TableCell className="max-w-[180px] truncate text-xs">{voucher.sponsorCorreo || voucher.sponsorUserId || '—'}</TableCell>
                                                            <TableCell className="text-right text-xs">{voucher.percent}%</TableCell>
                                                            <TableCell className="text-right text-xs">{formatMoney(voucher.montoBaseComision)}</TableCell>
                                                            <TableCell className="text-right text-xs font-semibold text-success-foreground">{formatMoney(voucher.montoGanado)}</TableCell>
                                                            <TableCell className="text-xs">
                                                                {voucher.materializado ? (
                                                                    <Badge className="bg-success/10 text-success-foreground">Materializado</Badge>
                                                                ) : (
                                                                    <Badge className="bg-warning/10 text-warning-foreground">Potencial</Badge>
                                                                )}
                                                                {voucher.contadorComisiId ? (
                                                                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">{voucher.contadorComisiId}</div>
                                                                ) : null}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-xs">Aún no hay vouchers materializados para esta comisión.</p>
                                    )}
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cerrar</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
