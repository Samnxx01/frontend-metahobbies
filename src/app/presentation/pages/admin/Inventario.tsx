import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Warehouse,
} from 'lucide-react';
import inventarioService, {
  type AjusteInventario,
  type AjustePayload,
  type BodegaInventario,
  type EstadoAjuste,
  type InventarioConfig,
  type InventarioMovimiento,
  type InventarioSaldo,
  type MetodoValuacion,
  type MotivoMovimiento,
  type StockActualItem,
  type TipoAjuste,
} from '@/app/services/inventarioService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const MOTIVOS: MotivoMovimiento[] = ['COMPRA', 'VENTA', 'MERMA', 'DANO', 'ERROR_CONTEO', 'PERDIDA', 'OTRO'];
const CAUSALES_AJUSTE = ['MERMA', 'DANO', 'ERROR_CONTEO', 'PERDIDA', 'OTRO'];

type MovimientoForm = {
  tipo: 'ENTRADA' | 'SALIDA';
  sku: string;
  bodega: string;
  cantidad: string;
  costoUnitario: string;
  motivo: MotivoMovimiento;
  documentoTipo: string;
  documentoNumero: string;
};

const movimientoInicial: MovimientoForm = {
  tipo: 'ENTRADA',
  sku: '',
  bodega: '',
  cantidad: '',
  costoUnitario: '',
  motivo: 'COMPRA',
  documentoTipo: 'DOCUMENTO_SOPORTE',
  documentoNumero: '',
};

const ajusteInicial: AjustePayload = {
  sku: '',
  bodega: '',
  tipoAjuste: 'POSITIVO',
  causal: 'OTRO',
  cantidad: 1,
  costoUnitarioReferencia: 0,
  observacion: '',
};

const formatDate = (value?: string): string => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const estadoBadge = (estado: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (estado === 'APROBADO' || estado === 'REINGRESADA') return 'default';
  if (estado === 'RECHAZADO' || estado === 'DADA_DE_BAJA') return 'destructive';
  if (estado === 'SOLICITADO' || estado === 'EN_CUARENTENA') return 'secondary';
  return 'outline';
};

export default function Inventario(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<InventarioConfig | null>(null);
  const [bodegas, setBodegas] = useState<BodegaInventario[]>([]);
  const [stockActual, setStockActual] = useState<StockActualItem[]>([]);
  const [kardex, setKardex] = useState<InventarioMovimiento[]>([]);
  const [ajustes, setAjustes] = useState<AjusteInventario[]>([]);
  const [stockConsulta, setStockConsulta] = useState<InventarioSaldo | null>(null);
  const [stockFiltro, setStockFiltro] = useState({ sku: '', bodega: '' });
  const [periodo, setPeriodo] = useState('');
  const [bodegaForm, setBodegaForm] = useState({ nombre: '', descripcion: '' });
  const [movimientoForm, setMovimientoForm] = useState<MovimientoForm>(movimientoInicial);
  const [ajusteForm, setAjusteForm] = useState<AjustePayload>(ajusteInicial);
  const [ajusteFiltro, setAjusteFiltro] = useState<EstadoAjuste | ''>('');

  const resumen = useMemo(() => {
    const valorTotal = stockActual.reduce((acc, item) => {
      const valor = Number(item.valorTotal ?? Number(item.cantidadDisponible || 0) * Number(item.costoPromedioUnitario || 0));
      return acc + valor;
    }, 0);
    const unidades = stockActual.reduce((acc, item) => acc + Number(item.cantidadDisponible || 0), 0);
    const pendientes = ajustes.filter((ajuste) => ajuste.estado === 'SOLICITADO').length;

    return {
      skus: new Set(stockActual.map((item) => item.sku)).size,
      unidades,
      valorTotal,
      pendientes,
    };
  }, [ajustes, stockActual]);

  const bodegaOptions = useMemo(() => bodegas.map((bodega) => bodega.nombre), [bodegas]);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [configResp, bodegasResp, stockResp, ajustesResp] = await Promise.all([
        inventarioService.obtenerConfig(),
        inventarioService.listarBodegas(),
        inventarioService.stockActual(),
        inventarioService.listarAjustes({ estado: ajusteFiltro }),
      ]);
      setConfig(configResp);
      setBodegas(bodegasResp);
      setStockActual(stockResp);
      setAjustes(ajustesResp);
    } catch (error) {
      console.error('Error cargando inventario:', error);
      toast.error('No se pudo cargar el módulo de inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const refreshAjustes = async (estado: EstadoAjuste | '' = ajusteFiltro): Promise<void> => {
    const data = await inventarioService.listarAjustes({ estado });
    setAjustes(data);
  };

  const refreshKardex = async (): Promise<void> => {
    const data = await inventarioService.listarKardex({
      sku: stockFiltro.sku,
      bodega: stockFiltro.bodega,
      limit: 100,
    });
    setKardex(data);
  };

  const consultarStock = async (): Promise<void> => {
    if (!stockFiltro.sku.trim() || !stockFiltro.bodega.trim()) {
      toast.error('SKU y bodega son obligatorios para consultar stock.');
      return;
    }

    try {
      const [saldo] = await Promise.all([
        inventarioService.obtenerStock({
          sku: stockFiltro.sku.trim(),
          bodega: stockFiltro.bodega.trim(),
        }),
        refreshKardex(),
      ]);
      setStockConsulta(saldo);
    } catch (error) {
      console.error('Error consultando stock:', error);
      toast.error('No se pudo consultar el stock.');
    }
  };

  const actualizarMetodo = async (metodoValuacion: MetodoValuacion): Promise<void> => {
    try {
      setSaving(true);
      const data = await inventarioService.actualizarMetodoValuacion(metodoValuacion);
      setConfig(data);
      toast.success('Método de valuación actualizado.');
    } catch (error) {
      console.error('Error actualizando método:', error);
      toast.error('No se pudo actualizar el método de valuación.');
    } finally {
      setSaving(false);
    }
  };

  const cerrarPeriodo = async (): Promise<void> => {
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      toast.error('Usa formato YYYY-MM para cerrar un periodo.');
      return;
    }

    try {
      setSaving(true);
      const periodosCerrados = await inventarioService.cerrarPeriodo(periodo);
      setConfig((prev) => prev ? { ...prev, periodosCerrados } : prev);
      setPeriodo('');
      toast.success('Periodo contable cerrado.');
    } catch (error) {
      console.error('Error cerrando periodo:', error);
      toast.error('No se pudo cerrar el periodo.');
    } finally {
      setSaving(false);
    }
  };

  const crearBodega = async (): Promise<void> => {
    if (!bodegaForm.nombre.trim()) {
      toast.error('El nombre de la bodega es obligatorio.');
      return;
    }

    try {
      setSaving(true);
      const created = await inventarioService.crearBodega(bodegaForm);
      setBodegas((prev) => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setBodegaForm({ nombre: '', descripcion: '' });
      toast.success('Bodega creada.');
    } catch (error) {
      console.error('Error creando bodega:', error);
      toast.error('No se pudo crear la bodega.');
    } finally {
      setSaving(false);
    }
  };

  const registrarMovimiento = async (): Promise<void> => {
    const cantidad = Number(movimientoForm.cantidad);
    const costoUnitario = Number(movimientoForm.costoUnitario || 0);
    if (!movimientoForm.sku.trim() || !movimientoForm.bodega.trim() || !cantidad || cantidad <= 0) {
      toast.error('SKU, bodega y cantidad mayor a 0 son obligatorios.');
      return;
    }
    if (movimientoForm.tipo === 'ENTRADA' && costoUnitario < 0) {
      toast.error('El costo unitario no puede ser negativo.');
      return;
    }
    if (!movimientoForm.documentoTipo.trim() || !movimientoForm.documentoNumero.trim()) {
      toast.error('El documento soporte es obligatorio.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        sku: movimientoForm.sku.trim(),
        bodega: movimientoForm.bodega.trim(),
        cantidad,
        costoUnitario,
        motivo: movimientoForm.motivo,
        documentoRelacionado: {
          tipo: movimientoForm.documentoTipo.trim(),
          numero: movimientoForm.documentoNumero.trim(),
        },
      };
      const movimiento = movimientoForm.tipo === 'ENTRADA'
        ? await inventarioService.registrarEntrada(payload)
        : await inventarioService.registrarSalida(payload);

      setKardex((prev) => [movimiento, ...prev].slice(0, 100));
      setMovimientoForm((prev) => ({ ...movimientoInicial, tipo: prev.tipo, bodega: prev.bodega }));
      const stock = await inventarioService.stockActual();
      setStockActual(stock);
      toast.success('Movimiento registrado en kardex.');
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      toast.error('No se pudo registrar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const solicitarAjuste = async (): Promise<void> => {
    if (!ajusteForm.sku.trim() || !ajusteForm.bodega.trim() || !ajusteForm.cantidad || ajusteForm.cantidad <= 0) {
      toast.error('SKU, bodega y cantidad son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      const created = await inventarioService.solicitarAjuste({
        ...ajusteForm,
        sku: ajusteForm.sku.trim(),
        bodega: ajusteForm.bodega.trim(),
        cantidad: Number(ajusteForm.cantidad),
        costoUnitarioReferencia: Number(ajusteForm.costoUnitarioReferencia || 0),
      });
      setAjustes((prev) => [created, ...prev]);
      setAjusteForm(ajusteInicial);
      toast.success('Ajuste solicitado.');
    } catch (error) {
      console.error('Error solicitando ajuste:', error);
      toast.error('No se pudo solicitar el ajuste.');
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstadoAjuste = async (ajuste: AjusteInventario, accion: 'aprobar' | 'rechazar'): Promise<void> => {
    try {
      setSaving(true);
      const updated = accion === 'aprobar'
        ? await inventarioService.aprobarAjuste(ajuste._id)
        : await inventarioService.rechazarAjuste(ajuste._id, 'Rechazado desde panel de inventario');
      setAjustes((prev) => prev.map((item) => item._id === ajuste._id ? updated : item));
      const stock = await inventarioService.stockActual();
      setStockActual(stock);
      toast.success(accion === 'aprobar' ? 'Ajuste aprobado.' : 'Ajuste rechazado.');
    } catch (error) {
      console.error('Error cambiando ajuste:', error);
      toast.error('No se pudo actualizar el ajuste.');
    } finally {
      setSaving(false);
    }
  };

  const renderBodegaSelect = (value: string, onChange: (value: string) => void): React.ReactElement => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecciona bodega" />
      </SelectTrigger>
      <SelectContent>
        {bodegaOptions.map((nombre) => (
          <SelectItem key={nombre} value={nombre}>{nombre}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">ERP Inventario</p>
          <h1 className="text-2xl font-bold tracking-normal text-foreground md:text-3xl">Inventario y kardex</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Gestiona stock, movimientos inmutables, bodegas, cierres contables y ajustes con documento soporte.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadData()} disabled={saving}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SKUs con saldo</CardDescription>
            <CardTitle className="text-2xl">{resumen.skus}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unidades disponibles</CardDescription>
            <CardTitle className="text-2xl">{resumen.unidades.toLocaleString('es-CO')}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor inventario</CardDescription>
            <CardTitle className="text-2xl">{MONEY.format(resumen.valorTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ajustes pendientes</CardDescription>
            <CardTitle className="text-2xl">{resumen.pendientes}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Alert variant="info">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Kardex inmutable</AlertTitle>
        <AlertDescription>
          Los movimientos no se editan ni se eliminan. Las correcciones deben registrarse con reversas o ajustes aprobados.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="justify-start">
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
          <TabsTrigger value="bodegas">Bodegas</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Consultar stock</CardTitle>
                <CardDescription>Busca saldo y kardex por SKU y bodega.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={stockFiltro.sku} onChange={(event) => setStockFiltro((prev) => ({ ...prev, sku: event.target.value }))} placeholder="CAM-BAS-M" />
                </div>
                <div className="space-y-2">
                  <Label>Bodega</Label>
                  {renderBodegaSelect(stockFiltro.bodega, (value) => setStockFiltro((prev) => ({ ...prev, bodega: value })))}
                </div>
                <Button className="w-full" onClick={() => void consultarStock()}>
                  <Search className="mr-2 h-4 w-4" />
                  Consultar
                </Button>
                {stockConsulta && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Disponible</p>
                    <p className="text-3xl font-bold">{Number(stockConsulta.cantidadDisponible || 0).toLocaleString('es-CO')}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Costo promedio</p>
                    <p className="font-semibold">{MONEY.format(Number(stockConsulta.costoPromedioUnitario || 0))}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Stock actual</CardTitle>
                <CardDescription>Saldos disponibles registrados por bodega.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Costo prom.</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockActual.slice(0, 20).map((item) => (
                        <TableRow key={`${item.sku}-${item.bodega}`}>
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell>{item.bodega}</TableCell>
                          <TableCell className="text-right">{Number(item.cantidadDisponible || 0).toLocaleString('es-CO')}</TableCell>
                          <TableCell className="text-right">{MONEY.format(Number(item.costoPromedioUnitario || 0))}</TableCell>
                          <TableCell className="text-right">{MONEY.format(Number(item.valorTotal ?? Number(item.cantidadDisponible || 0) * Number(item.costoPromedioUnitario || 0)))}</TableCell>
                        </TableRow>
                      ))}
                      {stockActual.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay saldos disponibles.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Kardex consultado</CardTitle>
              <CardDescription>Últimos movimientos del filtro seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kardex.map((mov) => (
                      <TableRow key={mov._id}>
                        <TableCell>{formatDate(mov.createdAt)}</TableCell>
                        <TableCell><Badge variant={mov.tipoMovimiento === 'SALIDA' ? 'secondary' : 'default'}>{mov.tipoMovimiento}</Badge></TableCell>
                        <TableCell>{mov.sku}</TableCell>
                        <TableCell>{mov.documentoRelacionado?.tipo} {mov.documentoRelacionado?.numero}</TableCell>
                        <TableCell className="text-right">{Number(mov.cantidad || 0).toLocaleString('es-CO')}</TableCell>
                        <TableCell className="text-right">{MONEY.format(Number(mov.costoTotal || 0))}</TableCell>
                        <TableCell className="max-w-[140px] truncate font-mono text-xs">{mov.hashIntegridad}</TableCell>
                      </TableRow>
                    ))}
                    {kardex.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Consulta un SKU para ver su kardex.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimientos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Registrar movimiento</CardTitle>
              <CardDescription>Entradas y salidas manuales con documento soporte obligatorio.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={movimientoForm.tipo} onValueChange={(value) => setMovimientoForm((prev) => ({ ...prev, tipo: value as 'ENTRADA' | 'SALIDA' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                    <SelectItem value="SALIDA">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={movimientoForm.sku} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, sku: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bodega</Label>
                {renderBodegaSelect(movimientoForm.bodega, (value) => setMovimientoForm((prev) => ({ ...prev, bodega: value })))}
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min="0" value={movimientoForm.cantidad} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, cantidad: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Costo unitario</Label>
                <Input type="number" min="0" value={movimientoForm.costoUnitario} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, costoUnitario: event.target.value }))} disabled={movimientoForm.tipo === 'SALIDA'} />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={movimientoForm.motivo} onValueChange={(value) => setMovimientoForm((prev) => ({ ...prev, motivo: value as MotivoMovimiento }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOTIVOS.map((motivo) => <SelectItem key={motivo} value={motivo}>{motivo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo documento</Label>
                <Input value={movimientoForm.documentoTipo} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, documentoTipo: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Número documento</Label>
                <Input value={movimientoForm.documentoNumero} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, documentoNumero: event.target.value }))} />
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <Button onClick={() => void registrarMovimiento()} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Registrar en kardex
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajustes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Solicitar ajuste</CardTitle>
              <CardDescription>Los ajustes quedan pendientes hasta aprobación.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={ajusteForm.sku} onChange={(event) => setAjusteForm((prev) => ({ ...prev, sku: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bodega</Label>
                {renderBodegaSelect(ajusteForm.bodega, (value) => setAjusteForm((prev) => ({ ...prev, bodega: value })))}
              </div>
              <div className="space-y-2">
                <Label>Tipo ajuste</Label>
                <Select value={ajusteForm.tipoAjuste} onValueChange={(value) => setAjusteForm((prev) => ({ ...prev, tipoAjuste: value as TipoAjuste }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POSITIVO">Positivo</SelectItem>
                    <SelectItem value="NEGATIVO">Negativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Causal</Label>
                <Select value={ajusteForm.causal} onValueChange={(value) => setAjusteForm((prev) => ({ ...prev, causal: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAUSALES_AJUSTE.map((causal) => <SelectItem key={causal} value={causal}>{causal}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min="1" value={ajusteForm.cantidad} onChange={(event) => setAjusteForm((prev) => ({ ...prev, cantidad: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Costo referencia</Label>
                <Input type="number" min="0" value={ajusteForm.costoUnitarioReferencia} onChange={(event) => setAjusteForm((prev) => ({ ...prev, costoUnitarioReferencia: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observación</Label>
                <Textarea value={ajusteForm.observacion} onChange={(event) => setAjusteForm((prev) => ({ ...prev, observacion: event.target.value }))} />
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <Button onClick={() => void solicitarAjuste()} disabled={saving}>
                  <Plus className="mr-2 h-4 w-4" />
                  Solicitar ajuste
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Ajustes registrados</CardTitle>
                  <CardDescription>Aprueba o rechaza ajustes pendientes.</CardDescription>
                </div>
                <Select value={ajusteFiltro || 'TODOS'} onValueChange={(value) => {
                  const next = value === 'TODOS' ? '' : value as EstadoAjuste;
                  setAjusteFiltro(next);
                  void refreshAjustes(next);
                }}>
                  <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="SOLICITADO">Solicitados</SelectItem>
                    <SelectItem value="APROBADO">Aprobados</SelectItem>
                    <SelectItem value="RECHAZADO">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Causal</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajustes.map((ajuste) => (
                      <TableRow key={ajuste._id}>
                        <TableCell className="font-medium">{ajuste.sku}</TableCell>
                        <TableCell>{ajuste.bodega}</TableCell>
                        <TableCell>{ajuste.tipoAjuste}</TableCell>
                        <TableCell>{ajuste.causal}</TableCell>
                        <TableCell className="text-right">{Number(ajuste.cantidad || 0).toLocaleString('es-CO')}</TableCell>
                        <TableCell><Badge variant={estadoBadge(ajuste.estado)}>{ajuste.estado}</Badge></TableCell>
                        <TableCell className="text-right">
                          {ajuste.estado === 'SOLICITADO' ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => void cambiarEstadoAjuste(ajuste, 'rechazar')} disabled={saving}>Rechazar</Button>
                              <Button size="sm" onClick={() => void cambiarEstadoAjuste(ajuste, 'aprobar')} disabled={saving}>Aprobar</Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Procesado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {ajustes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay ajustes para mostrar.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bodegas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5" /> Crear bodega</CardTitle>
              <CardDescription>Las bodegas se usan como dimensión obligatoria del stock.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={bodegaForm.nombre} onChange={(event) => setBodegaForm((prev) => ({ ...prev, nombre: event.target.value }))} placeholder="BODEGA-PRINCIPAL" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={bodegaForm.descripcion} onChange={(event) => setBodegaForm((prev) => ({ ...prev, descripcion: event.target.value }))} />
              </div>
              <Button onClick={() => void crearBodega()} disabled={saving}>
                <Plus className="mr-2 h-4 w-4" />
                Crear
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bodegas.map((bodega) => (
              <Card key={bodega._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{bodega.nombre}</CardTitle>
                      <CardDescription>{bodega.descripcion || 'Sin descripción'}</CardDescription>
                    </div>
                    <Badge variant={bodega.estado ? 'default' : 'outline'}>{bodega.estado ? 'Activa' : 'Inactiva'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Ubicaciones: {bodega.ubicaciones?.length ?? 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Configuración contable</CardTitle>
              <CardDescription>Método de valuación y periodos cerrados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Método de valuación</Label>
                  <Select value={config?.metodoValuacion || 'PROMEDIO'} onValueChange={(value) => void actualizarMetodo(value as MetodoValuacion)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROMEDIO">Promedio ponderado</SelectItem>
                      <SelectItem value="FIFO">PEPS / FIFO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Periodo a cerrar</Label>
                  <Input value={periodo} onChange={(event) => setPeriodo(event.target.value)} placeholder="2026-04" />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => void cerrarPeriodo()} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    Cerrar periodo
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Periodos cerrados</p>
                <div className="flex flex-wrap gap-2">
                  {(config?.periodosCerrados || []).length > 0 ? (
                    config?.periodosCerrados.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay periodos cerrados.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
