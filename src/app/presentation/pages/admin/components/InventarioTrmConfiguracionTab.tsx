import React from 'react';
import { toast } from 'react-toastify';
import { CalendarDays, DollarSign, Eye, RefreshCcw, Save, Settings } from 'lucide-react';
import type { ConversionMonedaConfig, InventarioConfig, MonedaInventarioConfig } from '@/app/services/inventarioService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TRM_API_URL = 'https://co.dolarapi.com/v1/trm';
const USD_COTIZACION_API_URL = 'https://co.dolarapi.com/v1/cotizaciones/usd';
const MONEDAS = ['COP', 'USD', 'EUR'] as const;

type TrmHistorico = {
  fecha: string;
  valor: string;
  fuente: string;
  estado: 'ACTIVA' | 'HISTORICA';
};

type DolarApiTrmResponse = {
  unidad?: string;
  nombre?: string;
  valor?: number;
  fechaActualizacion?: string;
};

type DolarApiUsdCotizacionResponse = {
  moneda?: string;
  nombre?: string;
  compra?: number;
  venta?: number;
  ultimoCierre?: number;
  fechaActualizacion?: string;
};

type MonedaInventarioDraft = {
  monedaBase: string;
  monedaCompra: string;
  simbolo: string;
  decimales: string;
  formato: string;
  convertirPorTrm: boolean;
  conversionesMoneda: ConversionMonedaDraft[];
};

type ConversionMonedaDraft = {
  id: string;
  monedaOrigen: string;
  monedaDestino: string;
  tasa: string;
  fuente: string;
  fechaVigencia: string;
  activo: boolean;
};

type InventarioTrmConfiguracionTabProps = {
  config: InventarioConfig | null;
  saving: boolean;
  onGuardarMonedaInventario: (payload: MonedaInventarioConfig) => Promise<void>;
};

const HISTORICO_TRM: TrmHistorico[] = [
  { fecha: '2026-05-10', valor: '4.000,00', fuente: 'Manual', estado: 'ACTIVA' },
  { fecha: '2026-05-09', valor: '3.995,50', fuente: 'Manual', estado: 'HISTORICA' },
];

const monedaDefault: MonedaInventarioDraft = {
  monedaBase: 'COP',
  monedaCompra: 'USD',
  simbolo: '$',
  decimales: '2',
  formato: 'es-CO',
  convertirPorTrm: true,
  conversionesMoneda: [],
};

const toConversionDraft = (item: ConversionMonedaConfig): ConversionMonedaDraft => ({
  id: item.id,
  monedaOrigen: item.monedaOrigen,
  monedaDestino: item.monedaDestino,
  tasa: String(item.tasa ?? ''),
  fuente: item.fuente || 'MANUAL',
  fechaVigencia: item.fechaVigencia || '',
  activo: item.activo !== false,
});

const toMonedaDraft = (config?: MonedaInventarioConfig | null): MonedaInventarioDraft => ({
  monedaBase: config?.monedaBase || monedaDefault.monedaBase,
  monedaCompra: config?.monedaCompra || monedaDefault.monedaCompra,
  simbolo: config?.simbolo || monedaDefault.simbolo,
  decimales: String(config?.decimales ?? monedaDefault.decimales),
  formato: config?.formato || monedaDefault.formato,
  convertirPorTrm: config?.convertirPorTrm ?? monedaDefault.convertirPorTrm,
  conversionesMoneda: (config?.conversionesMoneda || []).map(toConversionDraft),
});

const conversionLabel = (item: ConversionMonedaDraft): string =>
  `${item.monedaOrigen} -> ${item.monedaDestino}`;

const resolverFuenteApi = (fuenteSeleccionada: string): { url: string; label: string } => {
  if (fuenteSeleccionada === 'DOLAR_API_COTIZACION_USD') {
    return { url: USD_COTIZACION_API_URL, label: 'DolarApi Cotizacion USD' };
  }
  return { url: TRM_API_URL, label: 'DolarApi TRM' };
};

const resolverValorApi = (fuenteSeleccionada: string, data: DolarApiTrmResponse | DolarApiUsdCotizacionResponse): number => {
  if (fuenteSeleccionada === 'DOLAR_API_COTIZACION_USD') {
    const cotizacion = data as DolarApiUsdCotizacionResponse;
    return Number(cotizacion.venta ?? cotizacion.ultimoCierre ?? cotizacion.compra);
  }
  return Number((data as DolarApiTrmResponse).valor);
};

export default function InventarioTrmConfiguracionTab({
  config,
  saving,
  onGuardarMonedaInventario,
}: InventarioTrmConfiguracionTabProps): React.ReactElement {
  const [valorTrm, setValorTrm] = React.useState('4000');
  const [fechaVigencia, setFechaVigencia] = React.useState('2026-05-10');
  const [fuente, setFuente] = React.useState('MANUAL');
  const [sincronizacionActiva, setSincronizacionActiva] = React.useState(false);
  const [sincronizando, setSincronizando] = React.useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = React.useState<string | null>(null);
  const [monedaModalOpen, setMonedaModalOpen] = React.useState(false);
  const [visualizadorOpen, setVisualizadorOpen] = React.useState(false);
  const monedaConfig = React.useMemo(() => toMonedaDraft(config?.monedaInventario), [config?.monedaInventario]);
  const [monedaDraft, setMonedaDraft] = React.useState<MonedaInventarioDraft>(monedaConfig);

  React.useEffect(() => {
    setMonedaDraft(monedaConfig);
  }, [monedaConfig]);

  const abrirModalMoneda = (): void => {
    setMonedaDraft(monedaConfig);
    setVisualizadorOpen(false);
    setMonedaModalOpen(true);
  };

  const patchMonedaDraft = (partial: Partial<MonedaInventarioDraft>): void => {
    setMonedaDraft((prev) => ({ ...prev, ...partial }));
  };

  const guardarMonedaInventario = async (): Promise<void> => {
    const decimales = Number(monedaDraft.decimales);
    if (!monedaDraft.monedaBase || !monedaDraft.monedaCompra) {
      toast.error('Selecciona moneda base y moneda de compra.');
      return;
    }
    if (!Number.isInteger(decimales) || decimales < 0 || decimales > 6) {
      toast.error('Los decimales deben estar entre 0 y 6.');
      return;
    }

    await onGuardarMonedaInventario({
      monedaBase: monedaDraft.monedaBase,
      monedaCompra: monedaDraft.monedaCompra,
      simbolo: monedaDraft.simbolo,
      decimales,
      formato: monedaDraft.formato,
      convertirPorTrm: monedaDraft.convertirPorTrm,
      conversionesMoneda: monedaDraft.conversionesMoneda.map((item) => ({
        id: item.id,
        monedaOrigen: item.monedaOrigen,
        monedaDestino: item.monedaDestino,
        tasa: Number(String(item.tasa).replace(',', '.')),
        fuente: item.fuente,
        fechaVigencia: item.fechaVigencia || null,
        activo: item.activo,
      })),
    });
    setMonedaModalOpen(false);
  };

  const sincronizarTrm = async (): Promise<void> => {
    setSincronizando(true);
    try {
      const fuenteApi = resolverFuenteApi(fuente);
      const response = await fetch(fuenteApi.url);
      if (!response.ok) {
        throw new Error(`No se pudo consultar ${fuenteApi.label}`);
      }

      const data = (await response.json()) as DolarApiTrmResponse | DolarApiUsdCotizacionResponse;
      const valor = resolverValorApi(fuente, data);
      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error(`La respuesta de ${fuenteApi.label} no trae un valor valido`);
      }

      const fecha = data.fechaActualizacion ? new Date(data.fechaActualizacion) : new Date();
      setValorTrm(String(valor));
      setFechaVigencia(fecha.toISOString().slice(0, 10));
      setFuente(fuente);
      setUltimaActualizacion(data.fechaActualizacion || fecha.toISOString());
      toast.success(`${fuenteApi.label} sincronizada correctamente.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo sincronizar la TRM');
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Configuracion de TRM
              </CardTitle>
              <CardDescription>
                Parametros de tasa representativa del mercado para costos, compras e inventario.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={abrirModalMoneda} disabled={saving}>
              <Settings className="mr-2 h-4 w-4" />
              Moneda
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Moneda base</Label>
              <Select value={monedaConfig.monedaBase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONEDAS.map((moneda) => <SelectItem key={moneda} value={moneda}>{moneda}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Moneda origen</Label>
              <Select value={monedaConfig.monedaCompra}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONEDAS.map((moneda) => <SelectItem key={moneda} value={moneda}>{moneda}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>TRM vigente</Label>
            <Input
              inputMode="decimal"
              value={valorTrm}
              onChange={(event) => setValorTrm(event.target.value)}
              placeholder="4000.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha de vigencia</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                type="date"
                value={fechaVigencia}
                onChange={(event) => setFechaVigencia(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fuente</Label>
            <Select value={fuente} onValueChange={setFuente}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="DOLAR_API">DolarApi TRM</SelectItem>
                <SelectItem value="DOLAR_API_COTIZACION_USD">DolarApi Cotizacion USD</SelectItem>
                <SelectItem value="BANCO_REPUBLICA">Banco de la Republica</SelectItem>
                <SelectItem value="DIAN">DIAN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
            <div>
              <p className="text-sm font-medium">Sincronizacion automatica</p>
              <p className="text-xs text-muted-foreground">Actualiza la TRM diaria desde la fuente configurada.</p>
            </div>
            <Switch checked={sincronizacionActiva} onCheckedChange={setSincronizacionActiva} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" type="button" disabled={sincronizando} onClick={() => void sincronizarTrm()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {sincronizando ? 'Sincronizando' : 'Sincronizar'}
            </Button>
            <Button type="button">
              <Save className="mr-2 h-4 w-4" />
              Guardar TRM
            </Button>
          </div>

          {ultimaActualizacion ? (
            <p className="text-xs text-muted-foreground">
              Ultima actualizacion API: {new Date(ultimaActualizacion).toLocaleString('es-CO')}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Historial TRM</CardTitle>
              <CardDescription>Ultimos valores configurados para conversion de costos.</CardDescription>
            </div>
            <Badge variant={sincronizacionActiva ? 'default' : 'secondary'}>
              {sincronizacionActiva ? 'Auto' : 'Manual'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>TRM</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {HISTORICO_TRM.map((item) => (
                <TableRow key={`${item.fecha}-${item.valor}`}>
                  <TableCell>{item.fecha}</TableCell>
                  <TableCell>$ {item.valor}</TableCell>
                  <TableCell>{item.fuente}</TableCell>
                  <TableCell>
                    <Badge variant={item.estado === 'ACTIVA' ? 'default' : 'secondary'}>{item.estado}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={monedaModalOpen} onOpenChange={setMonedaModalOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Parametrizar moneda de inventario
            </DialogTitle>
            <DialogDescription>
              Define la moneda operativa y registra conversiones monetarias para compras, costos e inventario.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Moneda base inventario *</Label>
              <Select value={monedaDraft.monedaBase} onValueChange={(value) => patchMonedaDraft({ monedaBase: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP - Peso colombiano</SelectItem>
                  <SelectItem value="USD">USD - Dolar estadounidense</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Moneda de compra por defecto *</Label>
              <Select value={monedaDraft.monedaCompra} onValueChange={(value) => patchMonedaDraft({ monedaCompra: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP - Peso colombiano</SelectItem>
                  <SelectItem value="USD">USD - Dolar estadounidense</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Simbolo</Label>
              <Input value={monedaDraft.simbolo} onChange={(event) => patchMonedaDraft({ simbolo: event.target.value })} placeholder="$" />
            </div>

            <div className="space-y-2">
              <Label>Decimales</Label>
              <Input inputMode="numeric" value={monedaDraft.decimales} onChange={(event) => patchMonedaDraft({ decimales: event.target.value })} placeholder="2" />
            </div>

            <div className="space-y-2">
              <Label>Formato regional</Label>
              <Select value={monedaDraft.formato} onValueChange={(value) => patchMonedaDraft({ formato: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="es-CO">es-CO</SelectItem>
                  <SelectItem value="en-US">en-US</SelectItem>
                  <SelectItem value="es-ES">es-ES</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
              <div>
                <p className="text-sm font-medium">Convertir costos con TRM</p>
                <p className="text-xs text-muted-foreground">Aplica cuando la moneda de compra difiere de la base.</p>
              </div>
              <Switch checked={monedaDraft.convertirPorTrm} onCheckedChange={(checked) => patchMonedaDraft({ convertirPorTrm: checked })} />
            </div>
          </div>

          <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setVisualizadorOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Visualizar conversiones
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setMonedaModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void guardarMonedaInventario()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando' : 'Guardar moneda'}
              </Button>
            </div>
          </DialogFooter>

          <Dialog open={visualizadorOpen} onOpenChange={setVisualizadorOpen}>
            <DialogContent className="max-w-3xl border-border bg-background text-foreground">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visualizador de conversiones
                </DialogTitle>
                <DialogDescription>
                  Registros asociados a la configuracion de moneda de inventario.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                  <p className="text-sm font-medium">Conversiones parametrizadas</p>
                  <Badge variant="secondary">{monedaDraft.conversionesMoneda.length} registros</Badge>
                </div>
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conversion</TableHead>
                        <TableHead>Tasa</TableHead>
                        <TableHead>Fuente</TableHead>
                        <TableHead>Vigencia</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monedaDraft.conversionesMoneda.length ? (
                        monedaDraft.conversionesMoneda.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{conversionLabel(item)}</TableCell>
                            <TableCell>{item.tasa}</TableCell>
                            <TableCell>{item.fuente}</TableCell>
                            <TableCell>{item.fechaVigencia || 'Sin fecha'}</TableCell>
                            <TableCell>
                              <Badge variant={item.activo ? 'default' : 'secondary'}>
                                {item.activo ? 'Activa' : 'Inactiva'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                            No hay conversiones parametrizadas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVisualizadorOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    </div>
  );
}
