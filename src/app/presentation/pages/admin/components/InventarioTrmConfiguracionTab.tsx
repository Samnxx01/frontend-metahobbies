import React from 'react';
import { toast } from 'react-toastify';
import { axiosClient } from '@/app/services/api';
import { CalendarDays, DollarSign, RefreshCcw, Save, Settings } from 'lucide-react';
import inventarioService, {
  type InventarioConfig,
  type InventarioTrmHistorico,
  type MonedaCopOption,
  type MonedaInventarioConfig,
} from '@/app/services/inventarioService';
import {
  monedaCodigo,
  monedaId,
  monedaLabel,
  toMonedaDraft,
  type MonedaInventarioDraft,
} from '@/app/presentation/pages/admin/inventario/monedaInventarioDraft';
import InventarioMonedaInventarioModal from './InventarioMonedaInventarioModal';
import ReglasContablesParametrizacion from '../ParametrizacionContable/ReglasContablesParametrizacion';
import MetodosPagoParametrizacion from '../ParametrizacionPagos/MetodosPagoParametrizacion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TRM_API_URL = 'https://co.dolarapi.com/v1/trm';
const USD_COTIZACION_API_URL = 'https://co.dolarapi.com/v1/cotizaciones/usd';
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

type InventarioTrmConfiguracionTabProps = {
  config: InventarioConfig | null;
  saving: boolean;
  onGuardarMonedaInventario: (payload: MonedaInventarioConfig) => Promise<void>;
};

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

const todayInputValue = (): string => new Date().toISOString().slice(0, 10);

const formatTrmValue = (value: number): string =>
  Number(value || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function InventarioTrmConfiguracionTab({
  config,
  saving,
  onGuardarMonedaInventario,
}: InventarioTrmConfiguracionTabProps): React.ReactElement {
  const [valorTrm, setValorTrm] = React.useState('4000');
  const [fechaVigencia, setFechaVigencia] = React.useState(todayInputValue());
  const [fuente, setFuente] = React.useState('MANUAL');
  const [sincronizacionActiva, setSincronizacionActiva] = React.useState(false);
  const [sincronizando, setSincronizando] = React.useState(false);
  const [guardandoTrm, setGuardandoTrm] = React.useState(false);
  const [historialTrm, setHistorialTrm] = React.useState<InventarioTrmHistorico[]>([]);
  const [historialLoading, setHistorialLoading] = React.useState(false);
  const [monedasCop, setMonedasCop] = React.useState<MonedaCopOption[]>([]);
  const [monedasLoading, setMonedasLoading] = React.useState(false);
  const [sincronizandoMonedas, setSincronizandoMonedas] = React.useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = React.useState<string | null>(null);
  const [monedaModalOpen, setMonedaModalOpen] = React.useState(false);
  const monedaConfig = React.useMemo(() => toMonedaDraft(config?.monedaInventario), [config?.monedaInventario]);
  const [monedaDraft, setMonedaDraft] = React.useState<MonedaInventarioDraft>(monedaConfig);
  const monedaOptions = React.useMemo(() => {
    const byId = new Map<string, MonedaCopOption>();
    monedasCop
      .filter((moneda) => moneda.activosInventory === true)
      .forEach((moneda) => {
        const id = monedaId(moneda);
        if (id) byId.set(id, moneda);
      });
    return [...byId.values()].sort((a, b) => monedaCodigo(a).localeCompare(monedaCodigo(b)));
  }, [monedasCop]);
  const monedasPorId = React.useMemo(
    () => new Map(monedaOptions.map((moneda) => [monedaId(moneda), moneda])),
    [monedaOptions]
  );

  React.useEffect(() => {
    setMonedaDraft(monedaConfig);
  }, [monedaConfig]);

  const cargarMonedasCop = React.useCallback(async (): Promise<void> => {
    setMonedasLoading(true);
    try {
      const rows = await inventarioService.listarMonedasCop();
      setMonedasCop(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las monedas');
    } finally {
      setMonedasLoading(false);
    }
  }, []);

  const sincronizarMonedasInventory = React.useCallback(async (): Promise<void> => {
    setSincronizandoMonedas(true);
    try {
      const rows = await inventarioService.sincronizarMonedasInventory();
      setMonedasCop(rows);
      toast.success('Monedas sincronizadas con activosInventory en false por defecto.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron sincronizar las monedas');
    } finally {
      setSincronizandoMonedas(false);
    }
  }, []);

  const cargarHistorialTrm = React.useCallback(async (): Promise<void> => {
    setHistorialLoading(true);
    try {
      const rows = await inventarioService.listarTrmHistorico();
      setHistorialTrm(rows);
      const activa = rows.find((row) => row.estado === 'ACTIVA') || rows[0];
      if (activa) {
        setValorTrm(String(activa.valor));
        setFechaVigencia(activa.fechaVigencia || todayInputValue());
        setFuente(activa.fuente || 'MANUAL');
        setSincronizacionActiva(activa.sincronizacionAutomatica === true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el historial TRM');
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void cargarHistorialTrm();
  }, [cargarHistorialTrm]);

  React.useEffect(() => {
    void cargarMonedasCop();
  }, [cargarMonedasCop]);

  const abrirModalMoneda = (): void => {
    setMonedaDraft(monedaConfig);
    setMonedaModalOpen(true);
  };

  const patchMonedaDraft = (partial: Partial<MonedaInventarioDraft>): void => {
    setMonedaDraft((prev) => ({ ...prev, ...partial }));
  };

  const guardarMonedaInventario = async (): Promise<void> => {
    const decimales = Number(monedaDraft.decimales);
    const monedaBase = monedasPorId.get(monedaDraft.monedaBaseId);
    const monedaCompra = monedasPorId.get(monedaDraft.monedaCompraId);
    if (!monedaBase || !monedaCompra) {
      toast.error('Selecciona moneda base y moneda de compra.');
      return;
    }
    if (!Number.isInteger(decimales) || decimales < 0 || decimales > 6) {
      toast.error('Los decimales deben estar entre 0 y 6.');
      return;
    }

    await onGuardarMonedaInventario({
      monedaBase: monedaCodigo(monedaBase),
      monedaBaseId: monedaId(monedaBase),
      monedaCompra: monedaCodigo(monedaCompra),
      monedaCompraId: monedaId(monedaCompra),
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
      const response = await axiosClient.get(fuenteApi.url, { validateStatus: () => true });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`No se pudo consultar ${fuenteApi.label}`);
      }

      const data = response.data as DolarApiTrmResponse | DolarApiUsdCotizacionResponse;
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

  const guardarTrm = async (): Promise<void> => {
    const valor = Number(String(valorTrm).replace(',', '.'));
    const monedaBase = monedasPorId.get(monedaConfig.monedaBaseId);
    const monedaOrigen = monedasPorId.get(monedaConfig.monedaCompraId);
    const monedaBaseCodigo = monedaBase ? monedaCodigo(monedaBase) : String(config?.monedaInventario?.monedaBase || '').trim().toUpperCase();
    const monedaOrigenCodigo = monedaOrigen ? monedaCodigo(monedaOrigen) : String(config?.monedaInventario?.monedaCompra || '').trim().toUpperCase();

    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error('La TRM debe ser mayor a 0.');
      return;
    }
    if (!fechaVigencia) {
      toast.error('Selecciona la fecha de vigencia.');
      return;
    }
    if (!monedaBaseCodigo || !monedaOrigenCodigo) {
      toast.error('Configura moneda base y moneda origen antes de guardar la TRM.');
      return;
    }

    setGuardandoTrm(true);
    try {
      await inventarioService.guardarTrmHistorico({
        monedaBase: monedaBaseCodigo,
        monedaOrigen: monedaOrigenCodigo,
        valor,
        fechaVigencia,
        fuente,
        sincronizacionAutomatica: sincronizacionActiva,
      });
      toast.success('TRM guardada en el historial.');
      await cargarHistorialTrm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la TRM');
    } finally {
      setGuardandoTrm(false);
    }
  };

  return (
    <div className="space-y-6">
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
              <Select value={monedaConfig.monedaBaseId || ''}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monedaOptions.map((moneda) => (
                    <SelectItem key={monedaId(moneda)} value={monedaId(moneda)}>{monedaLabel(moneda)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Moneda origen</Label>
              <Select value={monedaConfig.monedaCompraId || ''}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monedaOptions.map((moneda) => (
                    <SelectItem key={monedaId(moneda)} value={monedaId(moneda)}>{monedaLabel(moneda)}</SelectItem>
                  ))}
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
            <Button variant="outline" type="button" disabled={sincronizando || guardandoTrm} onClick={() => void sincronizarTrm()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {sincronizando ? 'Sincronizando' : 'Sincronizar'}
            </Button>
            <Button type="button" disabled={guardandoTrm || sincronizando} onClick={() => void guardarTrm()}>
              <Save className="mr-2 h-4 w-4" />
              {guardandoTrm ? 'Guardando' : 'Guardar TRM'}
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
              {historialLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Cargando historial TRM...
                  </TableCell>
                </TableRow>
              ) : historialTrm.length ? (
                historialTrm.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.fechaVigencia}</TableCell>
                    <TableCell>$ {formatTrmValue(item.valor)}</TableCell>
                    <TableCell>{item.fuente}</TableCell>
                    <TableCell>
                      <Badge variant={item.estado === 'ACTIVA' ? 'default' : 'secondary'}>{item.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No hay TRM guardadas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InventarioMonedaInventarioModal
        open={monedaModalOpen}
        saving={saving}
        draft={monedaDraft}
        monedaOptions={monedaOptions}
        monedasLoading={monedasLoading}
        sincronizandoMonedas={sincronizandoMonedas}
        onOpenChange={setMonedaModalOpen}
        onDraftChange={setMonedaDraft}
        onSincronizarMonedas={sincronizarMonedasInventory}
        onSave={() => void guardarMonedaInventario()}
      />
    </div>

    <ReglasContablesParametrizacion saving={saving} />

    <MetodosPagoParametrizacion saving={saving} />
    </div>
  );
}
