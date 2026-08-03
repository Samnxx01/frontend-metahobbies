import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Settings2 } from 'lucide-react';
import inventarioService, {
  type AjusteInventario,
  type AjustePayload,
  type BodegaInventario,
  type EstadoAjuste,
  type TipoAjuste,
  getAjusteInventarioId,
} from '@/app/services/inventarioService';
import InventarioComprobanteEntradaSelect, { type ComprobanteEntradaSeleccion } from './InventarioComprobanteEntradaSelect';
import InventarioCausalAjusteModal from './InventarioCausalAjusteModal';
import InventarioCausalAjusteSelect from './InventarioCausalAjusteSelect';
import InventarioTipoAjusteModal from './InventarioTipoAjusteModal';
import InventarioTipoAjusteSelect from './InventarioTipoAjusteSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const CODIGO_CONTEO_ENTRADA = 'ERROR_CONTEO_ENTRADA';
const CAUSAL_TRASLADO = 'TRASLADO';

const esTipoAjusteNegativo = (codigo?: string, direccion?: TipoAjuste | null): boolean => {
  if (direccion === 'NEGATIVO') return true;
  const norm = String(codigo || '').trim().toUpperCase();
  return ['AJUSTE_NEGATIVO', 'MERMA', 'DANO', 'ERROR_CONTEO_SALIDA'].includes(norm)
    || norm.includes('NEGATIVO')
    || norm.includes('SALIDA');
};

type InventarioAjustesTabProps = {
  ajusteForm: AjustePayload;
  setAjusteForm: React.Dispatch<React.SetStateAction<AjustePayload>>;
  ajusteFiltro: EstadoAjuste | '';
  setAjusteFiltro: React.Dispatch<React.SetStateAction<EstadoAjuste | ''>>;
  ajustes: AjusteInventario[];
  bodegas?: BodegaInventario[];
  saving: boolean;
  solicitarAjuste: () => Promise<void>;
  refreshAjustes: (estado?: EstadoAjuste | '') => Promise<void>;
  cambiarEstadoAjuste: (ajuste: AjusteInventario, accion: 'aprobar' | 'rechazar') => Promise<void>;
  estadoBadge: (estado: string) => 'default' | 'secondary' | 'destructive' | 'outline';
};

const etiquetaEstadoAjuste = (estado: string): string => {
  if (estado === 'SOLICITADO') return 'En espera';
  return estado;
};

export default function InventarioAjustesTab({
  ajusteForm,
  setAjusteForm,
  ajusteFiltro,
  setAjusteFiltro,
  ajustes,
  bodegas = [],
  saving,
  solicitarAjuste,
  refreshAjustes,
  cambiarEstadoAjuste,
  estadoBadge,
}: InventarioAjustesTabProps): React.ReactElement {
  const [tipoAjusteModalOpen, setTipoAjusteModalOpen] = useState(false);
  const [causalAjusteModalOpen, setCausalAjusteModalOpen] = useState(false);
  const [tiposAjusteRefreshKey, setTiposAjusteRefreshKey] = useState(0);
  const [causalesAjusteRefreshKey, setCausalesAjusteRefreshKey] = useState(0);
  const [tipoAjusteDireccion, setTipoAjusteDireccion] = useState<TipoAjuste | null>(null);

  useEffect(() => {
    let cancelled = false;
    void inventarioService.listarTiposAjusteAdmin().then((tipos) => {
      if (cancelled) return;
      const tipo = tipos.find((item) => item.codigo === ajusteForm.tipoAjusteCodigo);
      if (tipo?.direccion) {
        setTipoAjusteDireccion(tipo.direccion);
        return;
      }
      setTipoAjusteDireccion(null);
      if (ajusteForm.tipoAjusteCodigo) {
        setAjusteForm((prev) => prev.tipoAjusteCodigo === ajusteForm.tipoAjusteCodigo
          ? { ...prev, tipoAjusteCodigo: '' }
          : prev);
      }
    }).catch((error) => {
      console.error('Error resolviendo el tipo de ajuste seleccionado:', error);
    });
    return () => {
      cancelled = true;
    };
  }, [ajusteForm.tipoAjusteCodigo, tiposAjusteRefreshKey, setAjusteForm]);

  const esNegativo = esTipoAjusteNegativo(ajusteForm.tipoAjusteCodigo, tipoAjusteDireccion);
  const esConteoEntrada = String(ajusteForm.tipoAjusteCodigo || '').trim().toUpperCase() === CODIGO_CONTEO_ENTRADA;
  const esTraslado = esNegativo
    || String(ajusteForm.causal || '').trim().toUpperCase() === CAUSAL_TRASLADO;

  useEffect(() => {
    if (!esNegativo) return;
    setAjusteForm((prev) => {
      if (String(prev.causal || '').trim().toUpperCase() === CAUSAL_TRASLADO) return prev;
      return { ...prev, causal: CAUSAL_TRASLADO };
    });
  }, [esNegativo, setAjusteForm]);

  const bodegasActivas = useMemo(
    () => bodegas.filter((bodega) => bodega.estado !== false),
    [bodegas],
  );

  const bodegasDestino = useMemo(
    () => bodegasActivas.filter((bodega) => String(bodega.nombre || '').trim() !== String(ajusteForm.bodega || '').trim()),
    [bodegasActivas, ajusteForm.bodega],
  );

  const handleComprobanteSelect = (seleccion: ComprobanteEntradaSeleccion | null): void => {
    if (!seleccion) {
      setAjusteForm((prev) => ({
        ...prev,
        recepcionCompraId: '',
        sku: '',
        bodega: '',
        bodegaDestino: '',
        costoUnitarioReferencia: 0,
      }));
      return;
    }
    setAjusteForm((prev) => ({
      ...prev,
      recepcionCompraId: seleccion.recepcionId,
      sku: seleccion.sku,
      bodega: seleccion.bodega,
      bodegaDestino: prev.bodegaDestino === seleccion.bodega ? '' : prev.bodegaDestino,
      costoUnitarioReferencia: seleccion.costoUnitario,
    }));
  };

  const handleTipoChange = (codigo: string, direccion?: TipoAjuste): void => {
    const dir = direccion || null;
    setTipoAjusteDireccion(dir);
    const negativo = esTipoAjusteNegativo(codigo, dir);
    setAjusteForm((prev) => ({
      ...prev,
      tipoAjusteCodigo: codigo,
      recepcionCompraId: '',
      sku: '',
      bodega: '',
      costoUnitarioReferencia: 0,
      causal: negativo ? CAUSAL_TRASLADO : prev.causal,
      bodegaDestino: negativo ? prev.bodegaDestino : '',
    }));
  };

  const handleCausalChange = (codigo: string): void => {
    const traslado = String(codigo || '').trim().toUpperCase() === CAUSAL_TRASLADO;
    setAjusteForm((prev) => ({
      ...prev,
      causal: codigo,
      bodegaDestino: traslado ? prev.bodegaDestino : '',
    }));
  };

  return (
    <div className="space-y-4">
      <InventarioTipoAjusteModal
        open={tipoAjusteModalOpen}
        onOpenChange={setTipoAjusteModalOpen}
        saving={saving}
        onTiposActualizados={() => setTiposAjusteRefreshKey((prev) => prev + 1)}
      />
      <InventarioCausalAjusteModal
        open={causalAjusteModalOpen}
        onOpenChange={setCausalAjusteModalOpen}
        saving={saving}
        onCausalesActualizadas={() => setCausalesAjusteRefreshKey((prev) => prev + 1)}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Solicitar ajuste</CardTitle>
              <CardDescription>
                Vincula un comprobante de entrada aprobado. Los ajustes negativos se registran como traslado entre bodegas.
                La solicitud queda en espera hasta aprobación.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setCausalAjusteModalOpen(true)} disabled={saving}>
                <Settings2 className="mr-2 h-4 w-4" />
                Causales
              </Button>
              <Button type="button" variant="outline" onClick={() => setTipoAjusteModalOpen(true)} disabled={saving}>
                <Settings2 className="mr-2 h-4 w-4" />
                Tipos de ajuste
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InventarioTipoAjusteSelect
            value={ajusteForm.tipoAjusteCodigo}
            onChange={handleTipoChange}
            disabled={saving}
            refreshKey={tiposAjusteRefreshKey}
          />

          <InventarioComprobanteEntradaSelect
            recepcionCompraId={ajusteForm.recepcionCompraId || ''}
            sku={ajusteForm.sku}
            bodega={ajusteForm.bodega}
            onSelect={handleComprobanteSelect}
            disabled={saving}
            ocultarCampoBodega={esTraslado}
            tipoAjusteDireccion={tipoAjusteDireccion}
          />

          {esTraslado ? (
            <div className="space-y-2">
              <Label>Causal</Label>
              <Input value="Traslado entre bodegas" disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Los ajustes de salida mueven stock entre bodegas. La causal TRASLADO se aplica automáticamente.
              </p>
            </div>
          ) : (
            <InventarioCausalAjusteSelect
              value={ajusteForm.causal}
              onChange={handleCausalChange}
              disabled={saving}
              refreshKey={causalesAjusteRefreshKey}
            />
          )}

          {esTraslado ? (
            <>
              <div className="space-y-2">
                <Label>Bodega origen</Label>
                <Input value={ajusteForm.bodega || '—'} readOnly className="bg-muted" />
                <p className="text-xs text-muted-foreground">Tomada del comprobante y SKU seleccionados.</p>
              </div>
              <div className="space-y-2">
                <Label>Bodega destino (traslado)</Label>
                <Select
                  value={ajusteForm.bodegaDestino || undefined}
                  onValueChange={(value) => setAjusteForm((prev) => ({ ...prev, bodegaDestino: value }))}
                  disabled={saving || !ajusteForm.bodega.trim() || bodegasDestino.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !ajusteForm.bodega.trim()
                          ? 'Primero seleccione comprobante y SKU'
                          : bodegasDestino.length === 0
                            ? 'No hay otras bodegas activas'
                            : 'Selecciona bodega destino'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {bodegasDestino.map((bodegaItem) => (
                      <SelectItem
                        key={String(bodegaItem._id || bodegaItem.iud || bodegaItem.nombre)}
                        value={bodegaItem.nombre}
                      >
                        {bodegaItem.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Elija a qué bodega se traslada el stock del ajuste negativo.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Bodega</Label>
              <Input value={ajusteForm.bodega || '—'} readOnly className="bg-muted" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input type="number" min="1" value={ajusteForm.cantidad} onChange={(event) => setAjusteForm((prev) => ({ ...prev, cantidad: Number(event.target.value) }))} />
          </div>

          {!esTraslado ? (
            <div className="space-y-2">
              <Label>Costo referencia</Label>
              <Input type="number" min="0" value={ajusteForm.costoUnitarioReferencia} onChange={(event) => setAjusteForm((prev) => ({ ...prev, costoUnitarioReferencia: Number(event.target.value) }))} />
            </div>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <Label>Observacion</Label>
            <Textarea value={ajusteForm.observacion} onChange={(event) => setAjusteForm((prev) => ({ ...prev, observacion: event.target.value }))} />
          </div>

          {esConteoEntrada ? (
            <div className="rounded-md border border-primary/25 bg-muted/40 p-3 text-xs md:col-span-2 xl:col-span-4">
              <p className="font-medium text-foreground">Corrección conteo (entrada)</p>
              <p className="mt-1 text-muted-foreground">
                Al aprobar, solo actualiza cantidades en el comprobante de entrada y la orden de compra.
                El comprobante volverá a aparecer en Movimientos para registrar el kardex pendiente.
              </p>
            </div>
          ) : null}

          <div className="md:col-span-2 xl:col-span-4">
            <Button onClick={() => void solicitarAjuste()} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              Enviar solicitud
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Ajustes registrados</CardTitle>
              <CardDescription>Aprueba o rechaza solicitudes en espera.</CardDescription>
            </div>
            <Select value={ajusteFiltro || 'TODOS'} onValueChange={(value) => {
              const next = value === 'TODOS' ? '' : value as EstadoAjuste;
              setAjusteFiltro(next);
              void refreshAjustes(next);
            }}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="SOLICITADO">En espera</SelectItem>
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
                  <TableHead>Bodega origen</TableHead>
                  <TableHead>Bodega destino</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Causal</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ajustes.map((ajuste) => (
                  <TableRow key={getAjusteInventarioId(ajuste) || `${ajuste.sku}-${ajuste.bodega}-${ajuste.createdAt}`}>
                    <TableCell className="font-medium">{ajuste.sku}</TableCell>
                    <TableCell>{ajuste.bodega}</TableCell>
                    <TableCell>{ajuste.bodegaDestino || '—'}</TableCell>
                    <TableCell>{ajuste.tipoAjusteCodigo || ajuste.tipoAjuste}</TableCell>
                    <TableCell>{ajuste.causal}</TableCell>
                    <TableCell className="text-right">{Number(ajuste.cantidad || 0).toLocaleString('es-CO')}</TableCell>
                    <TableCell><Badge variant={estadoBadge(ajuste.estado)}>{etiquetaEstadoAjuste(ajuste.estado)}</Badge></TableCell>
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
                {ajustes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No hay ajustes para mostrar.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
