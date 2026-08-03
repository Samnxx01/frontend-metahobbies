import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Activity,
    ArrowRightLeft,
    Boxes,
    CheckCircle2,
    Loader2,
    Network,
    Plus,
    RefreshCw,
    Save,
    Settings2,
    ShoppingCart,
    Trash2,
    Wallet,
} from 'lucide-react';
import dashboardVentaService, {
    type PipelineBLevel,
    type PipelineBOriginConfig,
} from '@/app/services/dashboardVentaService';
import type { BackendProducto } from '@/app/services/productosService';
import GeneradorEnlaceVentas from './generadorenlaceVentas';
import DashboardPipelineBComision from './DashboardPipelineBComision';

type EditableLevel = {
    key: string;
    gen: string;
    percent: string;
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

export default function DashboardVenta(): React.ReactElement {
    const [productos, setProductos] = useState<BackendProducto[]>([]);
    const [configs, setConfigs] = useState<PipelineBOriginConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedProductoId, setSelectedProductoId] = useState<string>('');
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
    const [levels, setLevels] = useState<EditableLevel[]>([
        makeLevel({ gen: 1, percent: 10 }),
        makeLevel({ gen: 2, percent: 3 }),
    ]);

    const loadData = async (): Promise<void> => {
        setLoading(true);
        try {
            const [productosResp, configsResp] = await Promise.all([
                dashboardVentaService.listarProductos(),
                dashboardVentaService.listarConfiguraciones(),
            ]);
            setProductos(productosResp);
            setConfigs(configsResp);
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo cargar DashboardVenta.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const configMap = useMemo(() => {
        const map = new Map<string, PipelineBOriginConfig>();
        configs.forEach((config) => {
            map.set(String(config.originId), config);
        });
        return map;
    }, [configs]);

    const selectedProducto = useMemo(
        () => productos.find((producto) => producto.iud === selectedProductoId) ?? null,
        [productos, selectedProductoId]
    );

    const selectedConfig = useMemo(
        () => (selectedProductoId ? configMap.get(selectedProductoId) ?? null : null),
        [configMap, selectedProductoId]
    );

    useEffect(() => {
        if (!selectedConfig) {
            setEditingConfigId(null);
            return;
        }

        setEditingConfigId(String(selectedConfig._id || selectedConfig.iud || ''));
        setLevels(
            selectedConfig.levels.length
                ? selectedConfig.levels.map((level) => makeLevel(level))
                : [makeLevel({ gen: 1, percent: 10 })]
        );
    }, [selectedConfig]);

    const productosConfigurados = useMemo(
        () => productos.filter((producto) => configMap.has(producto.iud)),
        [configMap, productos]
    );

    const resumen = useMemo(() => {
        const totalProductos = productos.length;
        const configurados = productosConfigurados.length;
        const pendientes = Math.max(totalProductos - configurados, 0);
        const nivelesActivos = configs.reduce((acc, config) => acc + config.levels.length, 0);

        return { totalProductos, configurados, pendientes, nivelesActivos };
    }, [configs, productos.length, productosConfigurados.length]);

    const onSelectProducto = (productoId: string): void => {
        setSelectedProductoId(productoId);
        const config = configMap.get(productoId);

        if (!config) {
            setEditingConfigId(null);
            setLevels([
                makeLevel({ gen: 1, percent: 10 }),
                makeLevel({ gen: 2, percent: 3 }),
            ]);
            return;
        }

        setEditingConfigId(String(config._id || config.iud || ''));
        setLevels(config.levels.map((level) => makeLevel(level)));
    };

    const addLevel = (): void => {
        setLevels((prev) => [...prev, makeLevel({ gen: prev.length + 1, percent: 0 })]);
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
        if (!selectedProductoId) {
            toast.error('Selecciona un producto para configurar el Pipeline B.');
            return;
        }

        const normalizedLevels = normalizeLevels(levels);
        if (!normalizedLevels.length) {
            toast.error('Debes configurar al menos un nivel válido.');
            return;
        }

        setSaving(true);
        try {
            await dashboardVentaService.guardarNivelesOrigen({
                originType: 'producto',
                originId: selectedProductoId,
                levels: normalizedLevels,
                estado: true,
            });
            toast.success(
                editingConfigId
                    ? 'Configuración del Pipeline B actualizada.'
                    : 'Configuración del Pipeline B creada.',
            );

            await loadData();
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    const pipelineChecklist = [
        {
            label: 'Configuración por origen',
            ok: !!selectedConfig,
            detail: selectedConfig
                ? 'El producto ya tiene porcentajes configurados.'
                : 'Falta registrar la comisión por origen para este producto.',
        },
        {
            label: 'Atribución capturada',
            ok: true,
            detail: 'El checkout de productos ya registra sponsor, referido y sesión invitado.',
        },
        {
            label: 'Orquestador de pago',
            ok: true,
            detail: 'El watcher de producto ya delega al orquestador de PAYMENT_APPROVED.',
        },
        {
            label: 'Panel listo para conexión',
            ok: !!selectedProducto,
            detail: selectedProducto
                ? `Producto listo para mapear el Pipeline B: ${selectedProducto.nombre}.`
                : 'Selecciona un producto para inspeccionar su conexión.',
        },
    ];

    return (
        <div className="flex-1 space-y-8 bg-gradient-to-b from-slate-50 via-background to-slate-100 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-success">
                        <Wallet className="h-3.5 w-3.5" />
                        Pipeline B
                    </div>
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">DashboardVenta</h1>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            Punto de conexión visual para ventas con atribución diferida, sponsor activo y comisión por origen.
                        </p>
                    </div>
                </div>

                <Button variant="outline" className="gap-2" onClick={() => void loadData()} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Actualizar panel
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Productos activos</CardDescription>
                        <CardTitle className="flex items-center justify-between text-2xl">
                            {resumen.totalProductos}
                            <Boxes className="h-5 w-5 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="border-success/20 bg-success/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Orígenes configurados</CardDescription>
                        <CardTitle className="flex items-center justify-between text-2xl text-success">
                            {resumen.configurados}
                            <CheckCircle2 className="h-5 w-5 text-success" />
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="border-warning/20 bg-warning/70 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Productos pendientes</CardDescription>
                        <CardTitle className="flex items-center justify-between text-2xl text-warning">
                            {resumen.pendientes}
                            <ShoppingCart className="h-5 w-5 text-warning" />
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="border-info/20 bg-info/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Niveles activos</CardDescription>
                        <CardTitle className="flex items-center justify-between text-2xl text-info">
                            {resumen.nivelesActivos}
                            <Activity className="h-5 w-5 text-info" />
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="configuracion" className="space-y-6">
                <TabsList className="grid w-full grid-cols-1 gap-2 bg-transparent p-0 md:grid-cols-4">
                    <TabsTrigger value="configuracion" className="border bg-card shadow-sm">Configuración</TabsTrigger>
                    <TabsTrigger value="conexion" className="border bg-card shadow-sm">Conexión</TabsTrigger>
                    <TabsTrigger value="comisiones" className="border bg-card shadow-sm">Comisiones</TabsTrigger>
                    <TabsTrigger value="catalogo" className="border bg-card shadow-sm">Catálogo</TabsTrigger>
                </TabsList>

                <TabsContent value="configuracion" className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Settings2 className="h-5 w-5 text-primary" />
                                    <CardTitle>Comisión por origen</CardTitle>
                                </div>
                                <CardDescription>
                                    Define los porcentajes que ejecutará el Pipeline B cuando una venta quede aprobada.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Origen</Label>
                                        <Select value={selectedProductoId} onValueChange={onSelectProducto}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un producto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productos.map((producto) => (
                                                    <SelectItem key={producto.iud} value={producto.iud}>
                                                        {producto.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Tipo de origen</Label>
                                        <Input value="producto" disabled className="bg-muted" />
                                    </div>
                                </div>

                                {selectedProducto && (
                                    <div className="rounded-2xl border border-slate-200 bg-muted/80 p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary">{selectedProducto.tipo}</Badge>
                                            <Badge variant="outline">{selectedProducto.moneda}</Badge>
                                            <Badge variant="outline">
                                                {(selectedProducto.precio / 100).toLocaleString('es-CO', {
                                                    style: 'currency',
                                                    currency: selectedProducto.moneda || 'COP',
                                                })}
                                            </Badge>
                                        </div>
                                        <p className="mt-3 text-sm font-medium text-foreground">{selectedProducto.nombre}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {selectedProducto.descripcionCorta || selectedProducto.descripcion || 'Sin descripción corta.'}
                                        </p>
                                    </div>
                                )}

                                <Separator />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Niveles de comisión</p>
                                            <p className="text-xs text-muted-foreground">Gen define posición. Percent define distribución.</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="gap-2" onClick={addLevel}>
                                            <Plus className="h-4 w-4" />
                                            Agregar nivel
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {levels.map((level, index) => (
                                            <div
                                                key={level.key}
                                                className="grid gap-3 rounded-2xl border border-slate-200 bg-card p-4 md:grid-cols-[0.7fr_1fr_auto]"
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
                                                    <Label>Porcentaje</Label>
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
                                                        className="text-muted-foreground"
                                                        onClick={() => removeLevel(level.key)}
                                                        disabled={levels.length === 1}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        Esta configuración alimenta el orquestador nuevo de PAYMENT_APPROVED para ventas producto.
                                    </p>
                                    <Button className="gap-2" onClick={() => void handleGuardar()} disabled={saving || loading}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {editingConfigId ? 'Actualizar configuración' : 'Crear configuración'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Network className="h-5 w-5 text-primary" />
                                    <CardTitle>Estado del Pipeline B</CardTitle>
                                </div>
                                <CardDescription>
                                    Checklist operativo para validar si el producto ya puede recorrer atribución, sponsor y comisión.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pipelineChecklist.map((item) => (
                                    <div
                                        key={item.label}
                                        className={`rounded-2xl border p-4 ${item.ok ? 'border-success/20 bg-success/60' : 'border-warning/20 bg-warning/60'}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                                            <Badge variant={item.ok ? 'secondary' : 'outline'}>
                                                {item.ok ? 'OK' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
                                    </div>
                                ))}

                                <Alert className="border-info/20 bg-info/10 text-info">
                                    <ArrowRightLeft className="h-4 w-4" />
                                    <AlertTitle>Cómo se conecta</AlertTitle>
                                    <AlertDescription>
                                        1. Checkout captura attribution. 2. Payment approved dispara el watcher. 3. El orquestador crea relación sponsor-hijo y ejecuta comisión por origen.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="conexion" className="space-y-6">
                    <GeneradorEnlaceVentas
                        compact
                        originId={selectedProducto?.iud || null}
                        originName={selectedProducto?.nombre || null}
                    />

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>Configuraciones registradas</CardTitle>
                            <CardDescription>
                                Vista rápida de los productos que ya quedaron conectados al Pipeline B.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Cargando configuraciones...
                                </div>
                            ) : configs.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
                                    Aún no hay configuraciones de comisión por origen.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {configs.map((config) => {
                                        const producto = productos.find((item) => item.iud === config.originId);
                                        return (
                                            <Card key={String(config._id || config.originId)} className="border-slate-200">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <CardTitle className="text-base">
                                                                {producto?.nombre || `Origen ${config.originId}`}
                                                            </CardTitle>
                                                            <CardDescription>{config.originType}</CardDescription>
                                                        </div>
                                                        <Badge variant={config.estado === false ? 'outline' : 'secondary'}>
                                                            {config.estado === false ? 'Inactivo' : 'Activo'}
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {config.levels.map((level) => (
                                                        <div key={`${config.originId}-${level.gen}`} className="flex items-center justify-between text-sm">
                                                            <span className="font-medium text-foreground">Gen {level.gen}</span>
                                                            <span className="text-muted-foreground">{level.percent}%</span>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="comisiones" className="space-y-6">
                    <DashboardPipelineBComision />
                </TabsContent>

                <TabsContent value="catalogo" className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle>Productos disponibles para venta</CardTitle>
                            <CardDescription>
                                Productos activos del catálogo privado que pueden convertirse en origen de comisión.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {productos.map((producto) => {
                                const configurado = configMap.has(producto.iud);
                                return (
                                    <button
                                        key={producto.iud}
                                        type="button"
                                        onClick={() => onSelectProducto(producto.iud)}
                                        className={`rounded-3xl border p-5 text-left transition ${selectedProductoId === producto.iud
                                            ? 'border-primary bg-primary/5 shadow-md'
                                            : 'border-slate-200 bg-card hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{producto.nombre}</p>
                                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{producto.tipo}</p>
                                            </div>
                                            <Badge variant={configurado ? 'secondary' : 'outline'}>
                                                {configurado ? 'Conectado' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                        <p className="mt-4 text-sm text-muted-foreground">
                                            {(producto.descripcionCorta || producto.descripcion || 'Sin descripción').slice(0, 120)}
                                        </p>
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
